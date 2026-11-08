import os
import json
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from fastapi import UploadFile, HTTPException
from backend.models import VisualObservation, SensorReading, WeatherSummary

# Load environment variables
load_dotenv()

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/octet-stream"
}


class ImageAnalysisService:
    @classmethod
    async def process_upload(
        cls,
        file: Optional[UploadFile],
        demo_scenario: Optional[str] = None,
        custom_api_key: Optional[str] = None,
        sensor_data: Optional[SensorReading] = None,
        weather_data: Optional[WeatherSummary] = None,
        soil_condition: Optional[str] = None,
        crop: Optional[str] = "tomato"
    ) -> VisualObservation:
        photo_uploaded = False
        filename = None
        file_size_kb = None
        content_type = None
        file_bytes = None

        if file and file.filename:
            # Validate content type
            if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES and not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic')):
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported file format '{file.content_type}'. Please upload JPEG, PNG, or HEIC."
                )

            # Read at most one byte past the limit. A chunked upload has no Content-Length,
            # so the request middleware cannot reject it early; never load the whole stream.
            file_bytes = await file.read(MAX_FILE_SIZE_BYTES + 1)
            size_bytes = len(file_bytes)
            if size_bytes > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=400,
                    detail="File size exceeds maximum limit of 15 MB."
                )

            photo_uploaded = True
            filename = file.filename
            file_size_kb = round(size_bytes / 1024.0, 1)
            content_type = file.content_type or "image/jpeg"

        # Check for Gemini API Key (either custom passed in or from environment)
        api_key = custom_api_key or os.getenv("GEMINI_API_KEY")

        # 1. If user uploaded a photo and Gemini API key is provided, run real Multimodal Gemini Vision!
        if photo_uploaded and file_bytes and api_key and (demo_scenario is None or demo_scenario == "auto" or demo_scenario == ""):
            gemini_result = await cls._analyze_with_gemini(
                image_bytes=file_bytes,
                mime_type=content_type,
                api_key=api_key,
                filename=filename,
                sensor_data=sensor_data,
                weather_data=weather_data,
                soil_condition=soil_condition,
                crop=crop
            )
            if gemini_result:
                return gemini_result

        # 2. Otherwise, check if user chose a manual Demo Scenario
        scenario = (demo_scenario or "").strip().lower()
        if scenario == "red":
            return VisualObservation(
                photo_uploaded=photo_uploaded,
                filename=filename,
                file_size_kb=file_size_kb,
                content_type=content_type,
                maturity_stage="red",
                stage_label="Red / Ripe (Simulated Demonstration Scenario)",
                visual_confidence="high",
                is_simulated=True,
                ai_provider="demo_scenario",
                observation_notes="Observation supplied by selected demo scenario 'Red tomato'. Not inferred from uploaded photo pixels."
            )
        elif scenario == "turning":
            return VisualObservation(
                photo_uploaded=photo_uploaded,
                filename=filename,
                file_size_kb=file_size_kb,
                content_type=content_type,
                maturity_stage="turning",
                stage_label="Turning / Breaker (Simulated Demonstration Scenario)",
                visual_confidence="medium",
                is_simulated=True,
                ai_provider="demo_scenario",
                observation_notes="Observation supplied by selected demo scenario 'Turning tomato'. Not inferred from uploaded photo pixels."
            )
        elif scenario == "green":
            return VisualObservation(
                photo_uploaded=photo_uploaded,
                filename=filename,
                file_size_kb=file_size_kb,
                content_type=content_type,
                maturity_stage="green",
                stage_label="Green / Immature (Simulated Demonstration Scenario)",
                visual_confidence="medium",
                is_simulated=True,
                ai_provider="demo_scenario",
                observation_notes="Observation supplied by selected demo scenario 'Green tomato'. Not inferred from uploaded photo pixels."
            )
        elif scenario == "uncertain":
            return VisualObservation(
                photo_uploaded=photo_uploaded,
                filename=filename,
                file_size_kb=file_size_kb,
                content_type=content_type,
                maturity_stage="uncertain",
                stage_label="Uncertain / Ambiguous (Simulated Demonstration Scenario)",
                visual_confidence="low",
                is_simulated=True,
                ai_provider="demo_scenario",
                observation_notes="Simulated low-confidence scenario representing visual obstruction, glare, or atypical cultivar."
            )
        else:
            # Honest fallback when no demo scenario is active and no Gemini key
            notes = (
                "Photo received. Connect a Gemini API Key in the UI/backend to enable real-time multimodal AI analysis, "
                "or select a Demo Scenario above to test deterministic agronomic rules."
                if photo_uploaded else
                "No photo uploaded. Select a Demo Scenario above to evaluate downstream agronomic rules."
            )
            return VisualObservation(
                photo_uploaded=photo_uploaded,
                filename=filename,
                file_size_kb=file_size_kb,
                content_type=content_type,
                maturity_stage="unavailable",
                stage_label="Visual analysis unavailable",
                visual_confidence="none",
                is_simulated=False,
                ai_provider=None,
                observation_notes=notes
            )

    @classmethod
    async def _analyze_with_gemini(
        cls,
        image_bytes: bytes,
        mime_type: str,
        api_key: str,
        filename: Optional[str],
        sensor_data: Optional[SensorReading] = None,
        weather_data: Optional[WeatherSummary] = None,
        soil_condition: Optional[str] = None,
        crop: Optional[str] = "tomato"
    ) -> Optional[VisualObservation]:
        """
        Calls Gemini 2.5 Flash multimodal vision API to fuse the visual image
        WITH real environmental hardware telemetry (temp, humidity, ultrasonic distance)
        and local weather forecasts.
        """
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=api_key)

            # Build rich environmental context block
            sensor_text = "Not available"
            if sensor_data:
                sensor_text = (
                    f"- Ambient Air Temperature: {sensor_data.air_temperature_c}°C (SHT30 sensor)\n"
                    f"- Ambient Air Relative Humidity: {sensor_data.air_relative_humidity_pct}% (SHT30 sensor)\n"
                    f"- Ultrasonic Distance to Canopy/Surface: {sensor_data.ultrasonic_distance_cm} cm (RCWL-1601 sensor)\n"
                    f"- Estimated Canopy Height Proxy: {sensor_data.canopy_height_proxy_cm} cm\n"
                    f"- Telemetry Status: {sensor_data.status} (Source: {sensor_data.source})"
                )

            weather_text = "Not available"
            if weather_data:
                weather_text = (
                    f"- Location: {weather_data.location_name}\n"
                    f"- Regional 2m Temp: {weather_data.temperature_c}°C, Relative Humidity: {weather_data.relative_humidity_pct}%\n"
                    f"- Precipitation Past 24h: {weather_data.rain_last_24h_mm} mm\n"
                    f"- Precipitation Forecast Next 24h: {weather_data.rain_next_24h_mm} mm\n"
                    f"- Weather Condition: {weather_data.weather_description}"
                )

            soil_text = soil_condition.replace('_', ' ') if soil_condition else "Unknown / not checked"

            prompt = f"""
You are an expert agronomic scientist and multimodal AI assistant for the FolLand smart agriculture platform.

You are evaluating a live agricultural/plant observation combining BOTH:
1. The uploaded camera image
2. Live hardware sensor telemetry from our Arduino METRO 328:
{sensor_text}

3. Regional weather data from Open-Meteo:
{weather_text}

4. User physical soil inspection at 5cm depth: {soil_text}
5. Target crop/plant category: {crop}

Analyze the image IN CONTEXT of these sensor measurements and weather forecast.
Pay SPECIAL ATTENTION to:
1. Foliage/leaf color: Analyze whether leaves are deep vibrant green, pale light green, yellowing/chlorotic, brown-tipped, necrotic, or purple-tinged.
2. Foliage/leaf turgor & condition: Analyze whether leaves are firm and erect, curled, spotted, or wilting.
3. Fruit maturity (if fruit present): Assess color break and ripeness stage.

Return a STRICT JSON object with the following fields:
{{
  "plant_identified": "<identified plant or crop name, e.g. Tomato, Pine, Ficus, Succulent, Boxwood, Pepper, etc.>",
  "is_tomato_or_fruit": <true or false>,
  "maturity_stage": "<one of: 'red', 'turning', 'green', 'uncertain', 'not_applicable'>",
  "stage_label": "<short descriptive title, e.g. 'Red / Ripe Fruit Detected' or 'Vegetative Foliage'>",
  "leaf_color": "<specific observed foliage color, e.g. 'Deep healthy green', 'Pale yellow chlorosis on lower leaves', 'Brown necrotic margins', or 'Mottled green'>",
  "leaf_symptoms": "<one of: 'none', 'yellowing', 'browning_spots', 'wilting'>",
  "leaf_condition_summary": "<1-2 sentences strictly analyzing the condition, health, turgor, and color of the foliage>",
  "visual_confidence": "<one of: 'high', 'medium', 'low'>",
  "multimodal_synthesis": "<2-3 sentences synthesizing how the visual leaf color/condition, ambient air temp ({sensor_data.air_temperature_c if sensor_data else 'N/A'}°C), air RH ({sensor_data.air_relative_humidity_pct if sensor_data else 'N/A'}%), and ultrasonic distance ({sensor_data.ultrasonic_distance_cm if sensor_data else 'N/A'} cm) correlate with plant growth and stress>",
  "detailed_description": "<concise 1-2 sentence description of visible colors, textures, and anomalies without hallucinating unseen traits>"
}}

Strict scientific guardrails:
1. If fruit is predominantly red/orange-red: maturity_stage = 'red'.
2. If fruit shows breaker/turning blush: maturity_stage = 'turning'.
3. If fruit is fully green: maturity_stage = 'green'.
4. If image is foliage only: maturity_stage = 'not_applicable'.
5. If leaves show yellowing/chlorosis: leaf_symptoms = 'yellowing'.
6. If leaves show necrotic spots or brown edges: leaf_symptoms = 'browning_spots'.
7. If leaves appear droopy/limp: leaf_symptoms = 'wilting'.
8. If leaves are healthy green with normal turgor: leaf_symptoms = 'none'.
9. CRITICAL: Remember that air relative humidity is NOT soil moisture. Do not claim soil is wet just because air RH is high.
10. Do not claim elemental soil nutrient values (N, P, K) without a soil lab assay.
"""

            # Standardize mime_type
            if "heic" in mime_type.lower() or (filename and filename.lower().endswith(".heic")):
                effective_mime = "image/jpeg"
            else:
                effective_mime = mime_type if mime_type.startswith("image/") else "image/jpeg"

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=effective_mime,
                    ),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )

            if response and response.text:
                parsed = json.loads(response.text)
                stage_raw = parsed.get("maturity_stage", "uncertain").lower()
                if stage_raw not in ["red", "turning", "green", "uncertain"]:
                    stage = "uncertain"
                else:
                    stage = stage_raw

                confidence_raw = parsed.get("visual_confidence", "medium").lower()
                confidence = confidence_raw if confidence_raw in ["high", "medium", "low"] else "medium"

                leaf_symp_raw = parsed.get("leaf_symptoms", "none").lower()
                if leaf_symp_raw not in ["none", "yellowing", "browning_spots", "wilting"]:
                    leaf_symp_raw = "none"

                return VisualObservation(
                    photo_uploaded=True,
                    filename=filename,
                    file_size_kb=round(len(image_bytes) / 1024.0, 1),
                    content_type=mime_type,
                    maturity_stage=stage,
                    stage_label=f"Gemini Vision: {parsed.get('stage_label', parsed.get('plant_identified', 'Analyzed'))}",
                    visual_confidence=confidence,
                    is_simulated=False,
                    ai_provider="gemini-2.5-flash",
                    detected_plant=parsed.get("plant_identified"),
                    detected_leaf_color=parsed.get("leaf_color"),
                    detected_leaf_symptoms=leaf_symp_raw,
                    leaf_condition_summary=parsed.get("leaf_condition_summary"),
                    ai_multimodal_synthesis=parsed.get("multimodal_synthesis"),
                    observation_notes=parsed.get("detailed_description", "Analyzed via Gemini 2.5 Flash Multimodal Vision with live telemetry fusion.")
                )
        except Exception as e:
            # Do not log provider errors: they may contain credentials or request data.
            return None
