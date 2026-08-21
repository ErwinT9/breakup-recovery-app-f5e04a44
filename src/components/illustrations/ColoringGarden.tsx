/**
 * Progressive coloring illustration for the 7-Day Streak Unlock screen.
 *
 * The scene is drawn as clean line art. Each shape carries a `stage` number —
 * once the user's streak reaches that day, the shape fades from empty paper to
 * its colour. Day 7 = fully coloured.
 */
import type { Ref } from "react";

import { cn } from "@/lib/utils";

export const COLORING_STAGES = 7;

/** Fills used for the coloured state, keyed by palette slot. */
const PALETTE = {
  sun: "#F7C56B",
  sky: "#DCEBFA",
  hill: "#CFE9CF",
  grass: "#B7DFB8",
  leaf: "#8FD09A",
  trunk: "#D3B48C",
  water: "#CBE6F5",
  lily: "#F0A6B6",
  petalA: "#F2A5B8",
  petalB: "#F7C56B",
  petalC: "#C6B4E6",
  can: "#9CC8E8",
  duck: "#FBEBD2",
  beak: "#F0A45C",
} as const;

type Slot = keyof typeof PALETTE;

function fillFor(stage: number, at: number, slot: Slot): string {
  return stage >= at ? PALETTE[slot] : "transparent";
}

