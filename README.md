# FolLand

A tomato-growing decision-support prototype combining a mobile photo, simulated environmental sensors, weather, and cited guidance. It produces harvest, watering, and fertilizer advisory cards. It is a hackathon prototype, not a validated agricultural diagnostic system.

## 3D interface

The upgraded Next.js interface is in `agrivision/`, alongside the existing Vite frontend. Start the backend on port 8001, then run:

```bash
cd agrivision
npm ci
FOLLAND_API_URL=http://127.0.0.1:8001 npm run dev -- -p 3001
```

Open `http://localhost:3001`. The 3D views are simulations; real photo results come from the backend. See [3D interface guide](agrivision/README.md).

## Quick start

Requirements: Python 3.10+, Node.js and npm.

```bash
# From the repository root
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python scripts/download_models.py  # downloads pretrained AGPL-3.0 weights
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev -- --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173`. On a phone connected to the same network, use `http://<computer-ip>:5173`. The frontend development server proxies `/api` to the backend at port 8000. Backend API documentation is at `http://localhost:8000/docs`.

Configure `GEMINI_API_KEY` in the root `.env` on the server for Gemini image observations and final reports. The interface never requests an API key. Without a key, local model inference and a labeled deterministic fallback report still work. Images are sent to Google when Gemini is configured. Model downloads and licensing details are in [model validation](docs/model-validation.md).

## Verify

```bash
# From the repository root, with the Python environment active
python -m pytest -q

# Frontend build
cd frontend
npm run build
```

## Project map

| Path | Purpose |
|---|---|
| `backend/app.py` | FastAPI endpoints and analysis orchestration |
| `backend/models.py` | API data models |
| `backend/services/` | Image analysis, simulated sensors, weather, and decision rules |
| `frontend/` | Original React, TypeScript, Vite, and Tailwind interface |
| `agrivision/` | Upgraded Next.js interface with 3D farm and dashboard |
| `knowledge/` | Tomato guidance references used by the decision engine |
| `tests/` | Backend API and decision-engine tests |
| `docs/` | Architecture notes and original MVP proposal |

## Current boundaries

- Sensor readings are simulated unless `FOLLAND_SERIAL_PORT` is configured for a compatible METRO JSON serial feed. Live hardware has not been tested; stale serial data is unavailable. Firmware remains a starter example in the original proposal.
- Weather is unavailable when Open-Meteo cannot be reached. Its modeled values, including surface soil moisture, are not on-farm measurements. Review [known limitations](docs/architecture.md#known-limitations) before relying on weather evidence.
- The pretrained detector/classifier runs locally after weights are downloaded. Gemini requires a server-side key; absent or failed calls use an explicitly labeled fallback. Demo scenarios do not analyze photo pixels.
- Air humidity is not soil moisture. Visual symptoms do not establish nutrient deficiencies.

See the [user guide](docs/user-guide.md), [architecture and known limitations](docs/architecture.md), and the [original MVP proposal and workflow](docs/mvp-proposal.md). The proposal describes intended features and hardware, not proof that they are implemented.

Model setup, held-out classifier results, source licensing, and unimplemented datasets: [model validation](docs/model-validation.md).

See [deployment and troubleshooting](docs/deployment.md) for end-to-end local instructions, request examples, and container deployment limitations.
