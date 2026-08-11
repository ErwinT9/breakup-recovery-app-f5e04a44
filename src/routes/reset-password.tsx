import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/analytics";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password | No Contact Tracker" },
      { name: "description", content: "Choose a new password for your No Contact Tracker account." },
      { property: "og:title", content: "Set a new password | No Contact Tracker" },
      { property: "og:description", content: "Finish resetting your account password." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError(t("resetPassword.tooShort", "Use at least 8 characters"));
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(humanizeError(updateError));
    toast.success(t("resetPassword.updated", "Password updated."));
    void navigate({ to: "/home" });
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <button
        type="button"
        onClick={() => void navigate({ to: "/auth" })}
        aria-label={t("auth.back", "Go back")}
        className="press mb-4 -ml-2 flex size-10 items-center justify-center rounded-full bg-muted text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <h1 className="text-3xl font-semibold tracking-tight">{t("resetPassword.title", "Set a new password")}</h1>
      <p className="mt-3 text-muted-foreground">
        {t("resetPassword.subtitle", "Choose something you haven't used before.")}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">{t("resetPassword.newPassword", "New password")}</Label>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-13 rounded-2xl"
            required
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="press h-13 w-full rounded-2xl text-base">
          {t("resetPassword.submit", "Update password")}
        </Button>
      </form>
    </div>
  );
}
