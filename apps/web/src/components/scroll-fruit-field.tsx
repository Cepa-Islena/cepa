"use client";

import { useEffect, useState } from "react";

type FruitActor = {
  id: string;
  src: string;
  label: string;
  /** horizontal placement inside the page rail */
  x: string;
  /** document-depth anchor, 0-1 of page height for sticky-ish feel */
  depth: number;
  size: number;
  rotate: number;
};

const FRUIT_ACTORS: FruitActor[] = [
  { id: "parcha", src: "/brand/product-parcha.png", label: "Parcha", x: "3%", depth: 0.08, size: 118, rotate: -8 },
  { id: "acerola", src: "/brand/product-acerola.png", label: "Acerola", x: "88%", depth: 0.14, size: 104, rotate: 10 },
  { id: "pina", src: "/brand/product-pina.png", label: "Piña", x: "5%", depth: 0.28, size: 120, rotate: 6 },
  { id: "tamarindo", src: "/brand/product-tamarindo.png", label: "Tamarindo", x: "86%", depth: 0.4, size: 108, rotate: -12 },
  { id: "jengibre", src: "/brand/product-jengibre.png", label: "Jengibre", x: "4%", depth: 0.55, size: 96, rotate: 14 },
  { id: "vasito", src: "/brand/product-vasito.png", label: "Corillo pack", x: "87%", depth: 0.66, size: 112, rotate: -6 },
  { id: "kale", src: "/brand/product-kale.png", label: "Greens", x: "7%", depth: 0.8, size: 94, rotate: 8 },
  { id: "hoja", src: "/brand/logo-hoja.png", label: "Hoja", x: "84%", depth: 0.9, size: 80, rotate: -18 },
];

/**
 * Fruit characters that spawn while scrolling.
 * Always shows the first two immediately so the effect is obvious without waiting.
 */
export function ScrollFruitField() {
  const [spawnLevel, setSpawnLevel] = useState(2);
  const [pageHeight, setPageHeight] = useState(2400);

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      setPageHeight(Math.max(document.documentElement.scrollHeight, window.innerHeight * 2));
    };

    const update = () => {
      frame = 0;
      measure();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      // Start at 2 fruits, unlock the rest as you scroll
      const nextLevel = Math.min(FRUIT_ACTORS.length, 2 + Math.floor(progress * (FRUIT_ACTORS.length - 1)));
      setSpawnLevel((current) => Math.max(current, nextLevel));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    // Catch late layout growth (images, fonts)
    const timers = [200, 800, 1600].map((ms) => window.setTimeout(update, ms));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="fruit-field" aria-hidden="true" style={{ height: pageHeight }}>
      {FRUIT_ACTORS.map((actor, index) => {
        const visible = index < spawnLevel;
        return (
          <figure
            key={actor.id}
            className={`fruit-actor ${visible ? "is-spawned" : ""}`}
            style={{
              left: actor.x,
              top: `${actor.depth * 100}%`,
              width: actor.size,
              ["--actor-rotate" as string]: `${actor.rotate}deg`,
            }}
          >
            <img src={actor.src} alt="" draggable={false} />
            <figcaption>{actor.label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
