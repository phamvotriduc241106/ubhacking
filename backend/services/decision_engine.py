import json
from pathlib import Path
from typing import Dict, Any, List
from backend.models import (
    VisualObservation,
    SensorReading,
    WeatherSummary,
    RecommendationCard,
    EvidenceItem,
    ReferenceItem,
)

KNOWLEDGE_PATH = Path(__file__).resolve().parent.parent.parent / "knowledge" / "tomato_rules.json"


def _fmt(value) -> str:
    """Format a reading; 0 is a valid measurement, only a missing value is N/A."""
    return "N/A" if value is None else f"{value}"


class DecisionEngine:
    _rules: Dict[str, Any] = {}
    _sources: Dict[str, ReferenceItem] = {}

    @classmethod
    def _load_rules(cls):
        if not cls._rules and KNOWLEDGE_PATH.exists():
            with open(KNOWLEDGE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                cls._rules = data
                for s in data.get("sources", []):
                    cls._sources[s["id"]] = ReferenceItem(
                        id=s["id"],
                        title=s["title"],
                        organization=s["organization"],
                        url=s["url"],
                        relevance=s.get("applicability", "Agricultural extension research")
                    )

    @classmethod
    def evaluate(
        cls,
        crop: str,
        variety: str | None,
        harvest_goal: str,
        soil_condition: str,
        leaf_symptoms: str | None,
        visual: VisualObservation,
        sensors: SensorReading,
        weather: WeatherSummary,
        leaf_symptoms_source: str = "user",
    ) -> Dict[str, Any]:
        cls._load_rules()

        harvest_card = cls._evaluate_harvest(visual, harvest_goal, variety)
        watering_card = cls._evaluate_watering(soil_condition, sensors, weather)
        fertilizer_card = cls._evaluate_fertilizer(leaf_symptoms, soil_condition, leaf_symptoms_source)

        # Build comprehensive scientific summary
        summary = (
            f"FolLand Decision Summary: Evaluated {crop.capitalize()} "
            f"with visual maturity stage '{visual.stage_label}'. "
            f"Physical soil status: '{soil_condition.replace('_', ' ')}'. "
            f"Ambient context: {_fmt(sensors.air_temperature_c)}°C, {_fmt(sensors.air_relative_humidity_pct)}% RH (data mode: {sensors.data_mode}). "
            f"Weather source: {weather.source}; rolling rainfall values unavailable unless measured. "
            "All recommendations adhere to extension scientific guardrails: no soil moisture is inferred from air humidity, and no fertilizer is prescribed without soil testing."
        )

        return {
            "harvest": harvest_card,
            "watering": watering_card,
            "fertilizer": fertilizer_card,
            "scientific_summary": summary
        }

    @classmethod
    def _evaluate_harvest(
        cls,
        visual: VisualObservation,
        harvest_goal: str,
        variety: str | None
    ) -> RecommendationCard:
        stage = visual.maturity_stage or "unavailable"
        sources = [cls._sources["umn-tomatoes"]] if "umn-tomatoes" in cls._sources else []

        evidence: List[EvidenceItem] = []
        if visual.is_simulated and stage != "unavailable":
            evidence.append(EvidenceItem(
                type="SIMULATED",
                label="Demonstration Maturity Stage",
                detail=f"User selected demo scenario: {visual.stage_label}"
            ))
        elif stage == "unavailable":
            evidence.append(EvidenceItem(
                type="NOT_MEASURED",
                label="Computer Vision Analysis",
                detail="No automated classification claimed. Select a demo scenario to preview rules."
            ))

        goal_label = "Immediate consumption (eat now)" if harvest_goal == "eat_now" else "Storage or transport"
        evidence.append(EvidenceItem(
            type="USER_REPORTED",
            label="Harvest Objective",
            detail=goal_label
        ))

        evidence.append(EvidenceItem(
            type="NOT_MEASURED",
            label="Cultivar & Firmness",
            detail=f"Variety specified: {variety or 'General standard tomato'}. Manual tactile firmness not measured."
        ))

        if stage == "red":
            status = "likely_ready"
            title = "Likely Ready for Harvest"
            recom = "Fruit displays mature-red coloration. Check tactile firmness gently at the calyx before detaching."
            limitations = [
                "Color alone can mislead for non-red varieties (yellow, green-ripe, purple).",
                "Internal ripeness and sugar content require physical firmness assessment.",
                "Visual stage is provided by demonstration scenario, not live camera inference."
            ]
            next_action = "Gently squeeze fruit; if there is slight give and easy separation from stem, harvest today."
        elif stage == "turning":
            status = "approaching_harvest"
            title = "Approaching Harvest (Breaker Stage)"
            recom = "Fruit exhibits initial pink/orange break. Ripening has begun and can finish on vine or indoors."
            limitations = [
                "Ripening speed heavily depends on temperature (stalls above 30°C / 86°F).",
                "Visual observation supplied via demo scenario."
            ]
            next_action = (
                "Harvest now if field pests, cracking, or frost are concerns — tomatoes at breaker stage ripen indoors with comparable quality."
                if harvest_goal == "store_transport"
                else "Inspect again in 24–48 hours for full vine-ripened flavor."
            )
        elif stage == "green":
            status = "inspect_maturity"
            title = "Not Yet Ready / Immature Stage"
            recom = "Fruit is green. Allow to continue developing unless frost or vine damage forces early picking."
            limitations = [
                "Mature-green fruit can ripen off-vine if full size has been reached, but immature fruit will shrivel.",
                "Cannot distinguish mature-green from immature green from photo alone."
            ]
            next_action = "Leave on vine. If end of season or frost threatens, check for mature glossiness and white seed gel."
        else:
            status = "insufficient_evidence"
            title = "Visual Analysis Unavailable"
            recom = "Unable to determine harvest readiness without visual confirmation or selected demo scenario."
            limitations = [
                "No automated vision model currently connected.",
                "No demo scenario selected."
            ]
            next_action = "Select a demo scenario (Green, Turning, or Red) to test decision engine recommendations."

        return RecommendationCard(
            category="harvest",
            status=status,
            title=title,
            recommendation=recom,
            evidence=evidence,
            limitations=limitations,
            next_action=next_action,
            references=sources
        )

    @classmethod
    def _evaluate_watering(
        cls,
        soil_condition: str,
        sensors: SensorReading,
        weather: WeatherSummary
    ) -> RecommendationCard:
        sources = [cls._sources["umn-watering"]] if "umn-watering" in cls._sources else []

        evidence: List[EvidenceItem] = []
        soil_display = {
            "dry_at_5cm": "Dry 5 cm below surface (Depleted root zone)",
            "moist": "Moist 5 cm below surface (Adequate hydration)",
            "wet": "Saturated / Waterlogged (Excess water present)",
            "unknown": "Not reported / Unknown physical soil state"
        }.get(soil_condition, soil_condition)

        evidence.append(EvidenceItem(
            type="USER_REPORTED",
            label="Manual Soil Check",
            detail=soil_display
        ))

        # Sensor ambient context
        if sensors.air_relative_humidity_pct is not None:
            evidence.append(EvidenceItem(
                type="USER_REPORTED" if sensors.data_mode == "manual" else "SIMULATED" if sensors.data_mode == "simulated" else "OBSERVED",
                label="Air Microclimate",
                detail=f"Air Temp: {sensors.air_temperature_c}°C, Air RH: {sensors.air_relative_humidity_pct}% (Context only, NOT soil moisture)"
            ))

        # Weather context
        rain_info = "Rolling 24-hour rainfall is unavailable. Daily totals do not represent rolling 24-hour measurements."
        evidence.append(EvidenceItem(
            type="SIMULATED" if weather.is_fallback else "WEATHER_FORECAST",
            label="Weather sample" if weather.is_fallback else "Open-Meteo Weather",
            detail=rain_info
        ))

        evidence.append(EvidenceItem(
            type="NOT_MEASURED",
            label="In-Situ Soil Probe",
            detail="No physical electronic soil moisture probe connected."
        ))

        common_watering_limit = "Air relative humidity does NOT indicate or measure root-zone soil moisture."

        if soil_condition == "dry_at_5cm":
            status = "check_and_likely_water"
            title = "Check Soil & Likely Water"
            recom = "The reported soil check suggests dryness. Consider watering at the soil line and check how deeply water penetrates."
            limitations = [
                common_watering_limit,
                "Container size and root depth alter exact water volume required."
            ]
            next_action = "Apply water directly to the soil surface (avoid wetting tomato foliage to reduce blight risk) until water penetrates root zone."
        elif soil_condition == "moist":
            status = "monitor_conditions"
            title = "Soil Moisture Adequate — Monitor"
            recom = "The reported soil check is moist. Monitor the soil before adding water."
            limitations = [
                common_watering_limit,
                "High temperatures and wind can rapidly deplete surface moisture. Relying on manual tactile check."
            ]
            next_action = "Recheck soil in 24–48 hours, especially if forecast predicts hot or dry weather."
        elif soil_condition == "wet":
            status = "avoid_watering"
            title = "Soil Saturated — Avoid Additional Watering"
            recom = "The reported soil check is very wet. Additional watering could worsen waterlogging."
            limitations = [
                common_watering_limit,
                "Waterlogged roots cannot take up oxygen, causing symptoms that can mimic drought wilting."
            ]
            next_action = "Allow soil to drain completely. Ensure container drainage holes are clear or soil aeration is adequate."
        else:
            status = "check_soil_before_deciding"
            title = "Check Soil Physically Before Deciding"
            recom = "Cannot recommend irrigation without knowing root-zone condition. Air humidity is not soil moisture."
            limitations = [
                common_watering_limit,
                "Neither ambient sensors nor weather forecasts replace a direct physical soil check."
            ]
            next_action = "Insert finger or trowel 5 to 10 cm into the soil near the plant base to check if moisture is present."

        return RecommendationCard(
            category="watering",
            status=status,
            title=title,
            recommendation=recom,
            evidence=evidence,
            limitations=limitations,
            next_action=next_action,
            references=sources
        )

    @classmethod
    def _evaluate_fertilizer(
        cls,
        leaf_symptoms: str | None,
        soil_condition: str,
        leaf_symptoms_source: str = "user",
    ) -> RecommendationCard:
        sources = []
        if "psu-health" in cls._sources:
            sources.append(cls._sources["psu-health"])
        if "psu-vegetable-problems" in cls._sources:
            sources.append(cls._sources["psu-vegetable-problems"])

        evidence: List[EvidenceItem] = []
        symptom_display = {
            "none": "No visual leaf stress reported",
            "yellowing": "Foliar yellowing / chlorosis reported",
            "browning_spots": "Necrotic leaf spotting / brown margins reported",
            "wilting": "Loss of leaf turgor / wilting reported"
        }.get(leaf_symptoms or "none", "None reported")

        # Label where the symptom came from: the user's own report, an AI photo observation,
        # or a demo scenario. AI output must not be presented as something the user reported.
        foliage_type, foliage_label = {
            "ai": ("PREDICTED", "Visual Foliage Observations (AI photo analysis)"),
            "simulated": ("SIMULATED", "Visual Foliage Observations (demo scenario)"),
        }.get(leaf_symptoms_source, ("USER_REPORTED", "Visual Foliage Observations"))
        evidence.append(EvidenceItem(
            type=foliage_type,
            label=foliage_label,
            detail=symptom_display.replace(" reported", " observed") if leaf_symptoms_source == "ai" else symptom_display
        ))

        evidence.append(EvidenceItem(
            type="NOT_MEASURED",
            label="Soil Nutrient Lab Assay",
            detail="No laboratory soil test, electrical conductivity, or pH data available."
        ))

        evidence.append(EvidenceItem(
            type="NOT_MEASURED",
            label="Fertilization History",
            detail="Prior fertilizer formulation, frequency, and application rates unknown."
        ))

        symptoms = leaf_symptoms or "none"

        if symptoms == "none":
            status = "insufficient_evidence"
            title = "Insufficient Evidence for Fertilization"
            recom = "Nutrient status has not been measured and no laboratory soil assay is available. Do not apply fertilizer arbitrarily."
            limitations = [
                "Nutrient levels (N, P, K, Ca, Mg) cannot be determined from photos or environmental sensors.",
                "Excessive nitrogen induces luxuriant foliage while suppressing fruit production and encouraging blossom end rot."
            ]
            next_action = "Maintain regular balanced compost/mulch program; submit annual soil sample to extension lab before applying synthetic nutrients."
        else:
            status = "investigate_stress"
            title = "Visible Stress Detected — Investigation Required"
            if symptoms == "yellowing":
                recom = "Yellowing (chlorosis) observed. Differential causes include nitrogen deficiency, overwatering, root rot, natural senescence, or pH lockout."
                limitations = [
                    "Overwatering causes nitrogen-like yellowing by drowning root hairs. Adding fertilizer to waterlogged roots causes severe root burn."
                ]
                next_action = "Check whether yellowing is on lower older leaves (mobile N deficiency) or new growth (immobile Fe/micro deficiency). Check root-zone moisture before any feeding."
            elif symptoms == "browning_spots":
                recom = "Reported leaf spots or browning need inspection. A photo cannot establish the cause or nutrient status."
                limitations = [
                    "Fertilizer will NOT cure infectious pathogens and excess fertilizer will exacerbate plant susceptibility."
                ]
                next_action = "Inspect affected foliage, avoid overhead wetting, and consult a local extension clinic if symptoms spread."
            elif symptoms == "wilting":
                recom = "Wilting detected. Root water uptake failure may be caused by drought, saturated anaerobic soil, or fungal vascular wilt (Fusarium/Verticillium)."
                limitations = [
                    "Applying fertilizer to a wilted plant can prove fatal due to osmotic shock."
                ]
                next_action = "Check soil moisture immediately. If bone dry, water gently. If soggy, improve drainage and test for vascular discoloration."
            else:
                recom = "Foliar anomaly detected. Further agronomic assessment required."
                limitations = ["Symptoms overlap heavily across environmental and biological causes."]
                next_action = "Monitor progression and consult university extension diagnostic guide."

        return RecommendationCard(
            category="fertilizer",
            status=status,
            title=title,
            recommendation=recom,
            evidence=evidence,
            limitations=limitations,
            next_action=next_action,
            references=sources
        )
