"use client";

import { RotateCcw, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { resetSavedSettings } from "@/lib/reset-settings";

/**
 * Route-level error screen. Instead of a blank "Application error" page, the visitor can
 * retry, or clear saved settings (the usual cause of an error that repeats on every launch).
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[FolLand] page error:", error);
  }, [error]);

  return (
    <div className="container grid min-h-[70vh] place-items-center pt-24">
      <div className="glass max-w-lg space-y-5 rounded-3xl p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-yellow-500/15 text-yellow-500">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold">This page hit a problem</h1>
        <p className="text-sm text-muted-foreground">
          Your data is safe. Try again first. If the problem repeats, reset this app&apos;s saved settings on this browser.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw /> Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetSavedSettings();
              window.location.reload();
            }}
          >
            <Trash2 /> Reset saved settings and reload
          </Button>
        </div>
        <Link href="/" className="block text-xs text-primary hover:underline">
          Back to home
        </Link>
        {error.digest && <p className="text-[11px] text-muted-foreground">Error reference: {error.digest}</p>}
      </div>
    </div>
  );
}
