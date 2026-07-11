"use client";

import { useScrollSpawn } from "@/hooks/use-scroll-spawn";

type FruitActor = {
  id: string;
  src: string;
  alt: string;
  label: string;
  left: string;
  top: string;
  size: number;
  rotate: number;
  delay: string;
  side: "left" | "right";
};

/** Fruit "people" that spawn into the page as the visitor scrolls — Botivo-style playful layer. */
const FRUIT_ACTORS: FruitActor[] = [
  {
    id: "parcha",
    src: "/brand/product-parcha.png",
    alt: "Parcha character",
    label: "Parcha",
    left: "4%",
    top: "18%",
    size: 108,
    rotate: -8,
    delay: "0s",
    side: "left",
  },
  {
    id: "acerola",
    src: "/brand/product-acerola.png",
    alt: "Acerola character",
    label: "Acerola",
    left: "86%",
    top: "28%",
    size: 96,
    rotate: 10,
    delay: "0.05s",
    side: "right",
  },
  {
    id: "pina",
    src: "/brand/product-pina.png",
    alt: "Piña character",
    label: "Piña",
    left: "8%",
    top: "46%",
    size: 112,
    rotate: 6,
    delay: "0.1s",
    side: "left",
  },
  {
    id: "tamarindo",
    src: "/brand/product-tamarindo.png",
    alt: "Tamarindo character",
    label: "Tamarindo",
    left: "82%",
    top: "52%",
    size: 100,
    rotate: -12,
    delay: "0.08s",
    side: "right",
  },
  {
    id: "jengibre",
    src: "/brand/product-jengibre.png",
    alt: "Jengibre character",
    label: "Jengibre",
    left: "5%",
    top: "68%",
    size: 90,
    rotate: 14,
    delay: "0.12s",
    side: "left",
  },
  {
    id: "vasito",
    src: "/brand/product-vasito.png",
    alt: "Sample pack character",
    label: "Corillo pack",
    left: "84%",
    top: "72%",
    size: 104,
    rotate: -6,
    delay: "0.04s",
    side: "right",
  },
  {
    id: "kale",
    src: "/brand/product-kale.png",
    alt: "Greens character",
    label: "Greens",
    left: "10%",
    top: "86%",
    size: 88,
    rotate: 8,
    delay: "0.15s",
    side: "left",
  },
  {
    id: "hoja",
    src: "/brand/logo-hoja.png",
    alt: "Leaf character",
    label: "Hoja",
    left: "78%",
    top: "12%",
    size: 74,
    rotate: -18,
    delay: "0.02s",
    side: "right",
  },
];

export function ScrollFruitField() {
  const { spawnLevel, progress } = useScrollSpawn(FRUIT_ACTORS.length);

  return (
    <div className="fruit-field" aria-hidden="true">
      <div className="fruit-field-track" style={{ ["--scroll-progress" as string]: String(progress) }}>
        {FRUIT_ACTORS.map((actor, index) => {
          const visible = index < spawnLevel;
          return (
            <figure
              key={actor.id}
              className={`fruit-actor ${visible ? "is-spawned" : ""} fruit-actor-${actor.side}`}
              style={{
                left: actor.left,
                top: actor.top,
                width: actor.size,
                ["--actor-rotate" as string]: `${actor.rotate}deg`,
                animationDelay: actor.delay,
              }}
            >
              <img src={actor.src} alt="" draggable={false} />
              <figcaption>{actor.label}</figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
