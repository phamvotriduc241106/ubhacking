"""Server-side Gemini calls. Return safe failure categories, never provider errors or keys."""
import asyncio
import json
import os
from google import genai
from google.genai import types
from backend.models import GeminiObservation

DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash'


def gemini_model() -> str:
    return os.getenv('GEMINI_MODEL') or DEFAULT_GEMINI_MODEL


def _status(error: Exception) -> str:
    if isinstance(error, (asyncio.TimeoutError, TimeoutError)):
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
    try:
        client = genai.Client(api_key=key)
        response = await asyncio.wait_for(client.aio.models.generate_content(
            model=gemini_model(),
            contents=[types.Part.from_bytes(data=image, mime_type=mime),
                'Describe only visible plant and fruit features. Is a tomato fruit visible? Use null when uncertain. Do not diagnose causes or infer soil or nutrients. Context is reported separately and must not be treated as visual evidence: ' + json.dumps(context or {}, ensure_ascii=False)],
            config=types.GenerateContentConfig(response_mime_type='application/json', response_schema=GeminiObservation, temperature=0.1)), timeout=25)
        try:
            return GeminiObservation.model_validate_json(response.text), 'available'
        except (ValueError, TypeError):
            return None, 'invalid_response'
    except Exception as error:
        return None, _status(error)


async def write_report(evidence: dict) -> tuple[str | None, str]:
    key = os.getenv('GEMINI_API_KEY')
    if not key:
        return None, 'not_configured'
    try:
        client = genai.Client(api_key=key)
        response = await asyncio.wait_for(client.aio.models.generate_content(
            model=gemini_model(),
            contents=json.dumps(evidence, ensure_ascii=False),
            config=types.GenerateContentConfig(system_instruction=(
                "You are FolLand's agricultural reporting assistant. Write clear, practical reports for farmers using only supplied evidence and approved recommendations. Do not invent observations, measurements, probabilities, diagnoses, or override deterministic decisions. Differentiate measured, historical, predicted, simulated and unavailable information. Explain uncertainty and give actionable steps in short accessible paragraphs. Use these headings: Overall Plant Assessment, Ripeness and Harvest Readiness, Fruit Quality Assessment, Environmental Conditions, Watering Guidance, Fertilizer and Plant Health, Recommended Next Actions, Confidence and Data Limitations."), temperature=0.1)), timeout=25)
        text = response.text.strip() if response.text else None
        return (text, 'available') if text else (None, 'invalid_response')
    except Exception as error:
        return None, _status(error)
