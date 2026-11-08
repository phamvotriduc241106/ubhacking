/**
 * AbortSignal that aborts after `ms`. AbortSignal.timeout() is missing in Safari < 16 and
 * older Chromium-based browsers; calling it there throws and breaks the caller.
 */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") return AbortSignal.timeout(ms);
  const controller = new AbortController();
  setTimeout(() => controller.abort(new DOMException("The operation timed out.", "TimeoutError")), ms);
  return controller.signal;
}
