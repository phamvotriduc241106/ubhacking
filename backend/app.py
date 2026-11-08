import uuid
import asyncio
import os
import time
from collections import defaultdict, deque
from pathlib import Path
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from io import BytesIO
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import HTTPException
from backend.models import DetectorResult, VisualObservation, EvidenceItem
from backend.services.tomato_detector import infer_image
from backend.services.gemini_service import observe
from backend.services.report_generator import generate
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from backend.models import (
    SensorReading,
    WeatherSummary,
    AnalysisResponse,
)
from backend.services.sensor_service import SensorService
from backend.services.weather_service import WeatherService
from backend.services.image_analysis import ImageAnalysisService
from backend.services.decision_engine import DecisionEngine

app = FastAPI(
    title="FolLand API",
    description="Multimodal Smart Agriculture Decision Support Assistant API",
    version="1.0.0"
)

# Allow CORS for development and mobile network testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("FOLLAND_CORS_ORIGINS", "").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Best-effort process-local throttle. A public multi-worker deployment also needs
# an edge/distributed limiter and authentication; proxy headers are not trusted.
_request_times = defaultdict(deque)
@app.middleware("http")
async def request_limits(request: Request, call_next):
    if request.url.path == '/api/analyze' and request.method == 'POST':
        length = request.headers.get('content-length')
        if length:
            try:
                if int(length) > 16 * 1024 * 1024:
                    return JSONResponse({'detail': 'Request is too large.'}, status_code=413)
            except ValueError:
                return JSONResponse({'detail': 'Invalid content length.'}, status_code=400)
        now = time.monotonic()
        # Keep memory bounded even if many client addresses are seen.
        for identity in list(_request_times):
            q = _request_times[identity]
            while q and q[0] <= now - 60:
                q.popleft()
            if not q:
                del _request_times[identity]
        identity = request.client.host if request.client else 'unknown'
        if identity not in _request_times and len(_request_times) >= 10000:
            return JSONResponse({'detail': 'Service is busy. Try again later.'}, status_code=429)
        q = _request_times[identity]
        if len(q) >= 60:
            return JSONResponse({'detail': 'Too many requests. Try again later.'}, status_code=429, headers={'Retry-After': '60'})
        q.append(now)
    return await call_next(request)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "FolLand",
        "version": "1.0.0",
        "sensor_mode": SensorService.get_latest_reading().data_mode,
        "supported_crops": ["tomato"],
        "hardware_target": "Adafruit METRO 328 (CP2104 USB-Serial)"
    }


@app.get("/api/sensors/latest", response_model=SensorReading)
async def get_latest_sensors(disconnected: bool = Query(False, description="Simulate disconnected sensor")):
    return SensorService.get_latest_reading(simulate_disconnected=disconnected)


