"""Server-side Gemini calls. Return safe failure categories, never provider errors or keys."""
import asyncio
import json
import logging
import os
import time
import httpx
from google import genai
from google.genai import types
from backend.models import GeminiObservation, ReportNarrative

logger = logging.getLogger(__name__)


def _number(name: str, default: float, minimum: float, maximum: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
        if not minimum <= value <= maximum:
            raise ValueError
        return value
    except ValueError:
        logger.warning('gemini_vision invalid_setting=%s using_default=true', name)
        return default


def _status(error: Exception) -> str:
    if isinstance(error, (asyncio.TimeoutError, TimeoutError, httpx.TimeoutException)):
        return 'timeout'
    code = getattr(error, 'code', None)
    if code == 429:
        return 'quota_exceeded'
    if code in (401, 403):
        return 'authentication_failed'
    return 'unavailable'


async def observe(image: bytes, mime: str, context: dict | None = None) -> tuple[GeminiObservation | None, str]:
    key = os.getenv('GEMINI_API_KEY')
    if not key:
        return None, 'not_configured'
    per_attempt = _number('GEMINI_VISION_TIMEOUT_SECONDS', 40, 1, 60)
    total = _number('GEMINI_VISION_TOTAL_TIMEOUT_SECONDS', 65, 1, 90)
    attempts = int(_number('GEMINI_VISION_MAX_ATTEMPTS', 2, 1, 3))
    start = time.monotonic()
    status = 'timeout'
    for attempt in range(1, attempts + 1):
        remaining = total - (time.monotonic() - start)
        if remaining <= 0:
            break
        timeout = min(per_attempt, remaining)
        attempt_start = time.monotonic()
        try:
            # Disable SDK retries so the outer budget controls every attempt.
            client = genai.Client(api_key=key, http_options=types.HttpOptions(
                timeout=max(1, int(timeout * 1000)), retry_options=types.HttpRetryOptions(attempts=1)))
            try:
                response = await asyncio.wait_for(client.aio.models.generate_content(
                    model=os.getenv('GEMINI_MODEL', 'gemini-2.5-flash'),
                    contents=[types.Part.from_bytes(data=image, mime_type=mime),
                        'Describe only visible plant and fruit features. Is a tomato fruit visible? Use null when uncertain. Do not diagnose causes or infer soil or nutrients. Context is reported separately and must not be treated as visual evidence: ' + json.dumps(context or {}, ensure_ascii=False)],
                    config=types.GenerateContentConfig(response_mime_type='application/json', response_schema=GeminiObservation, temperature=0.1)), timeout=timeout)
            finally:
                close = getattr(client.aio, 'aclose', None)
                if close:
                    try:
                        await asyncio.wait_for(close(), timeout=1)
                    except Exception:
                        logger.warning('gemini_vision client_close_failed=true')
            try:
                result = GeminiObservation.model_validate_json(response.text)
            except (ValueError, TypeError):
                logger.info('gemini_vision attempt=%d status=invalid_response latency_ms=%d', attempt, int((time.monotonic() - attempt_start) * 1000))
                return None, 'invalid_response'
            logger.info('gemini_vision attempt=%d status=available latency_ms=%d', attempt, int((time.monotonic() - attempt_start) * 1000))
            return result, 'available'
        except Exception as error:
            status = _status(error)
            code = getattr(error, 'code', None)
            safe_code = code if isinstance(code, int) and 100 <= code <= 599 else None
            logger.warning('gemini_vision attempt=%d status=%s error_type=%s response_status=%s latency_ms=%d',
                attempt, status, type(error).__name__, safe_code, int((time.monotonic() - attempt_start) * 1000))
            transient = status in ('timeout', 'quota_exceeded') or safe_code in (500, 502, 503, 504)
            if not transient or attempt == attempts:
                break
            remaining = total - (time.monotonic() - start)
            if remaining <= 0.25:
                break
            await asyncio.sleep(min(0.25 * attempt, remaining))
    return None, status


async def write_report(evidence: dict) -> tuple[str | None, str]:
    key = os.getenv('GEMINI_API_KEY')
    if not key:
        return None, 'not_configured'
    try:
        client = genai.Client(api_key=key)
        response = await asyncio.wait_for(client.aio.models.generate_content(
            model=os.getenv('GEMINI_MODEL', 'gemini-2.5-flash'),
            contents=json.dumps(evidence, ensure_ascii=False),
            config=types.GenerateContentConfig(system_instruction=(
                "Select the safest appropriate farmer-friendly summary and conclusion from the allowed schema. Do not invent facts, numbers, diagnoses, or actions. The deterministic harvest decision is authoritative."), response_mime_type='application/json', response_schema=ReportNarrative, temperature=0.1)), timeout=25)
        narrative = ReportNarrative.model_validate_json(response.text)
        return narrative.model_dump_json(), 'available'
    except (ValueError, TypeError):
        return None, 'invalid_response'
    except Exception as error:
        return None, _status(error)
