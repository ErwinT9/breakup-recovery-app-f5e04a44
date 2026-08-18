import { cn } from "@/lib/utils";

/**
 * Animated heart character with eyes and stick limbs. CSS-only so it costs
 * nothing on Android and stops with the component.
 */
export function WalkingHeart({ walking = true, className }: { walking?: boolean; className?: string }) {
  const limb = "stroke-[#4A4458] dark:stroke-[#EDE9F5]";
  return (
    <div className={cn("mx-auto w-52", className)} aria-hidden>
      <svg viewBox="0 0 120 130" className="size-full" role="img">
        <g className={walking ? "animate-[bounce_1.1s_ease-in-out_infinite]" : undefined}>
          {/* body */}
          <path
            d="M60 78 26 44a17 17 0 0 1 0-24.6 18 18 0 0 1 24.7 0l1.6 1.6 1.6-1.6a18 18 0 0 1 24.7 0 17 17 0 0 1 0 24.6L60 78Z"
            className="fill-[#E8687C] dark:fill-[#F58C99]"
          />
          {/* eyes */}
          <circle cx="48" cy="38" r="4.4" className="fill-white" />
          <circle cx="72" cy="38" r="4.4" className="fill-white" />
          <circle cx="49" cy="39" r="2.1" className="fill-[#4A4458]" />
          <circle cx="73" cy="39" r="2.1" className="fill-[#4A4458]" />
          {/* smile */}
          <path d="M52 50a9 9 0 0 0 16 0" fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-[#4A4458]" />
          {/* arms */}
          <g className={walking ? "origin-[30px_52px] animate-[wiggle_0.9s_ease-in-out_infinite_alternate]" : undefined}>
            <path d="M30 52 14 66" fill="none" strokeWidth="4" strokeLinecap="round" className={limb} />
          </g>
          <g className={walking ? "origin-[90px_52px] animate-[wiggle_0.9s_ease-in-out_infinite_alternate-reverse]" : undefined}>
            <path d="M90 52 106 66" fill="none" strokeWidth="4" strokeLinecap="round" className={limb} />
          </g>
        </g>
        {/* legs */}
        <g
          className={walking ? "origin-[60px_78px] animate-[wiggle_0.55s_ease-in-out_infinite_alternate]" : undefined}
        >
          <path d="M60 78 46 112" fill="none" strokeWidth="4" strokeLinecap="round" className={limb} />
          <path d="M46 112h-9" fill="none" strokeWidth="4" strokeLinecap="round" className={limb} />
        </g>
        <g
          className={
            walking ? "origin-[60px_78px] animate-[wiggle_0.55s_ease-in-out_infinite_alternate-reverse]" : undefined
          }
        >
          <path d="M60 78 74 112" fill="none" strokeWidth="4" strokeLinecap="round" className={limb} />
          <path d="M74 112h9" fill="none" strokeWidth="4" strokeLinecap="round" className={limb} />
        </g>
      </svg>
    </div>
  );
}