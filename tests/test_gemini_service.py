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


def test_report_prompt_requests_selected_language(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'test-only-secret')
    call = fake_client(monkeypatch, 'Rapport en français.')
    result = asyncio.run(service.write_report({'temperature_c': 24.5}, 'fr'))
    assert result == ('Rapport en français.', 'available')
    assert 'French' in call.call_args.kwargs['config'].system_instruction
    assert '24.5' in call.call_args.kwargs['contents']
