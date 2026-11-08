/** Clears this app's saved browser settings. Safe when storage is blocked. */
export function resetSavedSettings() {
  try {
    window.localStorage.removeItem("folland-settings");
  } catch {
    /* storage blocked: nothing saved to clear */
  }
}
