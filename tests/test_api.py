import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.models import AnalysisResponse

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "FolLand"
    assert data["sensor_mode"] == "simulated"


def test_sensors_latest_live_simulated():
    response = client.get("/api/sensors/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["source"] == "metro328_simulated"
    assert data["data_mode"] == "simulated"
    assert data["fresh"] is True
    assert isinstance(data["air_temperature_c"], float)
    assert isinstance(data["air_relative_humidity_pct"], float)
    assert isinstance(data["ultrasonic_distance_cm"], float)


def test_sensors_latest_disconnected():
    response = client.get("/api/sensors/latest?disconnected=true")
    assert response.status_code == 200
    data = response.json()
    assert data["data_mode"] == "unavailable"
    assert data["fresh"] is False
    assert data["air_temperature_c"] is None
    assert data["status"] == "disconnected"


def test_weather_endpoint():
    response = client.get("/api/weather?latitude=42.88&longitude=-78.87")
    assert response.status_code == 200
    data = response.json()
    assert data["latitude"] == 42.88 and data["longitude"] == -78.87
    assert "42.8800, -78.8700" in data["location_name"]
    assert data["source"] in ["open-meteo", "mock_fallback"]


def test_analyze_endpoint_with_red_demo():
    form_data = {
        "crop": "tomato",
        "variety": "Early Girl",
        "harvest_goal": "eat_now",
        "soil_condition": "dry_at_5cm",
        "leaf_symptoms": "none",
        "demo_scenario": "red"
    }
    response = client.post("/api/analyze", data=form_data)
    assert response.status_code == 200
    data = response.json()

    # Validate schema via Pydantic model
    parsed = AnalysisResponse(**data)
    assert parsed.crop == "tomato"
    assert parsed.variety == "Early Girl"
    assert parsed.visual_observations.maturity_stage == "red"
    assert parsed.harvest.status == "likely_ready"
    assert parsed.watering.status == "check_and_likely_water"
    assert parsed.fertilizer.status == "insufficient_evidence"


def test_analyze_endpoint_with_image_upload():
    # Create dummy PNG image bytes
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    files = {"image": ("test_tomato.png", dummy_png, "image/png")}
    form_data = {
        "crop": "tomato",
        "harvest_goal": "store_transport",
        "soil_condition": "moist",
        "leaf_symptoms": "yellowing",
        "demo_scenario": "turning"
    }
    response = client.post("/api/analyze", data=form_data, files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["visual_observations"]["photo_uploaded"] is True
    assert data["visual_observations"]["filename"] == "test_tomato.png"
    assert data["harvest"]["status"] == "approaching_harvest"
    assert data["watering"]["status"] == "monitor_conditions"
    assert data["fertilizer"]["status"] == "investigate_stress"


def test_analyze_unsupported_file_format():
    files = {"image": ("malicious.exe", b"MZ\x90\x00", "application/x-msdownload")}
    form_data = {"crop": "tomato"}
    response = client.post("/api/analyze", data=form_data, files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]