@app.get("/api/weather", response_model=WeatherSummary)
async def get_weather(
    latitude: Optional[float] = Query(None, description="Latitude"),
    longitude: Optional[float] = Query(None, description="Longitude"),
    location_name: Optional[str] = Query(None, description="Name of location")
):
    return await WeatherService.get_weather(
        latitude=latitude,
        longitude=longitude,
        location_name=location_name
    )


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_plant(
    image: Optional[UploadFile] = File(None),
    crop: str = Form("tomato"),
    variety: Optional[str] = Form(None),
    harvest_goal: str = Form("eat_now"),
    soil_condition: str = Form("unknown"),
    leaf_symptoms: Optional[str] = Form("none"),
    demo_scenario: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None, ge=-90, le=90),
    longitude: Optional[float] = Form(None, ge=-180, le=180),
    manual_temperature_c: Optional[float] = Form(None, ge=-40, le=85),
    manual_humidity_pct: Optional[float] = Form(None, ge=0, le=100),
    manual_distance_cm: Optional[float] = Form(None, ge=2, le=450)
):
    if crop.lower() != 'tomato':
        raise HTTPException(status_code=422, detail='Only tomato is supported.')
    if (latitude is None) != (longitude is None):
        raise HTTPException(status_code=422, detail='Provide both latitude and longitude.')
    # 1. Get latest sensor telemetry (simulated or live hardware feed)
    sensor_data = SensorService.get_latest_reading()
    if manual_temperature_c is not None or manual_humidity_pct is not None or manual_distance_cm is not None:
        sensor_data = SensorReading(source='user_reported', data_mode='manual', air_temperature_c=manual_temperature_c,
            air_relative_humidity_pct=manual_humidity_pct, ultrasonic_distance_cm=manual_distance_cm, canopy_height_proxy_cm=None,
            notes='User-reported air measurements; timestamp is the submission time.')

    # 2. Get local weather information
    weather_data = await WeatherService.get_weather(
        latitude=latitude,
        longitude=longitude
    )

    # 3. The demo path remains explicit; real images run detector and Gemini independently.
    detector = DetectorResult(status='not_run', message='No real image inference was run.')
    observation = None
    vision_status = 'not_run'
    disagreement = None
    if demo_scenario and demo_scenario not in ('auto', ''):
        visual_obs = await ImageAnalysisService.process_upload(file=image, demo_scenario=demo_scenario)
    elif image and image.filename:
        if image.content_type and not (image.content_type.startswith('image/') or image.content_type == 'application/octet-stream'):
            raise HTTPException(status_code=400, detail='Unsupported file format. Please upload an image.')
        image_bytes = await image.read(15 * 1024 * 1024 + 1)
        if len(image_bytes) > 15 * 1024 * 1024:
            raise HTTPException(status_code=400, detail='Image exceeds 15 MB.')
        try:
            with Image.open(BytesIO(image_bytes)) as original:
                if original.width * original.height > 25_000_000:
                    raise ValueError('Image exceeds 25 megapixels.')
                normalized = ImageOps.exif_transpose(original).convert('RGB')
                output = BytesIO()
                normalized.save(output, format='JPEG', quality=90)
                image_bytes = output.getvalue()
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
            raise HTTPException(status_code=400, detail='Unable to read image. Use a JPEG or PNG under 25 megapixels.')
        try:
            detector = DetectorResult.model_validate(await asyncio.to_thread(infer_image, image_bytes))
        except Exception:
            detector = DetectorResult(status='error', message='Tomato detector failed; no model prediction is available.')
        observation, vision_status = await observe(image_bytes, 'image/jpeg', {'crop': crop, 'soil_condition': soil_condition, 'sensor': sensor_data.model_dump()})
        if observation and observation.tomato_visible is False and detector.detections:
            disagreement = 'Gemini did not identify a tomato, but the detector found candidate fruit.'
        elif observation and observation.tomato_visible is True and detector.status == 'ok' and not detector.detections:
            disagreement = 'Gemini identified a tomato, but the detector found no fruit.'
        stage = 'uncertain'
        labels = {d.label for d in detector.detections}
        if observation and observation.maturity_stage != 'uncertain' and labels and observation.maturity_stage not in labels:
            disagreement = 'Gemini and the ripeness classifier gave different observations.'
        if detector.status == 'ok' and detector.detections and observation and observation.tomato_visible is True and not disagreement and not any(d.uncertain for d in detector.detections) and len(labels) == 1:
            stage = {'raw':'green', 'half_ripe':'turning', 'ripe':'red', 'rotten':'uncertain'}[next(iter(labels))]
        visual_obs = VisualObservation(photo_uploaded=True, filename=image.filename, content_type=image.content_type,
            file_size_kb=round(len(image_bytes)/1024,1), maturity_stage=stage,
            stage_label='Review detected fruit' if detector.detections else 'Tomato detection unavailable or no fruit detected',
            visual_confidence='low', is_simulated=False, ai_provider='gemini-2.5-flash' if observation else None,
            detected_leaf_symptoms=observation.leaf_symptoms if observation and observation.leaf_symptoms != 'unknown' else None,
            leaf_condition_summary=observation.leaf_description if observation else None,
            observation_notes=observation.fruit_description if observation else 'Gemini visual observation unavailable; review the model result and photo manually.')
    else:
        visual_obs = await ImageAnalysisService.process_upload(file=image, demo_scenario=demo_scenario)

    # If Gemini analyzed the image, its automated foliage detection takes precedence over manual user selection
    effective_leaf_symptoms = leaf_symptoms
    leaf_symptoms_source = "user"
    if visual_obs.ai_provider == "gemini-2.5-flash" and visual_obs.detected_leaf_symptoms:
        effective_leaf_symptoms = visual_obs.detected_leaf_symptoms
        leaf_symptoms_source = "simulated" if visual_obs.is_simulated else "ai"
    elif (not leaf_symptoms or leaf_symptoms == "none") and visual_obs.detected_leaf_symptoms:
        effective_leaf_symptoms = visual_obs.detected_leaf_symptoms
        leaf_symptoms_source = "simulated" if visual_obs.is_simulated else "ai"

    # If Gemini identified the plant, enrich variety or crop context if not set
    effective_variety = variety
    if not effective_variety and visual_obs.detected_plant:
        effective_variety = visual_obs.detected_plant

    # 4. Run deterministic decision engine
    decision_results = DecisionEngine.evaluate(
        crop=crop,
        variety=effective_variety,
        harvest_goal=harvest_goal,
        soil_condition=soil_condition,
        leaf_symptoms=effective_leaf_symptoms,
        visual=visual_obs,
        sensors=sensor_data,
        weather=weather_data,
        leaf_symptoms_source=leaf_symptoms_source,
    )

    if detector.status == 'ok' and detector.detections:
        card = decision_results['harvest']
        evidence = [EvidenceItem(type='PREDICTED', label='Local tomato classifier', detail=f"{len(detector.detections)} candidate fruit; model scores are uncalibrated.")] + card.evidence
        decision_results['harvest'] = card.model_copy(update={'evidence': evidence})
    # Never convert an uncertain, absent, conflicting, mixed, or rotten prediction into a harvest-ready decision.
    if detector.status != 'not_run':
        rotten = any(d.label == 'rotten' or d.raw_label == 'rotten' for d in detector.detections)
        if rotten or disagreement or not detector.detections or visual_obs.maturity_stage == 'uncertain':
            card = decision_results['harvest']
            reason = ('Possible spoiled fruit or disagreement in rotten checks; isolate and inspect it. Do not assume it is suitable for consumption.' if rotten else 'A reliable harvest decision is unavailable. Inspect the fruit and retake a clear photo if needed.')
            decision_results['harvest'] = card.model_copy(update={'status':'inspect_manually', 'title':'Inspect fruit manually', 'recommendation':reason, 'next_action':'Check fruit condition, firmness, variety, and ripeness before harvesting.', 'limitations':['Model scores are not calibrated for field use.', 'A photo cannot establish food safety or internal quality.']})
        elif visual_obs.maturity_stage in ('red', 'turning', 'green'):
            card = decision_results['harvest']
            decision_results['harvest'] = card.model_copy(update={'limitations':['Model predictions are not calibrated for this growing environment.', 'Color alone does not establish ripeness or food safety.']})
    report = await generate(visual_obs, detector, observation, sensor_data, weather_data, decision_results, disagreement)

    response = AnalysisResponse(
        analysis_id=f"folland-{uuid.uuid4().hex[:8]}",
        crop=crop,
        variety=variety,
        harvest_goal=harvest_goal,
        soil_condition=soil_condition,
        leaf_symptoms=leaf_symptoms,
        visual_observations=visual_obs,
        sensor_data=sensor_data,
        weather_data=weather_data,
        harvest=decision_results["harvest"],
        watering=decision_results["watering"],
        fertilizer=decision_results["fertilizer"],
        data_sources={"ripeness_model": detector.status, "gemini_vision": vision_status, "maturity_quality_model": "unavailable", "greenhouse": "unavailable", "nasa_vegetation": "unavailable"},
        detector=detector, gemini_observation=observation, disagreement=disagreement, report=report,
        scientific_summary=decision_results["scientific_summary"]
    )

    return response


# Single-origin deployments can serve the already-built Vite frontend from FastAPI.
frontend_dist = Path(__file__).resolve().parents[1] / 'frontend' / 'dist'
if os.getenv('FOLLAND_SERVE_FRONTEND') == '1' and (frontend_dist / 'index.html').is_file():
    app.mount('/', StaticFiles(directory=frontend_dist, html=True), name='frontend')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
