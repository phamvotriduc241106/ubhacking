# Architecture and known limitations

## Analysis flow

1. The React app submits a photo, soil observation, optional manual air values and optional coordinates to FastAPI.
2. The backend checks image size and format, normalizes orientation, and runs the locally cached pretrained detector and per-fruit ripeness classifier. A second model checks rotten classifications.
3. If a server-side key is configured, Gemini independently returns structured visual observations. Otherwise it is unavailable. Conflicts, low confidence, missing Gemini verification, mixed stages and possible rot cause harvest abstention.
4. Deterministic rules produce harvest, watering and fertilizer cards. A separate Gemini call writes a report from structured evidence; if it fails or is not configured, a deterministic report is returned. The UI shows the report, detections and cards.

Model weights are loaded lazily once per process. See [model validation](model-validation.md) for results, reproducibility and licensing.

## Environmental data

Sensors default to simulated readings. `FOLLAND_SERIAL_PORT` enables a 115200-baud METRO JSON reader; data older than 10 seconds becomes unavailable. Manual air readings are labeled user-reported and have no distance or canopy height. This serial path has not been tested on physical hardware. The starter firmware is in the [original proposal](mvp-proposal.md).

Open-Meteo uses a labeled sample fallback on error. Rolling 24-hour precipitation is unavailable rather than inferred from daily totals. The dashboard's selected coordinates are included in analysis requests.

## Known limitations

- Maturity and quality models from the Mendeley dataset, greenhouse analysis, and NASA MODIS are unavailable. No source has been substituted for them.
- Gemini's generated report is not guaranteed factual. Read the structured evidence and deterministic cards; there is no validation that generated prose preserves every rule.
- Model scores are uncalibrated and the model has not been validated on farm photos or for food safety. Field images may differ substantially from its training data.
- Live Gemini, real hardware, and a full real-world end-to-end workflow have not been verified. Tests use mocked external services except for the opt-in local model test.
- The development setup uses HTTP and has no authentication. It is intended for a trusted local network, not public deployment.
- HEIC decoding depends on installed image support; JPEG/PNG is recommended.

## API

`GET /api/health`, `GET /api/sensors/latest`, `GET /api/weather`, and `POST /api/analyze`. Interactive schemas are available at `/docs` on the backend. Vite proxies `/api` to the backend; set `VITE_BACKEND_URL` to change its target for local development.
