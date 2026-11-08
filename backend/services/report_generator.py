"""Build reports from validated analysis data; Gemini can only select safe narrative."""
import re
import os
from backend.models import FarmerReport, ReportNarrative, ReportSections
from backend.services.gemini_service import write_report


def _visible_description(text: str, fallback: str) -> str:
    # Vision output is descriptive, never a source for measurements or safety claims.
    if not text or re.search(r'\d|<[^>]*>|\b(?:one|two|three|four|five|six|seven|eight|nine|ten|nutrient|nitrogen|phosphorus|potassium|firmness|safe to eat|food safety)\b', text, re.IGNORECASE):
        return fallback
    return text


async def generate(visual, detector, observation, sensors, weather, decisions, disagreement):
    harvest, water, fertilizer = (decisions[k] for k in ('harvest', 'watering', 'fertilizer'))
    evidence = {'visual': visual.model_dump(), 'detector': detector.model_dump(), 'gemini_observation': observation.model_dump() if observation else None, 'sensors': sensors.model_dump(), 'weather': weather.model_dump(), 'decisions': {k: v.model_dump() for k, v in decisions.items() if k in ('harvest', 'watering', 'fertilizer')}, 'disagreement': disagreement, 'quality_model': 'unavailable', 'greenhouse': 'unavailable', 'nasa': 'unavailable'}
    raw, status = await write_report(evidence)
    try:
        narrative = ReportNarrative.model_validate_json(raw) if raw else None
    except (ValueError, TypeError):
        narrative, status = None, 'invalid_response'
    counts = None
    if detector.status == 'ok':
        counts = {label: sum(item.label == label for item in detector.detections) for label in ('ripe', 'half_ripe', 'raw', 'rotten')}
        counts['rotten'] = sum(item.label == 'rotten' or item.raw_label == 'rotten' for item in detector.detections)
    limitations = list(dict.fromkeys(harvest.limitations + water.limitations + fertilizer.limitations + [detector.message, 'Model classifications are predictions and scores are not calibrated for field use.', 'Soil nutrients, fruit firmness and food safety were not measured. Air humidity is not soil moisture.'] + ([disagreement] if disagreement else [])))
    sections = ReportSections(
        executive_summary=narrative.executive_summary if narrative else 'Review the available observations and check the plant in person.',
        fruit_observation=_visible_description(observation.fruit_description, 'No suitable descriptive fruit observation available.') if observation else ('Demo scenario: ' + visual.stage_label if visual.is_simulated and visual.photo_uploaded else 'Gemini visual observation unavailable.'),
        leaf_observation=_visible_description(observation.leaf_description, 'No suitable descriptive leaf observation available.') if observation else 'Gemini leaf observation unavailable.',
        observation_source='AI-predicted' if observation else 'simulated' if visual.is_simulated and visual.photo_uploaded else 'unavailable',
        harvest_status=harvest.status, harvest_recommendation=harvest.recommendation, fruit_counts=counts,
        air_temperature_c=sensors.air_temperature_c, air_humidity_pct=sensors.air_relative_humidity_pct,
        sensor_source=sensors.source, sensor_mode=sensors.data_mode,
        weather_description=weather.weather_description, weather_temperature_c=weather.temperature_c,
        weather_source=weather.source, weather_mode='unavailable' if weather.source == 'unavailable' else 'simulated' if weather.is_fallback else 'current model',
        watering=water.recommendation, watering_evidence=[f'{e.type}: {e.label} — {e.detail}' for e in water.evidence],
        fertilizer=fertilizer.recommendation, fertilizer_limitations=fertilizer.limitations,
        next_actions=[harvest.next_action, water.next_action, fertilizer.next_action], limitations=limitations,
        conclusion=narrative.conclusion if narrative else 'Use these observations as a guide and check the plant in person.',
    )
    counts_text = ', '.join(f'{v} {k.replace("_", " ")}' for k, v in counts.items()) if counts is not None else 'Unavailable'
    text = (f'Executive Summary\n{sections.executive_summary}\nAI-predicted fruit counts: {counts_text}\n\n'
            f'Plant Observations\nFruit: {sections.fruit_observation}\nLeaves: {sections.leaf_observation}\n\n'
            f'Harvest Readiness\nStatus: {sections.harvest_status}\n{sections.harvest_recommendation}\n\n'
            f'Environmental Conditions\nAir temperature: {sections.air_temperature_c if sections.air_temperature_c is not None else "unavailable"}; humidity: {sections.air_humidity_pct if sections.air_humidity_pct is not None else "unavailable"}. Source: {sections.sensor_source} ({sections.sensor_mode}). Weather: {sections.weather_source} ({sections.weather_mode}).\n\n'
            f'Watering Guidance\n{sections.watering}\n\nFertilizer and Plant Health\n{sections.fertilizer}\n\n'
            f'Recommended Next Actions\n' + '\n'.join(sections.next_actions) + '\n\nConfidence and Limitations\n' + '\n'.join(sections.limitations) + f'\n\nConclusion\n{sections.conclusion}')
    return FarmerReport(source='gemini' if narrative else 'deterministic', text=text, gemini_status=status, sections=sections, model=os.getenv('GEMINI_MODEL', 'gemini-2.5-flash') if narrative else None)
