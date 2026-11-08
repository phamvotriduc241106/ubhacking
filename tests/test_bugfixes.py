"""Regression tests for bugs found in the audit. Each test failed before its fix."""
import asyncio
from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile

from backend.models import SensorReading, VisualObservation, WeatherSummary
from backend.services import weather_service
from backend.services.decision_engine import DecisionEngine
from backend.services.image_analysis import MAX_FILE_SIZE_BYTES, ImageAnalysisService
from backend.services.report_generator import generate
from backend.models import DetectorResult


def _weather():
    return WeatherSummary(location_name="Test", latitude=1.0, longitude=2.0, temperature_c=10.0, relative_humidity_pct=50.0)


def _visual():
    return VisualObservation(maturity_stage="red", stage_label="Red / Ripe", is_simulated=True)


def _evaluate(sensors, **kw):
    args = dict(crop="tomato", variety=None, harvest_goal="eat_now", soil_condition="moist", leaf_symptoms="none",
                visual=_visual(), sensors=sensors, weather=_weather())
    args.update(kw)
    return DecisionEngine.evaluate(**args)


def test_summary_keeps_zero_degree_and_zero_humidity_readings():
    # 0 °C (frost night) and 0 % are real measurements, not missing values.
    sensors = SensorReading(source="metro328", data_mode="live", air_temperature_c=0.0, air_relative_humidity_pct=0.0)
    summary = _evaluate(sensors)["scientific_summary"]
    assert "0.0°C" in summary
    assert "0.0% RH" in summary
    assert "N/A" not in summary


def test_summary_marks_missing_readings_as_unavailable():
    sensors = SensorReading(source="metro328", data_mode="unavailable", air_temperature_c=None, air_relative_humidity_pct=None)
    assert "N/A°C, N/A% RH" in _evaluate(sensors)["scientific_summary"]


def test_deterministic_report_does_not_print_none_for_missing_sensor(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    sensors = SensorReading(source="metro328", data_mode="unavailable", fresh=False,
                            air_temperature_c=None, air_relative_humidity_pct=None, status="unavailable")
    decisions = _evaluate(sensors)
    detector = DetectorResult(status="not_run", message="No real image inference was run.")
    report = asyncio.run(generate(_visual(), detector, None, sensors, _weather(), decisions, None))
    assert report.source == "deterministic"
    assert "None" not in report.text
    assert "unavailable" in report.text.lower()


def test_ai_detected_leaf_symptoms_are_not_labeled_user_reported():
    sensors = SensorReading(source="metro328_simulated", data_mode="simulated", air_temperature_c=24.0, air_relative_humidity_pct=60.0)
    card = _evaluate(sensors, leaf_symptoms="yellowing", leaf_symptoms_source="ai")["fertilizer"]
    foliage = next(e for e in card.evidence if "Foliage" in e.label)
    assert foliage.type == "PREDICTED"
    user = _evaluate(sensors, leaf_symptoms="yellowing")["fertilizer"]
    assert next(e for e in user.evidence if "Foliage" in e.label).type == "USER_REPORTED"


def test_missing_weather_code_is_not_reported_as_clear():
    assert "clear" not in weather_service.WeatherService._interpret_weather_code(None).lower()


class _FakeResponse:
    status_code = 200

    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


def _fake_client(payload, seen_params):
    class Client:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, params=None):
            seen_params.append(params)
            return _FakeResponse(payload)

    return Client


def test_weather_cache_is_bounded(monkeypatch):
    payload = {"current": {"temperature_2m": 20, "relative_humidity_2m": 50, "weather_code": 1}, "daily": {"precipitation_sum": [0] * 14}}
    monkeypatch.setattr(weather_service.httpx, "AsyncClient", _fake_client(payload, []))
    weather_service._cache.clear()

    async def many():
        for i in range(2000):
            await weather_service.WeatherService.get_weather(latitude=10.0, longitude=20.0, location_name=f"place-{i}")

    asyncio.run(many())
    assert len(weather_service._cache) <= weather_service._CACHE_MAX_ENTRIES


def test_seven_day_precipitation_is_past_week_not_forecast(monkeypatch):
    # With past_days=7, Open-Meteo returns 7 past days, then today and the forecast.
    past = [1.0] * 7
    future = [10.0] * 7
    payload = {"current": {"temperature_2m": 20, "relative_humidity_2m": 50, "weather_code": 1}, "daily": {"precipitation_sum": past + future}}
    seen = []
    monkeypatch.setattr(weather_service.httpx, "AsyncClient", _fake_client(payload, seen))
    weather_service._cache.clear()
    summary = asyncio.run(weather_service.WeatherService.get_weather(latitude=3.0, longitude=4.0))
    assert seen[0]["past_days"] == 7
    assert summary.precipitation_sum_7d_mm == 7.0


class _RecordingFile:
    """Stands in for an uploaded file and records how much the server asks to read."""

    def __init__(self, size):
        self._data = BytesIO(b"x" * size)
        self.requested = []

    def read(self, size=-1):
        self.requested.append(size)
        return self._data.read(size)


def test_demo_upload_read_is_bounded():
    raw = _RecordingFile(MAX_FILE_SIZE_BYTES + 5 * 1024 * 1024)
    upload = UploadFile(file=raw, filename="big.jpg", headers={"content-type": "image/jpeg"})
    with pytest.raises(HTTPException) as err:
        asyncio.run(ImageAnalysisService.process_upload(file=upload, demo_scenario="red"))
    assert err.value.status_code == 400
    # The server must never ask for the whole (unbounded) stream.
    assert -1 not in raw.requested and None not in raw.requested
    assert max(raw.requested) <= MAX_FILE_SIZE_BYTES + 1


def test_detector_reports_missing_weights_or_libraries_instead_of_failing(tmp_path, monkeypatch):
    from PIL import Image
    from backend.services import tomato_detector

    buf = BytesIO()
    Image.new("RGB", (64, 48), (200, 40, 30)).save(buf, format="JPEG")
    # Fresh clone: no weights downloaded.
    monkeypatch.setattr(tomato_detector, "MODEL_DIR", tmp_path)
    result = tomato_detector.infer_image(buf.getvalue())
    assert result["status"] == "unavailable"
    assert "download_models" in result["message"]
    assert (result["width"], result["height"]) == (64, 48)

    # Weights present but ML libraries not installed.
    for name in ("detector_yolo26s_best.pt", "ripeness_yolo26s-cls_best.pt", "rotten_check.npz"):
        (tmp_path / name).write_bytes(b"x")

    def missing():
        raise ImportError("No module named 'ultralytics'")

    monkeypatch.setattr(tomato_detector, "load_models", missing)
    result = tomato_detector.infer_image(buf.getvalue())
    assert result["status"] == "unavailable"
    assert "pip install" in result["message"]
