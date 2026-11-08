"use client";

import { resetSavedSettings } from "@/lib/reset-settings";

/**
 * Last-resort screen when the root layout itself fails (for example the navigation or
 * providers). Uses inline styles because the app's CSS may not have loaded.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const btn = { padding: "10px 18px", borderRadius: 999, border: "1px solid #34d399", fontSize: 14, cursor: "pointer" } as const;
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#07140d", color: "#f5f1e6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 440, padding: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 12px" }}>FolLand could not start</h1>
          <p style={{ color: "#b9cbb5", fontSize: 14, lineHeight: 1.6 }}>
            Try again. If it keeps happening, reset the saved settings for this app on this browser.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 20 }}>
            <button style={{ ...btn, background: "#34d399", color: "#07140d" }} onClick={() => reset()}>
              Try again
            </button>
            <button
              style={{ ...btn, background: "transparent", color: "#f5f1e6" }}
              onClick={() => {
                resetSavedSettings();
                window.location.reload();
              }}
            >
              Reset saved settings and reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
