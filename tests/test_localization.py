from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from backend.app import app
from backend.models import WeatherSummary

client = TestClient(app)

def test_locale_validation_and_safe_fallback(monkeypatch):
    monkeypatch.setattr('backend.app.WeatherService.get_weather', AsyncMock(return_value=WeatherSummary()))
    report = AsyncMock(return_value=(None, 'not_configured'))
    monkeypatch.setattr('backend.services.report_generator.write_report', report)
    r=client.post('/api/analyze',data={'demo_scenario':'red','locale':'fr'})
    assert r.status_code == 200
    data=r.json()
    assert data['report']['source']=='deterministic'
    assert data['report']['locale']=='fr' and data['report']['requested_locale']=='fr'
    assert data['report']['translation_method']=='machine_template'
    assert 'Overall Plant Assessment' in data['report']['original_text']
    assert report.call_args.args[1]=='fr'
    assert client.post('/api/analyze',data={'demo_scenario':'red','locale':'xx'}).status_code==422
    default=client.post('/api/analyze',data={'demo_scenario':'red'}).json()
    assert default['report']['locale']=='en' and default['report']['requested_locale']=='en'


def test_unknown_fallback_phrase_remains_labeled_english(monkeypatch):
    monkeypatch.setattr('backend.app.WeatherService.get_weather', AsyncMock(return_value=WeatherSummary()))
    monkeypatch.setattr('backend.services.report_generator.write_report', AsyncMock(return_value=(None, 'not_configured')))
    def unavailable(*args, **kwargs):
        raise ValueError('Unknown report phrase')
    monkeypatch.setattr('backend.services.report_generator.localize_fallback', unavailable)
    report = client.post('/api/analyze', data={'demo_scenario':'red', 'locale':'fr'}).json()['report']
    assert report['locale'] == 'en'
    assert report['requested_locale'] == 'fr'


def test_report_locale_does_not_change_decisions(monkeypatch):
    monkeypatch.setattr('backend.app.WeatherService.get_weather', AsyncMock(return_value=WeatherSummary()))
    monkeypatch.setattr('backend.services.report_generator.write_report', AsyncMock(return_value=(None, 'not_configured')))
    values=[]
    for locale in ('en','es','zh-CN','hi','pt-BR','fr','ar','tr','de','vi'):
        data=client.post('/api/analyze',data={'locale':locale,'demo_scenario':'red','soil_condition':'moist'}).json()
        values.append((data['harvest']['status'],data['watering']['status'],data['fertilizer']['status']))
    assert len(set(values))==1
