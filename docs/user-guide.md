# FolLand user guide

FolLand helps you check a tomato plant using a photo, a manual soil check, weather context, and practical guidance. It is a prototype: sensor readings are simulated by default, and recommendations are not a diagnosis or a substitute for a soil test or local expert.

## 1. Open the website

On the computer running FolLand, open the address shown by the frontend server, normally `http://localhost:5173`. If that port is already in use, use the alternate address shown in the terminal. To use a phone on the same Wi-Fi network, open the server's **Network** address on your phone. The computer must remain running and reachable.

The computer setup and start commands are in the [README](../README.md). If the page loads but the weather or plant check does not work, verify that the backend is also running and that the frontend's `/api` proxy points to it.

## 2. Understand the conditions

The three cards near the top show local weather, air temperature, and air humidity. A badge identifies modeled, simulated, or unavailable data. New users default to Petrolina, Brazil; existing saved locations are preserved. If weather cannot be retrieved, it is unavailable. Without a configured USB serial port, sensor values are simulated. With `FOLLAND_SERIAL_PORT` set on the server, compatible METRO serial readings appear as live; stale or disconnected readings appear unavailable.

Air humidity is **not soil moisture**. Optional air temperature and humidity under **More options** are user-reported inputs, not measurements from a connected probe. Use your own soil check for the watering recommendation.

### Change the weather location

1. Open **Change weather location** beneath the conditions cards.
2. Enter latitude from −90 to 90 and longitude from −180 to 180 in decimal degrees.
3. Select **Update**. The selected coordinates are also sent with the next plant check.

Weather is unavailable if the forecast cannot be fetched. Recent 24-hour precipitation is calculated only from 24 available hourly model values, and must not be treated as rainfall measured at your plant. Soil moisture is a modeled surface estimate, not a root-zone sensor reading.

## 3. Check a plant

1. Select **Check my plant** or scroll to **Your plant check**. FolLand currently supports tomato recommendations.
2. Select **Take a photo** to use a camera where your device supports it, or **Choose a photo** to select an existing image. A clear, well-lit close-up of the tomato fruit works best. The size limit is 15 MB. JPEG or PNG is recommended; HEIC compatibility is not verified. Select the × button beside the preview to remove it.
3. Check the soil roughly 2 inches (5 cm) below the surface. Choose **Dry**, **Moist**, **Very wet**, or **I haven't checked**. If unsure, choose **I haven't checked**; the app will suggest checking before deciding on water.
4. Select **See my plant check** and wait for the results.

### Photo analysis setup

The operator downloads the pretrained local model weights using `python scripts/download_models.py`. For Gemini, the operator sets `GEMINI_API_KEY` in the server's root `.env`. Do not enter keys into the website. Without Gemini, FolLand returns local model predictions and a labeled deterministic report, with harvest decisions limited when verification is missing.

When photo analysis is used, the uploaded image and accompanying context are sent to Google Gemini. If there is no key or the external service fails, Gemini observation is unavailable; local model detection can still run when its weights are installed. A photo alone cannot establish soil moisture or nutrient levels.

### Optional details

Open **More options** to enter the tomato variety, choose whether you intend to eat the fruit fresh or store it, and report visible leaf symptoms. The current backend may replace a manually reported leaf symptom with the Gemini observation when Gemini returns one. Treat image observations as tentative and check the plant yourself.

## 4. Read the result

The page shows model detections, an exportable report, and three cards. Predictions and their scores are not validated or calibrated for field conditions.

- **Harvest:** visible maturity stage and a suggested next check. Variety and firmness matter; color alone is not enough.
- **Watering:** advice based primarily on your soil selection. If the soil is unknown, check it before deciding.
- **Fertilizer:** cautious guidance on whether more investigation is needed. FolLand does not measure N, P, or K and cannot reliably identify a deficiency from a picture alone.

Each card shows a suggested next step. Open **Evidence & things to consider** to view the inputs, limitations, and links to the cited sources. Review these before acting, especially if the image is unclear or the plant behaves differently than the card suggests.

## 5. Try the demo without a photo or key

1. Open **More options**.
2. Under **Try a sample instead**, choose a red, turning, green, or uncertain tomato scenario.
3. Choose a soil condition and select **See my plant check**.

The result is explicitly simulated: the chosen scenario determines the visual stage, and an uploaded photo is not analyzed in this mode. Select **Analyze my photo** to return to photo analysis.

## 6. Troubleshooting

| Problem | What to do |
|---|---|
| Page does not open | Check the frontend terminal for its actual local or network address and confirm the server is running. |
| Phone cannot connect | Connect both devices to the same network, use the computer's network address rather than `localhost`, and check the computer firewall. |
| Conditions do not load | Check the backend and frontend proxy. Weather may show a labeled sample when the external service is unavailable. |
| Photo analysis unavailable | Check the Gemini key, internet access, image format, and backend logs. Use JPEG/PNG or the sample mode to continue the demo. |
| I see simulated sensor values | This is expected unless the operator configures `FOLLAND_SERIAL_PORT` and connects a compatible serial feed. |
| The result is uncertain or seems wrong | Retake a clear photo, check the plant and soil manually, and consult a local extension specialist when needed. |

## 7. Related documentation

- [Setup and project map](../README.md)
- [Architecture and known implementation limitations](architecture.md)
- [Original MVP proposal and end-to-end workflow](mvp-proposal.md)
