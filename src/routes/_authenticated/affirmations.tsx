import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ActivityListScreen } from "@/components/ActivityListScreen";
import { AffirmationsIllustration } from "@/components/illustrations";
import { affirmationRepo } from "@/data/repository";

export const Route = createFileRoute("/_authenticated/affirmations")({
  head: () => ({
    meta: [
      { title: "Affirmations | No Contact Tracker" },
      { name: "description", content: "Write the lines you want to hear on the hard days." },
      { property: "og:title", content: "Affirmations | No Contact Tracker" },
      { property: "og:description", content: "Your own words, saved for the moments you need them." },
    ],
  }),
  component: () => {
    const { t } = useTranslation();
    return (
      <ActivityListScreen
        title={t("affirmations.title")}
        subtitle={t("affirmations.subtitle")}
        illustration={<AffirmationsIllustration />}
        cacheKey="affirmations"
        repo={affirmationRepo}
        mainField="body"
        mainPlaceholder={t("affirmations.mainPlaceholder")}
        multiline
        suggestions={t("affirmations.suggestions", { returnObjects: true }) as string[]}
        emptyText={t("affirmations.emptyText")}
      />
    );
  },
});
