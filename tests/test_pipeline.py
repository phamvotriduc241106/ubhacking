from io import BytesIO
from unittest.mock import AsyncMock
from PIL import Image
import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.models import GeminiObservation, WeatherSummary

client = TestClient(app)

def photo():
    out = BytesIO(); Image.new('RGB', (40,40), 'red').save(out, 'JPEG'); return out.getvalue()

def detection(label='ripe', confidence=.9, raw_label=None):
    return {'status':'ok','message':'uncalibrated model','width':40,'height':40,'counts':{label:1},'detections':[{'box':[0,0,30,30],'label':label,'raw_label':raw_label or label,'confidence':confidence,'detection_confidence':.9,'uncertain':confidence < .55}]}

@pytest.fixture(autouse=True)
def external_fallback(monkeypatch):
    monkeypatch.setattr('backend.app.observe', AsyncMock(return_value=(None, 'unavailable')))
    monkeypatch.setattr('backend.services.report_generator.write_report', AsyncMock(return_value=(None, 'unavailable')))
    monkeypatch.setattr('backend.app.WeatherService.get_weather', AsyncMock(return_value=WeatherSummary(is_fallback=True,source='mock_fallback')))

def post(**fields):
    return client.post('/api/analyze',data=fields,files={'image':('tomato.jpg',photo(),'image/jpeg')})


def test_webp_is_reencoded_as_jpeg_for_vision(monkeypatch):
    image = BytesIO()
    Image.new('RGB', (40, 40), 'red').save(image, 'WEBP')
    vision = AsyncMock(return_value=(None, 'timeout'))
    monkeypatch.setattr('backend.app.observe', vision)
    monkeypatch.setattr('backend.app.infer_image', lambda _: {'status': 'unavailable', 'message': 'missing', 'detections': [], 'counts': {}})
    response = client.post('/api/analyze', files={'image': ('tomato.webp', image.getvalue(), 'image/webp')})
    assert response.status_code == 200
    image_bytes, mime, _ = vision.await_args.args
    assert mime == 'image/jpeg' and Image.open(BytesIO(image_bytes)).format == 'JPEG'
    assert response.json()['data_sources']['gemini_vision'] == 'timeout'
    assert response.json()['report']['source'] == 'deterministic'


def test_report_still_runs_when_vision_times_out(monkeypatch):
    monkeypatch.setenv('GEMINI_MODEL', 'gemini-test-model')
    monkeypatch.setattr('backend.app.observe', AsyncMock(return_value=(None, 'timeout')))
    monkeypatch.setattr('backend.app.infer_image', lambda _: {'status': 'unavailable', 'message': 'missing', 'detections': [], 'counts': {}})
    monkeypatch.setattr('backend.services.report_generator.write_report', AsyncMock(return_value=('Report text', 'available')))
    data = post().json()
    assert data['data_sources']['gemini_vision'] == 'timeout'
    assert data['gemini_observation'] is None
    assert data['report']['source'] == 'gemini'
    assert data['report']['model'] == 'gemini-test-model'

@pytest.mark.parametrize('label,stage',[('raw','green'),('half_ripe','turning'),('ripe','red')])
def test_detection_classes(monkeypatch,label,stage):
    monkeypatch.setattr('backend.app.infer_image',lambda _:detection(label))
    monkeypatch.setattr('backend.app.observe',AsyncMock(return_value=(GeminiObservation(tomato_visible=True), 'available')))
    result=post().json(); assert result['visual_observations']['maturity_stage']==stage
    assert result['detector']['counts'][label]==1
    assert result['report']['source']=='deterministic'

def test_rotten_and_low_confidence_do_not_harvest(monkeypatch):
    for item in [detection('rotten'),detection('ripe',.3),detection('ripe',.9,'rotten')]:
        monkeypatch.setattr('backend.app.infer_image',lambda _, d=item:d)
        monkeypatch.setattr('backend.app.observe',AsyncMock(return_value=(GeminiObservation(tomato_visible=True), 'available')))
        result=post().json(); assert result['harvest']['status']=='inspect_manually'

def test_disagreement_no_fruit_and_missing_model(monkeypatch):
    monkeypatch.setattr('backend.app.infer_image',lambda _:detection())
    monkeypatch.setattr('backend.app.observe',AsyncMock(return_value=(GeminiObservation(tomato_visible=False), 'available')))
    result=post().json(); assert result['disagreement'] and result['harvest']['status']=='inspect_manually'
    monkeypatch.setattr('backend.app.infer_image',lambda _:{'status':'ok','message':'no detection','width':40,'height':40,'counts':{},'detections':[]})
    result=post().json(); assert result['harvest']['status']=='inspect_manually'
    monkeypatch.setattr('backend.app.infer_image',lambda _:{'status':'unavailable','message':'missing weights','detections':[],'counts':{}})
    result=post().json(); assert result['detector']['status']=='unavailable' and result['report']['source']=='deterministic'

def test_manual_environment_and_validation(monkeypatch):
    monkeypatch.setattr('backend.app.infer_image',lambda _:{'status':'unavailable','message':'missing','detections':[],'counts':{}})
    data=post(manual_temperature_c='20',manual_humidity_pct='60').json()
    assert data['sensor_data']['data_mode']=='manual' and data['sensor_data']['ultrasonic_distance_cm'] is None
    assert any(e['type']=='USER_REPORTED' and e['label']=='Air Microclimate' for e in data['watering']['evidence'])
    assert post(manual_humidity_pct='101').status_code==422

