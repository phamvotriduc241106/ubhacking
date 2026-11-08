# FolLand 3D interface (Farm Digital Twin)

The initial 3D interface was adapted from [munibraza/ubhackingai26](https://github.com/munibraza/ubhackingai26), including local UI updates, and connected to FolLand’s backend.

A futuristic 3D smart-agriculture web application for FolLand: an interactive tomato-farm digital twin, IoT sensor dashboard, photo-based crop analysis, weather intelligence, a 3D growth timeline and configurable smart alerts.

Built with Next.js 15 (App Router), React 19, TypeScript, Three.js + React Three Fiber + drei, Tailwind CSS, shadcn/ui-style components (Radix), Framer Motion, Recharts and Lucide.

## Run it

Requirements: Node.js 20 or newer (22 LTS recommended).

**One command (recommended).** Installs dependencies if needed, rebuilds only when the code changed, picks a free port and starts the fast production server:

| System | Command |
|---|---|
| Windows | double-click `start.bat` (or run `npm run serve` in PowerShell) |
| macOS / Linux | `./start.sh` (or `npm run serve`) |

It prints the local address (`http://localhost:3000`) and the address to open on a phone on the same Wi-Fi. Options: `--port 4000`, `--rebuild`, and `--dev` for the hot-reloading development server (`start-dev.bat` on Windows).

**Manual commands:**

```bash
cd agrivision
npm ci
npm run dev        # development, Turbopack (fast compile, hot reload)
npm run preview    # production build + start (fastest at runtime)
```

`npm run dev:webpack` is kept as a fallback if Turbopack ever misbehaves.

To point the app at a backend on another port, set `FOLLAND_API_URL` **before building** (Next.js bakes proxy rules into the build; `npm run serve` rebuilds automatically when this value changes):

```bash
FOLLAND_API_URL=http://127.0.0.1:8001 npm run serve
```

On Windows PowerShell: `$env:FOLLAND_API_URL="http://127.0.0.1:8001"; npm run serve`.

The app works on its own in **Demo Mode**. No hardware, API key or backend is needed.

### Optional: connect the FolLand backend (AI photo analysis)

In a second terminal, from the repository root:

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: py -m venv .venv; .venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

The Next.js app proxies `/api/folland/*` to `http://127.0.0.1:8000/api/*` (override with `FOLLAND_API_URL`). With the backend running, photo analysis returns local model results and the backend report. Gemini runs only if a valid server-side `GEMINI_API_KEY` is configured; otherwise the backend returns an explicitly labeled deterministic report. The separately selectable demo uses a labeled in-browser color heuristic.

## Pages

| Route | What it does |
|---|---|
| `/` | Cinematic 3D hero farm with hotspots, live stats, weather switcher, feature overview |
| `/farm` | Digital twin: click plants and sensors, select zones, health overlay, sunny/cloudy/rainy |
| `/dashboard` | Sensor cards with trends, interactive chart, Demo / Integration data source |
| `/analysis` | Photo upload and preview, AI or demo analysis, condition/ripeness/environment panels |
| `/weather` | Open-Meteo history and forecast, rainfall, humidity, growing degree days, alerts |
| `/growth` | Procedural 3D tomato from seedling to harvest with a timeline slider |
| `/alerts` | Recommendations fused from sensors, weather and camera, with editable thresholds |

## Data honesty

- **Demo Mode** simulates readings in the browser (diurnal model plus the selected weather). They are labeled "Demo data".
- **Integration Mode** polls any JSON endpoint (see the payload on the dashboard). Readings are labeled live only if the payload says `"live": true` or `"data_mode": "live"`. Nothing is filled in with simulated values when the endpoint is down.
- **Weather** comes from Open-Meteo when reachable, otherwise from a labeled simulation.
- **Photo results** are labeled AI only when a connected model analyzed the image. Plant-level conditions in the digital twin are modeled from zone readings and a demo scouting log.

## Structure

```
src/
  app/            routes (one folder per page), layout, page transition template
  components/
    three/        3D: procedural plant geometry, instanced plant field, environment, farm, growth scene
    ui/           shadcn/ui-style primitives (button, card, slider, switch, tabs, sheet, tooltip…)
    layout/ sections/ dashboard/ farm/ analysis/ weather/ growth/ alerts/ charts/ shared/
  hooks/          quality tier, weather loading, alerts, plant states, animated numbers
  lib/            types, simulation, farm layout, recommendation rules, weather, analysis, store
```

## Performance

Rendering:

- **Instancing everywhere.** Plants, leaves, fruit, grass, trees, clouds and rain are instanced, so the 48-plant farm draws in a handful of calls.
- **GPU animation.** Wind sway, cloud drift and rainfall run in vertex shaders. Instance buffers are uploaded once; per frame the CPU writes only a few uniforms. Shadows use matching depth shaders, so they sway with the leaves.
- **Cheaper shadows.** The shadow map refreshes every other frame (the sun and clouds move slowly), objects outside the shadow area don't cast, and the growth scene's contact shadow redraws only when the plant changes.
- **No first-frame stall.** Shaders are compiled asynchronously (`compileAsync`) before the loading screen fades.
- **Stable memory.** Geometry and textures are built once per session and shared between scenes. The growth slider reuses instance buffers instead of remounting meshes. No objects are allocated per frame.
- **Fewer re-renders.** Scene parts are memoized, so the sensor feed (one reading every few seconds) doesn't re-render plants, ground or sky.
- **Adaptive.** Scenes pause off screen, lower the pixel ratio when frame rate drops, and use a lite tier on small or low-power devices. Browsers without WebGL get a static illustration. The tier can be forced on the Smart Farm page.

Loading:

- Recharts loads as a separate chunk after the page paints, and the trend sparklines are plain SVG. This cut first-load JavaScript by about 40% on Home, Dashboard and Weather.
- The 3D chunks are prefetched when the browser is idle and on hover over the Smart Farm and Growth links.
- `npm run dev` uses Turbopack, roughly 2× faster for the first compile and about 5× faster for each later page than webpack dev.

Reliability:

- A crash inside a 3D scene shows the static preview with a **Retry** button instead of breaking the page.
- A lost WebGL context (GPU reset, sleep, too many tabs) remounts the scene automatically.
- `npm run serve` checks the Node version, repairs missing dependencies, avoids port conflicts and skips unnecessary rebuilds.
