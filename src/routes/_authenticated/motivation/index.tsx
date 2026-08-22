import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Flame,
  Flower2,
  Footprints,
  Inbox,
  Leaf,
  Palette,
  Sparkles,
  Wine,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { MotivationIllustration } from "@/components/illustrations";
import { ALCOHOL_CONTROL_TAGLINE, ALCOHOL_CONTROL_TITLE } from "@/lib/alcoholControl";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/_authenticated/motivation/")({
  head: () => ({
    meta: [
      { title: "Motivation | No Contact Tracker" },
      {
        name: "description",
        content: "Short motivational guides to help you keep choosing yourself during no contact.",
      },
      { property: "og:title", content: "Motivation | No Contact Tracker" },
      {
        property: "og:description",
        content: "Open the motivational guide for gentle reminders that keep your streak alive.",
      },
    ],
  }),
  component: MotivationScreen,
});

const CARDS = [
  {
    to: "/motivation/journey",
    icon: Leaf,
    title: "Journey",
    tagline: "Small steps to help you heal, grow, and reconnect with yourself.",
    tint: "bg-mint",
  },
  {
    to: "/streak-unlock",
    icon: Palette,
    title: "7-Day Streak Unlock",
    tagline: "Watch your garden gain colour and unlock a printable coloring page",
    tint: "bg-lavender",
  },
  {
    to: "/motivation/guide",
    icon: Flame,
    title: "Motivational Guide",
    tagline: "Short guides written for the moments the urge feels loudest.",
    tint: "bg-mint",
  },
  {
    to: "/motivation/meditation",
    icon: Flower2,
    title: "Mindful Meditation",
    tagline: "Practice for few minutes meditation to relax and focus",
    tint: "bg-sky",
  },
  {
    to: "/motivation/walk",
    icon: Footprints,
    title: "Outdoor Walk",
    tagline: "Go for a walk and record it for physical and mental well-being",
    tint: "bg-sand",
  },
  {
    to: "/motivation/worry-box",
    icon: Inbox,
    title: "Worry Box",
    tagline: "Put your worries down somewhere safe when anxiety feels loud",
    tint: "bg-sky",
  },
  {
    to: "/motivation/gratitude-jar",
    icon: Sparkles,
    title: "Gratitude Jar",
    tagline: "Collect the small good things, one candy, heart or leaf at a time",
    tint: "bg-blush",
  },
  {
    to: "/motivation/alcohol-control",
    icon: Wine,
    title: ALCOHOL_CONTROL_TITLE,
    tagline: ALCOHOL_CONTROL_TAGLINE,
    tint: "bg-mint",
  },
] as const;

function MotivationScreen() {
  return (
    <AppShell title="Motivation" subtitle="A little reminder to keep choosing yourself.">
      <MotivationIllustration className="mx-auto mb-5 mt-1 w-40" />
      <ul className="space-y-3">
        {CARDS.map(({ to, icon: Icon, title, tagline, tint }) => (
          <li key={to}>
            <Link
              to={to}
              onClick={() => haptic.select()}
              className="press soft-card flex items-center gap-4 rounded-3xl p-5"
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="size-5 text-on-tint" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{tagline}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
