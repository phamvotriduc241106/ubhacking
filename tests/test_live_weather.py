import asyncio
from datetime import datetime, timezone, timedelta
from backend.services import weather_service
from backend.services.decision_engine import DecisionEngine
from backend.models import SensorReading, WeatherSummary


def test_weather_parses_latest_past_soil_and_precipitation(monkeypatch):
    now = datetime.now(timezone.utc)
    local = (now - timedelta(hours=3)).replace(minute=0, second=0, microsecond=0)
    times = [(local + timedelta(hours=i)).strftime('%Y-%m-%dT%H:%M') for i in range(-23, 2)]
    payload = {'timezone':'America/Recife','utc_offset_seconds':-10800,'current':{'time':local.isoformat(timespec='minutes'),'temperature_2m':32,'relative_humidity_2m':90,'precipitation':0,'wind_speed_10m':12},'hourly':{'time':times,'soil_temperature_0cm':[25]*24+[99], 'soil_moisture_0_to_1cm':[.2]*24+[.9], 'precipitation':[1]*25}}
    class Response:
        status_code = 200
        def json(self): return payload
    seen = []
    class Client:
        def __init__(self,*args,**kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def get(self,url,params): seen.append(params); return Response()
    monkeypatch.setattr(weather_service.httpx,'AsyncClient',Client)
    weather_service._cache.clear()
    data = asyncio.run(weather_service.WeatherService.get_weather())
    assert (data.latitude,data.longitude,data.timezone) == (-9.3891,-40.5031,'America/Recife')
    assert seen[0]['timezone'] == 'America/Recife'
    assert data.soil_temperature_c == 25 and data.soil_moisture_m3_m3 == .2
    assert data.rain_last_24h_mm == 24 and data.wind_speed_kmh == 12
    card = DecisionEngine._evaluate_watering('unknown',SensorReading(),data)
    assert 'modeled' in card.recommendation and 'humidity' in card.recommendation and '24.0 mm' in card.recommendation
    assert 'check' in card.next_action.lower()


def test_weather_failure_has_no_fabricated_values(monkeypatch):
    class Client:
        def __init__(self,*args,**kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self,*args): pass
        async def get(self,*args,**kwargs): raise OSError('offline')
    monkeypatch.setattr(weather_service.httpx,'AsyncClient',Client)
    weather_service._cache.clear()
    data = asyncio.run(weather_service.WeatherService.get_weather())
    assert data.source == 'unavailable' and data.temperature_c is None
    assert data.soil_moisture_m3_m3 is None and data.rain_last_24h_mm is None
    card = DecisionEngine._evaluate_watering('unknown',SensorReading(),data)
    assert any(e.type == 'NOT_MEASURED' and e.label == 'Weather unavailable' for e in card.evidence)
