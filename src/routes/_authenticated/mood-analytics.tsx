import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { moodRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { analytics } from "@/lib/analytics";
import {
  MOOD_CATEGORIES,
  categoryMeta,
  moodCategory,
  moodEmoji,
  moodLabel,
  type MoodCategory,
} from "@/lib/mood";

export const Route = createFileRoute("/_authenticated/mood-analytics")({
  head: () => ({
    meta: [
      { title: "Mood analytics | No Contact Tracker" },
      {
        name: "description",
        content: "See how your moods moved through the week and read every mood you logged.",
      },
      { property: "og:title", content: "Mood analytics | No Contact Tracker" },
      { property: "og:description", content: "Your real mood data, week by week." },
    ],
  }),
  component: MoodAnalyticsScreen,
});

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_PER_DAY = 24;

/** Monday of the week containing `date`, at local midnight. */
function startOfWeek(date: Date): Date {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKey(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function formatRange(start: Date): string {
  const end = addDays(start, 6);
  const fmt = (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function MoodAnalyticsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    analytics.screen("mood_analytics");
  }, []);

  const moods = useQuery({
    queryKey: ["moods", userId],
    queryFn: () => moodRepo.list(userId),
    enabled: Boolean(userId),
  });

  const entries = useMemo(() => moods.data ?? [], [moods.data]);
  const thisWeekStart = startOfWeek(new Date());
  const isThisWeek = weekStart.getTime() === thisWeekStart.getTime();

  const week = useMemo(() => {
    const keys = Array.from({ length: 7 }, (_, index) => dayKey(addDays(weekStart, index)));
    const days = keys.map((key, index) => {
      const dayEntries = entries
        .filter((entry) => entry.checkin_on === key)
        .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
      const counts: Record<MoodCategory, number> = { bright: 0, balanced: 0, bitter: 0 };
      for (const entry of dayEntries) counts[moodCategory(entry.mood)] += 1;
      return { key, label: DAY_LABELS[index]!, entries: dayEntries, counts, total: dayEntries.length };
    });

    const all = days.flatMap((day) => day.entries);
    const totals: Record<MoodCategory, number> = { bright: 0, balanced: 0, bitter: 0 };
    const byMood = new Map<string, number>();
    for (const entry of all) {
      totals[moodCategory(entry.mood)] += 1;
      byMood.set(entry.mood, (byMood.get(entry.mood) ?? 0) + 1);
    }

    let topMood: string | null = null;
    for (const [mood, count] of byMood) {
      if (!topMood || count > (byMood.get(topMood) ?? 0)) topMood = mood;
    }
    const busiest = days.reduce<(typeof days)[number] | null>(
      (best, day) => (day.total > 0 && (!best || day.total > best.total) ? day : best),
      null,
    );

    return { days, all, totals, topMood, busiest, total: all.length };
  }, [entries, weekStart]);

  const logs = useMemo(
    () => [...week.all].sort((a, b) => b.completed_at.localeCompare(a.completed_at)),
    [week.all],
  );

  const busiestTotal = Math.max(0, ...week.days.map((day) => day.total));
  const scaleMax = Math.min(MAX_PER_DAY, Math.max(4, busiestTotal));

  const percent = (value: number) => (week.total ? Math.round((value / week.total) * 100) : 0);

  const summary = (() => {
    if (!week.total) return null;
    const ranked = MOOD_CATEGORIES.map((c) => ({ key: c.key, label: c.label, count: week.totals[c.key] })).sort(
      (a, b) => b.count - a.count,
    );
    const top = ranked[0]!;
    if (top.count === ranked[1]!.count) return "Your moods were evenly mixed this week.";
    if (top.key === "bright") return "This week was mostly Bright.";
    if (top.key === "bitter") return "You experienced more Bitter moods this week.";
    return "Your mood was fairly Balanced this week.";
  })();

  return (
    <AppShell title="Mood analytics" subtitle="Your real mood data, week by week.">
      <div className="space-y-4 pb-6">
        <SoftCard className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="press rounded-2xl"
              aria-label="Previous week"
              onClick={() => {
                setSelectedDay(null);
                setWeekStart((current) => addDays(current, -7));
              }}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <div className="text-center">
              <p className="text-sm font-medium">{isThisWeek ? "This Week" : formatRange(weekStart)}</p>
              {isThisWeek ? (
                <p className="text-xs text-muted-foreground">{formatRange(weekStart)}</p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="press rounded-2xl"
              aria-label="Next week"
              disabled={isThisWeek}
              onClick={() => {
                setSelectedDay(null);
                setWeekStart((current) => addDays(current, 7));
              }}
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </div>

          {week.total === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No moods logged this week yet.
            </p>
          ) : (
            <>
              <div className="flex gap-2">
                <div className="flex h-52 w-6 shrink-0 flex-col justify-between py-0.5 text-right text-[10px] text-muted-foreground">
                  {yTicks.map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="flex flex-1 items-end gap-1.5">
                  {week.days.map((day) => {
                    const active = selectedDay === day.key;
                    return (
                      <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                        <span
                          className={`text-[11px] font-medium ${day.total ? "text-foreground" : "text-transparent"}`}
                        >
                          {day.total || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedDay(active ? null : day.key)}
                          className={`relative h-52 w-full rounded-xl transition-colors ${active ? "bg-muted" : "hover:bg-muted/60"}`}
                          aria-label={`${day.label}: ${day.total} entries — ${day.counts.bright} bright, ${day.counts.balanced} balanced, ${day.counts.bitter} bitter`}
                        >
                          {day.total === 0 ? (
                            <span
                              className="absolute inset-x-0 bottom-0 h-1.5 rounded-full bg-muted"
                              aria-hidden
                            />
                          ) : (
                            <span
                              className="absolute inset-x-0 bottom-0 flex flex-col-reverse overflow-hidden rounded-lg"
                              style={{ height: `${(day.total / scaleMax) * 100}%` }}
                              aria-hidden
                            >
                              {MOOD_CATEGORIES.map((category) =>
                                day.counts[category.key] > 0 ? (
                                  <span
                                    key={category.key}
                                    className={`block w-full ${category.bar}`}
                                    style={{
                                      height: `${(day.counts[category.key] / day.total) * 100}%`,
                                    }}
                                  />
                                ) : null,
                              )}
                            </span>
                          )}
                        </button>
                        <span className="text-xs text-muted-foreground">{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {selected ? (
                <div className="rounded-2xl border border-border p-3 text-sm">
                  <p className="font-medium">
                    {selected.label} · {selected.total} {selected.total === 1 ? "entry" : "entries"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {MOOD_CATEGORIES.map((category) => (
                      <span
                        key={category.key}
                        className={`rounded-full px-2 py-0.5 text-xs text-on-tint ${category.chip}`}
                      >
                        {category.label} {selected.counts[category.key]}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">Tap a bar to see that day's counts.</p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {MOOD_CATEGORIES.map((category) => (
                  <span key={category.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`size-2.5 rounded-full ${category.dot}`} aria-hidden />
                    {category.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </SoftCard>

        {week.total > 0 ? (
          <SoftCard className="space-y-4">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Total mood activities</p>
              <p className="text-2xl font-semibold">{week.total}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MOOD_CATEGORIES.map((category) => (
                <div key={category.key} className={`rounded-2xl p-3 ${category.chip}`}>
                  <p className="text-xs text-on-tint">{category.label}</p>
                  <p className="text-lg font-semibold text-on-tint">{week.totals[category.key]}</p>
                  <p className="text-xs text-on-tint">{percent(week.totals[category.key])}%</p>
                </div>
              ))}
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Most frequent mood</dt>
                <dd className="font-medium">
                  {week.topMood ? `${moodEmoji(week.topMood)} ${moodLabel(week.topMood)}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Highest activity day</dt>
                <dd className="font-medium">
                  {week.busiest ? `${week.busiest.label} (${week.busiest.total})` : "—"}
                </dd>
              </div>
            </dl>
            {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}
          </SoftCard>
        ) : null}

        <SoftCard className="space-y-3">
          <h2 className="font-medium">Mood logs</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mood entries for this week.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((entry) => {
                const category = categoryMeta(moodCategory(entry.mood));
                const at = new Date(entry.completed_at);
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        <span aria-hidden>{moodEmoji(entry.mood)}</span> {moodLabel(entry.mood)}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs text-on-tint ${category.chip}`}
                      >
                        {category.label}
                      </span>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>{at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                      <p>{at.toLocaleDateString([], { month: "short", day: "numeric" })}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SoftCard>
      </div>
    </AppShell>
  );
}