export function ColoringGarden({
  stage,
  className,
  monochrome = false,
  ref,
}: {
  ref?: Ref<SVGSVGElement>;
  /** Current streak day, 1-7 (values above 7 render fully coloured). */
  stage: number;
  className?: string;
  /** Printable version: pure line art, no colour at all. */
  monochrome?: boolean;
}) {
  const s = monochrome ? 0 : Math.max(0, Math.min(COLORING_STAGES, Math.round(stage)));
  const f = (at: number, slot: Slot) => fillFor(s, at, slot);

  return (
    <svg
      ref={ref}
      viewBox="0 0 320 240"
      className={cn("size-full", className)}
      role="img"
      aria-label="A garden scene that gains colour as your streak grows"
    >
      <defs>
        <clipPath id="coloring-garden-frame">
          <rect x="10" y="18" width="300" height="208" rx="22" />
        </clipPath>
      </defs>
      <g
        clipPath="url(#coloring-garden-frame)"
        stroke={monochrome ? "#2B2B2B" : "currentColor"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="[&_*]:transition-[fill] [&_*]:duration-700 [&_*]:ease-out"
      >
        {/* sky band */}
        <path d="M10 18h300v126H10z" fill={f(4, "sky")} stroke="none" opacity="0.9" />

        {/* sun — day 1 */}
        <circle cx="256" cy="58" r="20" fill={f(1, "sun")} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          const x1 = 256 + Math.cos(r) * 27;
          const y1 = 58 + Math.sin(r) * 27;
          const x2 = 256 + Math.cos(r) * 34;
          const y2 = 58 + Math.sin(r) * 34;
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}

        {/* clouds — day 4 */}
        <path
          d="M40 62c0-9 7-16 16-16 4-8 15-10 22-5 8-3 17 3 17 12 0 5-4 9-9 9H50c-6 0-10-4-10-9Z"
          fill={f(4, "sky")}
        />
        <path
          d="M118 46c0-6 5-11 11-11 3-5 10-7 15-3 5-2 12 2 12 8 0 4-3 6-6 6h-26c-3 0-6-1-6-6Z"
          fill={f(4, "sky")}
        />

        {/* rolling hill — day 3 */}
        <path d="M8 142c48-30 94-30 142-6 48 24 100 24 162 0v84H8v-78Z" fill={f(3, "hill")} />

        {/* pond — day 5 */}
        <ellipse cx="86" cy="176" rx="60" ry="26" fill={f(5, "water")} />
        <path d="M36 186c8-5 18-5 26 0" fill="none" />
        <path d="M92 192c8-4 16-4 24 0" fill="none" />

        {/* lily pads + flower — day 5 */}
        <path d="M38 172a13 13 0 1 1 24 6l-11-1-13-5Z" fill={f(5, "leaf")} />
        <circle cx="66" cy="188" r="7" fill={f(5, "lily")} />
        <circle cx="66" cy="188" r="2.4" fill={monochrome ? "none" : f(5, "sun")} />

        {/* little duck friend — day 6 */}
        <ellipse cx="108" cy="176" rx="19" ry="13" fill={f(6, "duck")} />
        <circle cx="123" cy="163" r="9.5" fill={f(6, "duck")} />
        <path d="M131 162h9l-9 6v-6Z" fill={f(6, "beak")} />
        <circle cx="125" cy="160" r="1.6" fill={monochrome ? "none" : "#2B2B2B"} stroke="none" />
        <path d="M100 175c6-4 14-4 18 2" fill="none" />

        {/* tree — trunk day 2, canopy day 2 + 3 */}
        <path d="M242 196v-42" fill="none" />
        <path d="M234 196h18c0-8-4-14-9-14s-9 6-9 14Z" fill={f(2, "trunk")} />
        <circle cx="242" cy="130" r="30" fill={f(2, "leaf")} />
        <circle cx="218" cy="144" r="18" fill={f(3, "leaf")} />
        <circle cx="266" cy="144" r="18" fill={f(3, "leaf")} />

        {/* flowers row — days 1, 3, 6 */}
        <g>
          <path d="M182 210v-30" fill="none" />
          <path d="M182 194c-9 0-13-5-13-5s5-5 13-1" fill={f(3, "grass")} />
          {[0, 72, 144, 216, 288].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return (
              <circle key={deg} cx={182 + Math.cos(r) * 9} cy={172 + Math.sin(r) * 9} r="6.5" fill={f(3, "petalA")} />
            );
          })}
          <circle cx="182" cy="172" r="5" fill={f(3, "sun")} />
        </g>

        <g>
          <path d="M206 212v-24" fill="none" />
          <path d="M206 200c8 0 12-4 12-4s-4-5-12-1" fill={f(6, "grass")} />
          {[0, 72, 144, 216, 288].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return (
              <circle key={deg} cx={206 + Math.cos(r) * 8} cy={182 + Math.sin(r) * 8} r="5.6" fill={f(6, "petalC")} />
            );
          })}
          <circle cx="206" cy="182" r="4.2" fill={f(6, "sun")} />
        </g>

        <g>
          <path d="M160 214v-26" fill="none" />
          <path d="M160 202c-8 0-12-4-12-4s4-5 12-1" fill={f(7, "grass")} />
          {[0, 72, 144, 216, 288].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return (
              <circle key={deg} cx={160 + Math.cos(r) * 8} cy={182 + Math.sin(r) * 8} r="5.6" fill={f(7, "petalB")} />
            );
          })}
          <circle cx="160" cy="182" r="4.2" fill={f(7, "sun")} />
        </g>

        {/* watering can — day 1 (the first splash of colour) */}
        <path d="M250 214v-24a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4h-26a4 4 0 0 1-4-4Z" fill={f(1, "can")} />
        <path d="M284 194l14-8-4 22-10-6" fill={f(1, "can")} />
        <path d="M256 186c0-8 12-8 12 0" fill="none" />

        {/* grass tufts — day 7 */}
        <path d="M96 210c0-6 4-10 4-10s4 4 4 10" fill={f(7, "grass")} />
        <path d="M120 214c0-7 5-12 5-12s5 5 5 12" fill={f(7, "grass")} />
        <path d="M60 212c0-6 4-10 4-10s4 4 4 10" fill={f(7, "grass")} />

        {/* ground line */}
        <path d="M14 218h292" fill="none" />

      </g>
      <rect
        x="10"
        y="18"
        width="300"
        height="208"
        rx="22"
        fill="none"
        stroke={monochrome ? "#2B2B2B" : "currentColor"}
        strokeWidth="2.2"
      />
    </svg>
  );
}
