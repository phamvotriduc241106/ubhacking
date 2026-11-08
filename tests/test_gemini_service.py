import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock
import pytest
from backend.services import gemini_service as service


def fake_client(monkeypatch, result=None, error=None):
    call = AsyncMock(return_value=SimpleNamespace(text=result), side_effect=error)
    client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=call)))
    monkeypatch.setattr(service.genai, 'Client', lambda **kwargs: client)
    return call


def test_missing_key(monkeypatch):
    monkeypatch.delenv('GEMINI_API_KEY', raising=False)
    assert asyncio.run(service.observe(b'image', 'image/jpeg')) == (None, 'not_configured')
    assert asyncio.run(service.write_report({})) == (None, 'not_configured')


def test_successful_structured_observation_and_report(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only-secret')
    call = fake_client(monkeypatch, '{"tomato_visible":true,"maturity_stage":"ripe","fruit_description":"red fruit","leaf_symptoms":"unknown"}')
    obs, status = asyncio.run(service.observe(b'image', 'image/jpeg', {'sensor': {'data_mode': 'simulated'}}))
    assert status == 'available' and obs.tomato_visible and obs.maturity_stage == 'ripe'
    assert 'simulated' in str(call.call_args)
    fake_client(monkeypatch, 'A concise report.')
    assert asyncio.run(service.write_report({'harvest': 'inspect'})) == ('A concise report.', 'available')


def test_invalid_structured_output_is_not_observation(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only-secret')
    fake_client(monkeypatch, '{not JSON')
    assert asyncio.run(service.observe(b'image', 'image/jpeg')) == (None, 'invalid_response')


@pytest.mark.parametrize('error,status', [(TimeoutError(), 'timeout'), (type('QuotaError', (Exception,), {'code': 429})(), 'quota_exceeded'), (type('AuthError', (Exception,), {'code': 401})(), 'authentication_failed')])
def test_provider_failures_are_sanitized(monkeypatch, error, status):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only-secret')
    fake_client(monkeypatch, error=error)
    assert asyncio.run(service.observe(b'image', 'image/jpeg')) == (None, status)
    assert asyncio.run(service.write_report({})) == (None, status)


def test_vision_retries_transient_error_and_disables_sdk_retries(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
    monkeypatch.setenv('GEMINI_VISION_MAX_ATTEMPTS', '2')
    responses = [TimeoutError(), SimpleNamespace(text='{"tomato_visible":true}')]
    call = AsyncMock(side_effect=responses)
    options = []
    def client(**kwargs):
        options.append(kwargs['http_options'])
        return SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=call)))
    monkeypatch.setattr(service.genai, 'Client', client)
    observation, status = asyncio.run(service.observe(b'image', 'image/jpeg'))
    assert status == 'available' and observation.tomato_visible is True
    assert call.await_count == 2
    assert all(option.retry_options.attempts == 1 and option.timeout <= 40000 for option in options)


def test_vision_never_retries_authentication_or_logs_secrets(monkeypatch, caplog):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-secret')
    error = type('AuthenticationError', (Exception,), {'code': 401})('test-secret private-image-data')
    call = fake_client(monkeypatch, error=error)
    assert asyncio.run(service.observe(b'private-image-data', 'image/jpeg')) == (None, 'authentication_failed')
    assert call.await_count == 1
    assert 'test-secret' not in caplog.text and 'private-image-data' not in caplog.text
    assert 'response_status=401' in caplog.text


def test_vision_total_timeout_is_bounded(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
    monkeypatch.setenv('GEMINI_VISION_TIMEOUT_SECONDS', '1')
    monkeypatch.setenv('GEMINI_VISION_TOTAL_TIMEOUT_SECONDS', '1')
    monkeypatch.setenv('GEMINI_VISION_MAX_ATTEMPTS', '3')
    async def slow(**kwargs):
        await asyncio.sleep(10)
    call = fake_client(monkeypatch)
    call.side_effect = slow
    start = service.time.monotonic()
    assert asyncio.run(service.observe(b'image', 'image/jpeg')) == (None, 'timeout')
    assert service.time.monotonic() - start < 2
    assert call.await_count == 1
