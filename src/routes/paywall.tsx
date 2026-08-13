import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BookHeart,
  Check,
  CloudUpload,
  Crown,
  Loader2,
  Palette,
  RefreshCw,
  Target,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { PRIVACY_URL, TERMS_URL, openExternalUrl } from "@/lib/openExternal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paywall")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Premium | No Contact Tracker" },
      { name: "description", content: "Unlock unlimited flags and letters, every badge, advanced reminders and cloud backup." },
      { property: "og:title", content: "Premium | No Contact Tracker" },
      { property: "og:description", content: "Unlock every healing tool. Cancel anytime." },
    ],
  }),
  component: Paywall,
});

const BENEFIT_ICONS = [BookHeart, BarChart3, Target, CloudUpload, Palette];
const BENEFIT_KEYS = [
  { key: "unlimitedFlags", fallback: "Unlimited flags, wins and letters" },
  { key: "analytics", fallback: "Mood and urge analytics" },
  { key: "toolkitBadges", fallback: "Full emergency toolkit and badges" },
  { key: "cloudBackup", fallback: "Encrypted cloud backup" },
  { key: "themes", fallback: "Premium themes and widgets" },
] as const;

function Paywall() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { restore, busy, isPremium, offerings, reloadOfferings, purchase } = useSubscription();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => analytics.screen("paywall"), []);

  const packages = offerings.status === "ok" ? offerings.packages : [];

  useEffect(() => {
    if (!packages.length) return;
    setSelectedId((current) =>
      current && packages.some((p) => p.id === current) ? current : packages[0]!.id,
    );
  }, [packages]);

  const selected = useMemo(
    () => packages.find((p) => p.id === selectedId) ?? null,
    [packages, selectedId],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={t("common.close")}
          className="press flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          onClick={() => void navigate({ to: "/home" })}
        >
          <X className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          className="press rounded-full px-3 py-1.5 text-sm text-muted-foreground disabled:opacity-50"
          onClick={() => void restore()}
          disabled={busy}
        >
          {t("drawer.restore")}
        </button>
      </div>

      <span className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-lavender px-3 py-1 text-xs font-semibold tracking-wide text-on-tint uppercase">
        <Crown className="size-3.5" aria-hidden /> Pro
      </span>

      <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-gradient">
        {t("paywall.title", "Heal with the full toolkit")}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {selected?.trialPeriod
          ? `Start with ${selected.trialPeriod} free${selected.priceString ? `, then ${selected.priceString}` : ""}${selected.period ? ` every ${selected.period}` : ""}. Cancel anytime.`
          : "Unlock every tool that keeps your streak alive. Cancel anytime."}
      </p>

      <SoftCard className="mt-6 space-y-4 animate-rise">
        {BENEFIT_KEYS.map(({ key, fallback }, index) => {
          const Icon = BENEFIT_ICONS[index]!;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/15">
                <Icon className="size-4 text-primary" aria-hidden />
              </span>
              <span className="text-sm">{t(`paywall.benefits.${key}`, fallback)}</span>
            </div>
          );
        })}
      </SoftCard>

      <div className="mt-6 space-y-3">
        {offerings.status === "loading" ? (
          <>
            <div className="h-[86px] animate-pulse rounded-3xl bg-muted" />
            <div className="h-[86px] animate-pulse rounded-3xl bg-muted" />
          </>
        ) : offerings.status === "ok" ? (
          packages.map((pkg) => {
            const active = pkg.id === selectedId;
            return (
              <button
                key={pkg.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  haptic.select();
                  setSelectedId(pkg.id);
                }}
                className={cn(
                  "press soft-card flex w-full items-center gap-3 rounded-3xl p-4 text-left transition-colors",
                  active ? "border-2 border-primary bg-primary/5" : "border-2 border-transparent",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {active ? <Check className="size-3.5" aria-hidden /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{pkg.title}</span>
                    {pkg.trial ? (
                      <span className="rounded-full bg-mint px-2 py-0.5 text-[0.65rem] font-semibold text-on-tint uppercase">
                        {pkg.trial}
                      </span>
                    ) : null}
                  </span>
                  {pkg.period ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Billed every {pkg.period}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums">
                  {pkg.priceString}
                </span>
              </button>
            );
          })
        ) : (
          <SoftCard className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {offerings.status === "error"
                ? "We couldn't load subscription plans right now."
                : "Subscription plans aren't available on this device yet."}
            </p>
            <Button
              variant="secondary"
              className="press h-11 w-full rounded-2xl"
              onClick={() => void reloadOfferings()}
            >
              <RefreshCw className="size-4" aria-hidden /> Try again
            </Button>
          </SoftCard>
        )}
      </div>

      <div className="mt-auto pt-8">
        <Button
          className="press h-14 w-full rounded-2xl text-base"
          disabled={busy || isPremium || !selected}
          onClick={() => {
            if (!selected) return;
            haptic.light();
            void purchase(selected.id);
          }}
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {isPremium
            ? t("paywall.alreadyPremium", "Pro is active")
            : selected
              ? selected.trialPeriod
                ? `Start ${selected.trialPeriod} free trial`
                : `Continue — ${selected.priceString}`
              : "Continue"}
        </Button>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t(
            "paywall.billingNote",
            "Billed through Google Play. Manage or cancel anytime in Play Store subscriptions.",
          )}
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <button type="button" className="press underline" onClick={() => void openExternalUrl(TERMS_URL)}>
            {t("drawer.terms")}
          </button>
          <button type="button" className="press underline" onClick={() => void openExternalUrl(PRIVACY_URL)}>
            {t("drawer.privacy")}
          </button>
        </div>
      </div>
    </div>
  );
}
