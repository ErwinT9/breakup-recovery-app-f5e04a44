import { cn } from "@/lib/utils";

/**
 * Splash mark: a heart that separates into two halves and grows into a leaf.
 * Pure SVG + CSS so it renders instantly on cold start.
 */
export function HeartLeaf({ animate = true, className }: { animate?: boolean; className?: string }) {
  return (
    <div className={cn("relative size-32", className)} aria-hidden>
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full">
        <path
          d="M60 104 C60 104 16 78 16 46 C16 30 28 20 41 20 C50 20 57 25 60 31 L60 104 Z"
          fill="currentColor"
          className="text-primary/35 origin-center"
          style={
            animate
              ? { animation: "heart-split-left 1.1s var(--ease-native) 0.5s both" }
              : undefined
          }
        />
        <path
          d="M60 104 C60 104 104 78 104 46 C104 30 92 20 79 20 C70 20 63 25 60 31 L60 104 Z"
          fill="currentColor"
          className="text-primary/25 origin-center"
          style={
            animate
              ? { animation: "heart-split-right 1.1s var(--ease-native) 0.5s both" }
              : undefined
          }
        />
      </svg>
      <svg
        viewBox="0 0 120 120"
        className={cn("absolute inset-0 size-full", animate && "animate-leaf")}
        style={animate ? { animationDelay: "1.2s" } : undefined}
      >
        <path
          d="M60 106 C60 78 60 56 60 40"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-primary"
          fill="none"
        />
        <path
          d="M60 52 C60 26 82 12 104 12 C104 38 84 54 60 52 Z"
          fill="currentColor"
          className="text-primary"
        />
        <path
          d="M60 70 C60 50 42 38 22 38 C22 60 40 72 60 70 Z"
          fill="currentColor"
          className="text-primary/70"
        />
      </svg>
    </div>
  );
}
