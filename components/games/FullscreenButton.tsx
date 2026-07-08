"use client";

import { useEffect, useState, type RefObject } from "react";

// Generic Fullscreen API toggle for a game's map/globe container — the
// browser natively resizes the target element to fill the viewport, and
// GlobeView/MapView already resize themselves via ResizeObserver, so no
// extra plumbing is needed on the caller's side beyond passing the ref.
export function FullscreenButton({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [targetRef]);

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      targetRef.current?.requestFullscreen();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-3 top-3 z-10 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-muted"
    >
      {isFullscreen ? "Exit full screen" : "Full screen"}
    </button>
  );
}
