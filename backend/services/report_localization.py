"""Offline, static translations of known report phrases; unknown text fails closed."""
import hashlib
import json
import re
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'locales'
UNITS = re.compile(r'(?<![A-Za-z])(°C|°F|cm|mm|%)(?![A-Za-z])')
NUMBERS = re.compile(r'\d+(?:[.,]\d+)?')

@lru_cache(maxsize=10)
def _catalog(locale):
    if locale not in {'en','es','zh-CN','hi','pt-BR','fr','ar','tr','de','vi'}:
        return {}
    try:
        return json.loads((ROOT / f'{locale}.json').read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return {}

def translate(locale, text):
    if not text:
        return ''
    if locale == 'en':
        return text
    key = 'ui_' + hashlib.sha256(text.encode('utf-8')).hexdigest()[:16]
    result = _catalog(locale).get(key)
    if not isinstance(result, str) or not result.strip():
        raise ValueError('Unknown report phrase')
    # Never silently omit or change a number or unit in an advisory.
    if sorted(NUMBERS.findall(text)) != sorted(NUMBERS.findall(result)) or sorted(UNITS.findall(text)) != sorted(UNITS.findall(result)):
        raise ValueError('Unsafe numeric or unit translation')
    if result == text and len(text.split()) > 3:
        raise ValueError('Phrase has not been translated')
    return result

def localize_fallback(locale, visual, detector, sensors, weather, decisions, disagreement):
    tr = lambda text: translate(locale, text)
    harvest, water, fert = (decisions[k] for k in ('harvest','watering','fertilizer'))
    temp = str(sensors.air_temperature_c) if sensors.air_temperature_c is not None else tr('Not measured')
    humidity = str(sensors.air_relative_humidity_pct) if sensors.air_relative_humidity_pct is not None else tr('Not measured')
    weather_fallback = f" ({tr('simulated fallback')})" if weather.is_fallback else ''
    return (f"{tr('Overall Plant Assessment')}\n{tr(visual.observation_notes)}\n\n"
            f"{tr('Ripeness and Harvest Readiness')}\n{tr(harvest.title)}: {tr(harvest.recommendation)}\n\n"
            f"{tr('Fruit Quality Assessment')}\n{tr('Independent maturity and quality models are unavailable. A visual rotten label is a prediction, not a food safety test.')}\n\n"
            f"{tr('Environmental Conditions')}\n{tr('Air')}: {temp} °C, {humidity}% RH; {tr('Source')}: {sensors.source}, {tr('Mode')}: {tr(sensors.data_mode)}. {tr('Weather')}: {weather.source}{weather_fallback}.\n\n"
            f"{tr('Watering Guidance')}\n{tr(water.recommendation)}\n\n"
            f"{tr('Fertilizer and Plant Health')}\n{tr(fert.recommendation)}\n\n"
            f"{tr('Recommended Next Actions')}\n{tr(harvest.next_action)}\n{tr(water.next_action)}\n{tr(fert.next_action)}\n\n"
            f"{tr('Confidence and Data Limitations')}\n{tr(detector.message)} {tr(disagreement or '')} {tr('Air humidity is not soil moisture; no nutrients or fruit firmness were measured. Predictions are not calibrated for this setting.')}")
