/** Filled illustrations for the Worry Box and Gratitude Jar wellness screens. */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const LID = "fill-[#8B79BE] dark:fill-[#B3A2DC]";
const BOX = "fill-[#A99BD6] dark:fill-[#6E62A0]";
const BOX_DARK = "fill-[#8B79BE] dark:fill-[#564B80]";
const CREAM = "fill-[#FBEBD2] dark:fill-[#3A3348]";

function Canvas({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(className)} aria-hidden>
      <svg viewBox="0 0 160 120" className="size-full" role="img">
        {children}
      </svg>
    </div>
  );
}

export function WorryBoxArt({ className }: { className?: string }) {
  return (
    <Canvas className={className}>
      {/* soft clouds behind */}
      <circle cx="34" cy="30" r="14" className="fill-[#DCEBFA] dark:fill-[#2F3A4C]" />
      <circle cx="50" cy="26" r="10" className="fill-[#DCEBFA] dark:fill-[#2F3A4C]" />
      <circle cx="124" cy="26" r="12" className="fill-[#DCEBFA] dark:fill-[#2F3A4C]" />
      {/* body */}
      <path d="M34 60h92v42a6 6 0 0 1-6 6H40a6 6 0 0 1-6-6V60Z" className={BOX} />
      <path d="M34 60h92v10H34z" className={BOX_DARK} />
      {/* lid */}
      <path d="M28 44a6 6 0 0 1 6-6h92a6 6 0 0 1 6 6v14H28V44Z" className={LID} />
      {/* slot */}
      <rect x="62" y="46" width="36" height="6" rx="3" className={CREAM} />
      {/* folded note going in */}
      <path d="M70 22h20l6 6v14H70V22Z" className={CREAM} />
      <rect x="76" y="30" width="14" height="3" rx="1.5" className={BOX_DARK} />
      <rect x="76" y="36" width="10" height="3" rx="1.5" className={BOX_DARK} />
      {/* ribbon */}
      <rect x="76" y="58" width="8" height="50" className="fill-[#E8687C] dark:fill-[#F58C99]" />
    </Canvas>
  );
}

export function CandyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-full", className)} aria-hidden role="img">
      <path d="M6 16 16 24 6 32V16Z" className="fill-[#F0A6B6] dark:fill-[#F58C99]" />
      <path d="M42 16 32 24l10 8V16Z" className="fill-[#F0A6B6] dark:fill-[#F58C99]" />
      <circle cx="24" cy="24" r="11" className="fill-[#E8687C] dark:fill-[#F58C99]" />
      <path d="M19 18a10 10 0 0 1 8 3" className="stroke-[#FBEBD2]" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-full", className)} aria-hidden role="img">
      <path
        className="fill-[#E8687C] dark:fill-[#F58C99]"
        d="M24 41 8.5 25.7a10.2 10.2 0 0 1 0-14.6 10.8 10.8 0 0 1 14.8 0l.7.8.7-.8a10.8 10.8 0 0 1 14.8 0 10.2 10.2 0 0 1 0 14.6L24 41Z"
      />
    </svg>
  );
}

export function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-full", className)} aria-hidden role="img">
      <path
        className="fill-[#4FB064] dark:fill-[#7FD98A]"
        d="M40 8C20 8 8 18 8 32c0 4 1.4 7 1.4 7S16 24 38 14C38 14 22 26 14 40c8 4 26 2 26-32Z"
      />
    </svg>
  );
}
