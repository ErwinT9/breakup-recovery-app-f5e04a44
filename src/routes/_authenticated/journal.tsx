import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { JournalIllustration } from "@/components/illustrations";
import { journalRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Journal | No Contact Tracker" },
      { name: "description", content: "A private place to empty your head, one day at a time." },
      { property: "og:title", content: "Journal | No Contact Tracker" },
      { property: "og:description", content: "Private daily entries that stay on your device first." },
    ],
  }),
  component: () => {
    const { t } = useTranslation();
    return (
      <ActivityListScreen
        title={t("journal.title")}
        subtitle={t("journal.subtitle")}
        illustration={<JournalIllustration />}
        cacheKey="journal"
        repo={journalRepo}
        mainField="body"
        mainPlaceholder={t("journal.mainPlaceholder")}
        noteField="title"
        notePlaceholder={t("journal.notePlaceholder")}
        multiline
        emptyText={t("journal.emptyText")}
      />
    );
  },
});
