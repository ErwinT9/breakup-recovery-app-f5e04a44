/**
 * Small, calm illustration for the Unsent Letters screen.
 *
 * A soft sheet of paper drifting up and away on a wisp of breath, with a
 * few faint dots trailing behind it — the feeling of writing something you
 * release but never send. Pure SVG so it tints with the theme tokens and
 * works in both light and dark mode without a fixed background.
 */
export function LettersIllustration({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg
        viewBox="0 0 160 96"
        fill="none"
        className="size-full"
        role="img"
      >
        {/* breath wisp — the act of releasing */}
        <path
          d="M18 80 C 40 70, 36 60, 58 52"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="1.5 5"
          className="text-muted-foreground/55"
        />
        <path
          d="M24 88 C 48 78, 50 66, 72 58"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="1.5 6"
          className="text-muted-foreground/40"
        />

        {/* the letter — a folded note lifting away */}
        <g className="text-card">
          <path
            d="M58 52 L 132 20 L 150 30 L 76 62 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            className="text-card"
          />
          {/* shadow underside */}
          <path
            d="M76 62 L 150 30 L 146 38 L 72 70 Z"
            fill="currentColor"
            className="text-muted-foreground/25"
          />
          {/* fold line */}
          <path
            d="M58 52 L 132 20"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            className="text-muted-foreground/35"
          />
        </g>

        {/* pen stroke lines on the note — words written */}
        <g
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          className="text-primary/55"
        >
          <path d="M72 44 L 112 28" />
          <path d="M69 50 L 106 34" />
          <path d="M66 56 L 100 42" />
        </g>

        {/* trailing dots — the words drifting off, released */}
        <g className="text-primary/70">
          <circle cx="150" cy="18" r="1.8" fill="currentColor" />
          <circle cx="146" cy="11" r="1.4" fill="currentColor" className="text-primary/45" />
          <circle cx="154" cy="8" r="1" fill="currentColor" className="text-primary/30" />
        </g>
      </svg>
    </div>
  );
}
