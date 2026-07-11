"use client";

import { useEffect, useState } from "react";

/**
 * Returns how far the page has scrolled (0-1 of document height)
 * and a stepped "spawn level" used to reveal fruit characters.
 */
export function useScrollSpawn(maxSpawns = 8) {
  const [progress, setProgress] = useState(0);
  const [spawnLevel, setSpawnLevel] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(
        1,
        (document.documentElement.scrollHeight || 1) - window.innerHeight,
      );
      const nextProgress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      const nextLevel = Math.min(maxSpawns, Math.floor(nextProgress * maxSpawns + 0.15));

      setProgress(nextProgress);
      setSpawnLevel((current) => Math.max(current, nextLevel));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [maxSpawns]);

  return { progress, spawnLevel };
}
