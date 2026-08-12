import { Link, useRouterState } from "@tanstack/react-router";
import { Award, Flag, Home, LayoutGrid, LifeBuoy, Menu, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { OfflineBanner } from "@/components/OfflineBanner";
import { MoreDrawer } from "@/components/MoreDrawer";
import { SosToolkit } from "@/components/SosToolkit";
import { activity } from "@/lib/badgeActivity";
import { haptic } from "@/lib/native/haptics";
import { useAuth } from "@/hooks/useAuth";
import { syncNotificationDeviceState } from "@/lib/notifications/deviceState";
import { wireNotificationTaps } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/home", label: "Home", i18nKey: "nav.home", icon: Home },
  { to: "/flags", label: "Flags", i18nKey: "nav.flags", icon: Flag },
  { to: "/wins", label: "Wins", i18nKey: "nav.wins", icon: Trophy },
  { to: "/badges", label: "Badges", i18nKey: "nav.badges", icon: Award },
  { to: "/activity", label: "Activity", i18nKey: "nav.activity", icon: LayoutGrid },
] as const;

export function AppShell({
  children,
  title,
  subtitle,
  action,
  leading,
}: {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode | undefined;
  action?: ReactNode | undefined;
  leading?: ReactNode | undefined;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t } = useTranslation();
  const [sosOpen, setSosOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    activity.appOpened();
    void wireNotificationTaps();
  }, []);

  // Android permission + timezone are re-synced on every resume, so the
  // backend never acts on a stale permission mirror.
  useEffect(() => {
    if (!authUserId) return;
    void syncNotificationDeviceState(authUserId);
    let remove: (() => void) | undefined;
    void import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void syncNotificationDeviceState(authUserId);
        }),
      )
      .then((handle) => {
        remove = () => void handle.remove();
      })
      .catch(() => {});
    return () => remove?.();
  }, [authUserId]);

  useEffect(() => {
    const tab = TABS.find((item) => item.to === pathname);
    if (tab) activity.tabVisited(tab.label.toLowerCase());
  }, [pathname]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
      <header className="flex items-start gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <button
          type="button"
          aria-label={t("shell.openMenu", "Open menu")}
          aria-haspopup="dialog"
          onClick={() => {
            haptic.select();
            setMoreOpen(true);
          }}
          className="press mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        {leading}
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.75rem] font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action}
      </header>

      <OfflineBanner />
      <main className="flex-1 px-5 pt-5 pb-36">{children}</main>

      <button
        type="button"
        onClick={() => {
          haptic.heavy();
          setSosOpen(true);
        }}
        aria-label={t("shell.openSos", "Open emergency toolkit")}
        className="press fixed bottom-28 right-[max(1.25rem,calc(50%-11rem))] z-50 flex size-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-[var(--shadow-lift)]"
      >
        <LifeBuoy className="size-6" aria-hidden />
      </button>

      <SosToolkit open={sosOpen} onOpenChange={setSosOpen} />
      <MoreDrawer open={moreOpen} onOpenChange={setMoreOpen} />

      <nav
        aria-label="Primary"
        className="surface-blur fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md items-center justify-around border-t border-border px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
      >
        {TABS.map(({ to, i18nKey, icon: Icon }) => {
          const active = pathname === to;
          const isFlags = to === "/flags";
          return (
            <Link
              key={to}
              to={to}
              onClick={() => haptic.select()}
              aria-current={active ? "page" : undefined}
              className={cn(
                "press flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1 text-[0.7rem] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                  active && "bg-mint",
                )}
              >
                <Icon
                  className={cn(
                    "size-5",
                    isFlags && (active ? "fill-red-600 text-red-600" : "fill-red-400/60 text-red-400/70"),
                  )}
                  aria-hidden
                />
              </span>
              {t(i18nKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
