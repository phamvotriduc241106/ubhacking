from backend.models import FarmerReport
from backend.services.gemini_service import write_report

async def generate(visual, detector, observation, sensors, weather, decisions, disagreement):
    evidence = {'visual': visual.model_dump(), 'detector': detector.model_dump(), 'gemini_observation': observation.model_dump() if observation else None, 'sensors': sensors.model_dump(), 'weather': weather.model_dump(), 'decisions': {k:v.model_dump() for k,v in decisions.items() if k in ('harvest','watering','fertilizer')}, 'disagreement': disagreement, 'quality_model':'unavailable', 'greenhouse':'unavailable', 'nasa':'unavailable'}
    text, status = await write_report(evidence)
    if text:
        return FarmerReport(source='gemini', text=text, gemini_status=status)
    harvest, water, fert = (decisions[k] for k in ('harvest','watering','fertilizer'))
    text = (f"Overall Plant Assessment\n{visual.observation_notes}\n\n"
            f"Ripeness and Harvest Readiness\n{harvest.title}: {harvest.recommendation}\n\n"
            f"Fruit Quality Assessment\nIndependent maturity and quality models are unavailable. A visual rotten label is a prediction, not a food safety test.\n\n"
            f"Environmental Conditions\nAir: {sensors.air_temperature_c} °C, {sensors.air_relative_humidity_pct}% relative humidity; source {sensors.source}, mode {sensors.data_mode}. Weather: {weather.source}{' (simulated fallback)' if weather.is_fallback else ''}.\n\n"
            f"Watering Guidance\n{water.recommendation}\n\nFertilizer and Plant Health\n{fert.recommendation}\n\n"
            f"Recommended Next Actions\n{harvest.next_action}\n{water.next_action}\n{fert.next_action}\n\n"
            f"Confidence and Data Limitations\n{detector.message} {disagreement or ''} Air humidity is not soil moisture; no nutrients or fruit firmness were measured. Predictions are not calibrated for this setting.")
    return FarmerReport(source='deterministic', text=text, gemini_status=status)
