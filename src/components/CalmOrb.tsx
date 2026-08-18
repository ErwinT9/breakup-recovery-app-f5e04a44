import { cn } from "@/lib/utils";

/**
 * Lightweight breathing orb used by the meditation screens. Pure CSS
 * animation — no timers, no listeners, so it cleans itself up on unmount.
 */
export function CalmOrb({ active = true, className }: { active?: boolean; className?: string }) {
  return (
    <div className={cn("relative mx-auto flex size-56 items-center justify-center", className)} aria-hidden>
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-mint/50 blur-xl",
          active && "animate-[pulse_5s_ease-in-out_infinite]",
        )}
      />
      <span
        className={cn(
          "absolute inset-6 rounded-full bg-sky/60",
          active && "animate-[pulse_4s_ease-in-out_infinite]",
        )}
        style={{ animationDelay: "0.6s" }}
      />
      <span
        className={cn(
          "absolute inset-14 rounded-full bg-mint",
          active && "animate-[pulse_3.2s_ease-in-out_infinite]",
        )}
        style={{ animationDelay: "1.2s" }}
      />
      <svg viewBox="0 0 48 48" className="relative size-14" role="img" aria-hidden>
        <path
          d="M24 40 9.6 26.4a9.4 9.4 0 0 1 0-13.6 10 10 0 0 1 13.7 0l.7.7.7-.7a10 10 0 0 1 13.7 0 9.4 9.4 0 0 1 0 13.6L24 40Z"
          className="fill-[#4FB064] dark:fill-[#7FD98A]"
        />
      </svg>
    </div>
  );
}