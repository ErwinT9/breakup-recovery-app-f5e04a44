import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { TriggersIllustration } from "@/components/illustrations";
import { triggerRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/triggers")({
  head: () => ({
    meta: [
      { title: "Triggers | No Contact Tracker" },
      { name: "description", content: "Name the moments that make you want to reach out." },
      { property: "og:title", content: "Triggers | No Contact Tracker" },
      { property: "og:description", content: "Spot your patterns so they stop catching you off guard." },
    ],
  }),
  component: () => {
    const { t } = useTranslation();
    return (
      <ActivityListScreen
        title={t("triggers.title")}
        subtitle={t("triggers.subtitle")}
        illustration={<TriggersIllustration />}
        cacheKey="triggers"
        repo={triggerRepo}
        mainField="title"
        mainPlaceholder={t("triggers.mainPlaceholder")}
        noteField="note"
        notePlaceholder={t("triggers.notePlaceholder")}
        suggestions={t("triggers.suggestions", { returnObjects: true }) as string[]}
        emptyText={t("triggers.emptyText")}
      />
    );
  },
});
