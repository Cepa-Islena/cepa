"use client";

import { useEffect, useState } from "react";

type FruitActor = {
  id: string;
  src: string;
  x: string;
  depth: number;
  size: number;
  rotate: number;
};

const FRUIT_ACTORS: FruitActor[] = [
  { id: "parcha", src: "/brand/product-parcha.png", x: "2%", depth: 0.12, size: 88, rotate: -8 },
  { id: "acerola", src: "/brand/product-acerola.png", x: "90%", depth: 0.22, size: 78, rotate: 10 },
  { id: "pina", src: "/brand/product-pina.png", x: "3%", depth: 0.45, size: 86, rotate: 6 },
  { id: "jengibre", src: "/brand/product-jengibre.png", x: "91%", depth: 0.62, size: 74, rotate: -10 },
  { id: "vasito", src: "/brand/product-vasito.png", x: "4%", depth: 0.82, size: 80, rotate: 8 },
];

/** Subtle fruit accents that appear as you scroll — never steal focus from products. */
export function ScrollFruitField() {
  const [spawnLevel, setSpawnLevel] = useState(1);
  const [pageHeight, setPageHeight] = useState(2400);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setPageHeight(Math.max(document.documentElement.scrollHeight, window.innerHeight * 2));
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollTop / maxScroll));
      const nextLevel = Math.min(FRUIT_ACTORS.length, 1 + Math.floor(progress * FRUIT_ACTORS.length));
      setSpawnLevel((current) => Math.max(current, nextLevel));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    const timers = [250, 1000].map((ms) => window.setTimeout(update, ms));
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
              top: `${Math.round(actor.depth * 100)}%`,
              width: actor.size,
              ["--actor-rotate" as string]: `${actor.rotate}deg`,
            }}
          >
            <img src={actor.src} alt="" />
          </figure>
        );
      })}
    </div>
  );
}