def test_multiple_fruits_different_stages_are_uncertain(monkeypatch):
    d=detection('ripe'); d2=detection('raw')['detections'][0]; d['detections'].append(d2); d['counts']['raw']=1
    monkeypatch.setattr('backend.app.infer_image',lambda _:d)
    monkeypatch.setattr('backend.app.observe',AsyncMock(return_value=(GeminiObservation(tomato_visible=True), 'available')))
    result=post().json(); assert len(result['detector']['detections'])==2 and result['harvest']['status']=='inspect_manually'


def test_mixed_fruit_counts_and_cautious_harvest_guidance(monkeypatch):
    d = detection('ripe')
    d['detections'] = [detection(label)['detections'][0] for label in ['ripe'] * 8 + ['half_ripe'] + ['raw'] * 4]
    d['counts'] = {}  # Derive advice from the actual per-fruit predictions.
    monkeypatch.setattr('backend.app.infer_image', lambda _: d)
    monkeypatch.setattr('backend.app.observe', AsyncMock(return_value=(GeminiObservation(tomato_visible=True), 'available')))
    data = post().json()
    assert data['harvest']['status'] == 'inspect_manually'
    assert '8 ripe, 1 half-ripe, 4 unripe' in data['harvest']['recommendation']
    assert 'apparently ripe tomatoes first' in data['harvest']['recommendation']
    assert any('food safety' in text for text in data['harvest']['limitations'])
    assert data['detector']['detections'][0]['confidence'] == .9


def test_all_ripe_and_configured_model_provenance(monkeypatch):
    monkeypatch.setenv('GEMINI_MODEL', 'gemini-test-model')
    monkeypatch.setattr('backend.app.infer_image', lambda _: detection('ripe'))
    monkeypatch.setattr('backend.app.observe', AsyncMock(return_value=(GeminiObservation(tomato_visible=True, maturity_stage='ripe', leaf_symptoms='yellowing'), 'available')))
    data = post().json()
    assert data['harvest']['status'] == 'likely_ready'
    assert '1 ripe, 0 half-ripe, 0 unripe' in data['harvest']['recommendation']
    assert data['visual_observations']['ai_provider'] == 'gemini-test-model'
    assert any(item['type'] == 'PREDICTED' for item in data['fertilizer']['evidence'])


def test_disagreement_and_rotten_are_not_prioritized_for_harvest(monkeypatch):
    for item, obs in [(detection('ripe'), GeminiObservation(tomato_visible=False)), (detection('ripe', raw_label='rotten'), GeminiObservation(tomato_visible=True))]:
        monkeypatch.setattr('backend.app.infer_image', lambda _, value=item: value)
        monkeypatch.setattr('backend.app.observe', AsyncMock(return_value=(obs, 'available')))
        harvest = post().json()['harvest']
        assert harvest['status'] == 'inspect_manually'
        assert 'apparently ripe tomatoes first' not in harvest['recommendation']


def test_missing_detector_never_fabricates_counts(monkeypatch):
    monkeypatch.setattr('backend.app.infer_image', lambda _: {'status': 'unavailable', 'message': 'missing', 'detections': [], 'counts': {}})
    harvest = post().json()['harvest']
    assert harvest['status'] == 'inspect_manually'
    assert 'AI-predicted candidates' not in harvest['recommendation']

def test_serial_parser_provenance_and_invalid_values():
    from backend.services.serial_sensor import parse_reading
    valid = parse_reading(b'{"source":"metro328","air_temperature_c":23.4,"air_relative_humidity_pct":60,"ultrasonic_distance_cm":30}')
    assert valid and valid.data_mode == 'live' and valid.canopy_height_proxy_cm is None
    assert parse_reading(b'{"source":"metro328","air_relative_humidity_pct":101}') is None
    assert parse_reading(b'{"source":"metro328","air_temperature_c":NaN}') is None
    assert parse_reading(b'{"source":"other","air_temperature_c":20}') is None
    assert parse_reading(b'bad json') is None

def test_invalid_inputs_and_key_not_returned(monkeypatch):
    monkeypatch.setattr('backend.app.infer_image',lambda _:{'status':'unavailable','message':'missing','detections':[],'counts':{}})
    marker='do-not-return-this-secret'
    response=post(manual_distance_cm='30', gemini_api_key=marker)
    assert response.status_code == 200 and marker not in response.text
    assert response.json()['sensor_data']['ultrasonic_distance_cm'] == 30
    assert response.json()['sensor_data']['canopy_height_proxy_cm'] is None
    assert post(manual_distance_cm='451').status_code == 422
    assert post(crop='pine').status_code == 422
    assert post(latitude='999', longitude='1').status_code == 422
    assert post(latitude='43').status_code == 422


def test_request_rate_limit(monkeypatch):
    from backend.app import _request_times
    _request_times.clear()
    q = _request_times['testclient']
    import time
    q.extend([time.monotonic()] * 60)
    assert client.post('/api/analyze').status_code == 429
    _request_times.clear()
