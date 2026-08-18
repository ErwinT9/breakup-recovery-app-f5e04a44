import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { RitualsIllustration } from "@/components/illustrations";
import { ritualRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/rituals")({
  head: () => ({
    meta: [
      { title: "Rituals | No Contact Tracker" },
      { name: "description", content: "Small daily rituals that keep your recovery steady." },
      { property: "og:title", content: "Rituals | No Contact Tracker" },
      { property: "og:description", content: "Build the routine that carries you through no contact." },
    ],
  }),
  component: () => {
    const { t } = useTranslation();
    return (
      <ActivityListScreen
        title={t("rituals.title")}
        subtitle={t("rituals.subtitle")}
        illustration={<RitualsIllustration />}
        cacheKey="rituals"
        repo={ritualRepo}
        mainField="title"
        mainPlaceholder={t("rituals.mainPlaceholder")}
        noteField="note"
        notePlaceholder={t("rituals.notePlaceholder")}
        suggestions={t("rituals.suggestions", { returnObjects: true }) as string[]}
        emptyText={t("rituals.emptyText")}
      />
    );
  },
});
