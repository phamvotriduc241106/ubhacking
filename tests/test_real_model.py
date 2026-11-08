"""Opt-in real model integration; never downloads data or contacts Gemini."""
import os
import zipfile
from pathlib import Path
from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.models import WeatherSummary

ROOT = Path(__file__).resolve().parents[1]
@pytest.mark.skipif(os.environ.get('FOLLAND_RUN_MODEL_TESTS') != '1', reason='Requires downloaded weights and publisher dataset')
def test_real_image_to_report(monkeypatch):
    monkeypatch.setattr('backend.app.observe', AsyncMock(return_value=(None, 'unavailable')))
    monkeypatch.setattr('backend.services.report_generator.write_report', AsyncMock(return_value=(None, 'unavailable')))
    monkeypatch.setattr('backend.app.WeatherService.get_weather', AsyncMock(return_value=WeatherSummary(is_fallback=True,source='mock_fallback')))
    with zipfile.ZipFile(ROOT/'datasets/tomato_ripeness_crops.zip') as z:
        name=next(n for n in z.namelist() if n.startswith('cls_tomato/test/ripe/') and n.endswith('.jpg'))
        response=TestClient(app).post('/api/analyze',files={'image':('fruit.jpg',z.read(name),'image/jpeg')})
    assert response.status_code == 200
    data=response.json()
    assert data['detector']['status'] == 'ok'
    assert len(data['detector']['detections']) >= 1
    assert data['report']['source'] == 'deterministic'
    assert data['harvest']['status'] == 'inspect_manually'
