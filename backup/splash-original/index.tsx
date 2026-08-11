import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { HeartLeaf } from "@/components/HeartLeaf";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import { TAGLINE } from "@/lib/content";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "No Contact Tracker: Breakup Reset" },
      {
        name: "description",
        content:
          "Track your no-contact streak in real time, log red flags and wins, unlock badges and get through urges with an offline emergency toolkit.",
      },
      { property: "og:title", content: "No Contact Tracker: Breakup Reset" },
      { property: "og:description", content: TAGLINE },
    ],
  }),
  component: Splash,
});

function Splash() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    analytics.screen("splash");
    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (loading || cancelled) return;
      void navigate({ to: session ? "/home" : "/auth", replace: true });
    }, 2400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [loading, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
      <div className="relative">
        <div
          aria-hidden
          className="animate-soft-pulse absolute inset-0 -z-10 rounded-full bg-mint blur-3xl"
        />
        <HeartLeaf animate className="size-32" />
      </div>
      <h1 className="animate-rise mt-10 text-2xl font-semibold tracking-tight">
        {t("landing.title", "No Contact Tracker")}
      </h1>
      <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
        {t("landing.subtitle", "Breakup Reset")}
      </p>
      <p className="animate-rise mt-6 max-w-xs text-sm text-muted-foreground">{TAGLINE}</p>
    </div>
  );
}
