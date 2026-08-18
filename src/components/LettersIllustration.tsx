/**
 * Small, calm illustration for the Unsent Letters screen.
 *
 * A simple envelope sealed with a tiny heart — the feeling of writing
 * something you keep rather than send. Pure SVG. The envelope body and
 * outline use the theme's surface/primary tokens (so they adapt to light
 * and dark), while the lavender seal and coral heart use fixed mid-tone
 * accents chosen to read clearly in both modes.
 */
export function LettersIllustration({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 160 96" fill="none" className="size-full" role="img">
        {/* envelope body */}
        <rect
          x="38"
          y="26"
          width="84"
          height="46"
          rx="7"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-card"
        />
        {/* envelope outline (green) */}
        <rect
          x="38"
          y="26"
          width="84"
          height="46"
          rx="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          className="text-primary"
        />
        {/* flap */}
        <path
          d="M40 28 L80 56 L120 28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />

        {/* wax seal — lavender */}
        <circle cx="80" cy="52" r="9" fill="#9B8AC4" />
        <circle
          cx="80"
          cy="52"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary"
        />

        {/* tiny heart — coral accent */}
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="#EC7B8A"
          transform="translate(75.2 47.1) scale(0.4)"
        />
      </svg>
    </div>
  );
}
