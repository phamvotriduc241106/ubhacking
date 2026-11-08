import type { DataOrigin } from "./types";

/** Only use provenance explicitly reported by the backend. */
export function dataOrigin(mode: unknown, live: unknown = false): DataOrigin {
  if (mode === "manual") return "manual";
  if (mode === "simulated") return "backend-simulated";
  if (mode === "unavailable") return "unavailable";
  if (mode === "live" || (mode == null && live === true)) return "live";
  return "unavailable";
}
