export interface GrowthStage {
  key: string;
  name: string;
  days: string;
  summary: string;
  temperature: string;
  humidity: string;
  light: string;
  water: string;
  nutrients: string;
  watchFor: string;
}

/**
 * Typical ranges for field or greenhouse tomatoes. They vary by variety, climate and
 * growing system; treat them as orientation, not prescriptions.
 */
export const GROWTH_STAGES: GrowthStage[] = [
  {
    key: "seedling",
    name: "Seedling",
    days: "Days 0–21",
    summary: "The seed germinates, cotyledons open and the first true leaves appear. Roots are shallow and fragile.",
    temperature: "Germination 21–27 °C soil; seedlings 18–24 °C day",
    humidity: "60–75% RH; avoid a constantly wet surface",
    light: "14–16 h of bright light; weak light causes leggy stems",
    water: "Keep the medium evenly moist, never waterlogged",
    nutrients: "Little needed; dilute feed after true leaves",
    watchFor: "Damping-off, stretching, cold soil",
  },
  {
    key: "vegetative",
    name: "Vegetative Growth",
    days: "Days 21–45",
    summary: "Rapid stem and leaf growth builds the canopy that will power fruit production. Plants are staked or caged.",
    temperature: "21–27 °C day, 15–18 °C night",
    humidity: "60–70% RH",
    light: "Full sun, 8+ hours direct",
    water: "Deep, regular watering; let the surface dry slightly",
    nutrients: "Balanced feed; avoid excess nitrogen",
    watchFor: "Aphids, leaf yellowing, uneven watering",
  },
  {
    key: "flowering",
    name: "Flowering",
    days: "Days 45–60",
    summary: "Yellow flower clusters (trusses) form. Pollination is mostly by wind and vibration; temperature strongly affects fruit set.",
    temperature: "Fruit set is best at 18–29 °C day; poor above ~32 °C or below ~13 °C night",
    humidity: "50–70% RH; very high or very low humidity reduces pollen release",
    light: "Full sun",
    water: "Consistent moisture; stress causes flower drop",
    nutrients: "Shift toward potassium and phosphorus",
    watchFor: "Blossom drop in heat waves",
  },
  {
    key: "fruit",
    name: "Fruit Development",
    days: "Days 60–80",
    summary: "Fertilized flowers swell into green fruit. Cell division then expansion drive size; calcium uptake depends on steady watering.",
    temperature: "18–29 °C",
    humidity: "60–70% RH",
    light: "Full sun",
    water: "Steady and deep; irregular watering can cause blossom-end rot and cracking",
    nutrients: "Potassium and calcium matter most",
    watchFor: "Blossom-end rot, early blight, hornworms",
  },
  {
    key: "ripening",
    name: "Ripening",
    days: "Days 80–95",
    summary: "Chlorophyll breaks down and red lycopene builds. Fruit moves from green through breaker and turning to red.",
    temperature: "20–25 °C ideal; red color develops poorly above ~30 °C",
    humidity: "60–70% RH",
    light: "Light is not required on the fruit itself; leaf cover limits sunscald",
    water: "Slightly reduce to concentrate flavor; avoid sudden heavy watering",
    nutrients: "Maintain potassium",
    watchFor: "Cracking after rain, sunscald, late blight in wet weather",
  },
  {
    key: "harvest",
    name: "Harvest",
    days: "Day 95+",
    summary: "Pick at breaker stage to ripen indoors, or fully red for eating fresh. Indeterminate plants keep producing until frost.",
    temperature: "Harvested fruit keeps best at 13–21 °C; avoid refrigeration before fully ripe",
    humidity: "85–90% RH for storage",
    light: "Store out of direct sun",
    water: "Continue regular watering for later trusses",
    nutrients: "Light side dressing for long-season plants",
    watchFor: "Overripe fruit attracting pests, frost",
  },
];
