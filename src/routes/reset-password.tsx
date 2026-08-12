import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/analytics";
import { waitForOAuthSession } from "@/lib/auth/oauthHash";
import { haptic } from "@/lib/native/haptics";

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
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // The recovery link may still be turning its tokens into a session.
  useEffect(() => {
    let cancelled = false;
    void waitForOAuthSession().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!password || !confirm) return setError("Enter and confirm your new password.");
    if (password.length < 8) return setError(t("resetPassword.tooShort", "Use at least 8 characters"));
    if (password !== confirm) return setError("The passwords don't match.");

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(humanizeError(updateError));
    haptic.success();
    setDone(true);
  };

  const goToLogin = async () => {
    // End the temporary recovery session so the user signs in with the new password.
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 text-center">
        <CheckCircle2 className="mx-auto size-14 text-primary" aria-hidden />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Password updated</h1>
        <p className="mt-3 text-muted-foreground">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Button
          className="press mt-8 h-13 w-full rounded-2xl text-base"
          onClick={() => void goToLogin()}
        >
          Go to login
        </Button>
      </div>
    );
  }

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
      <h1 className="text-3xl font-semibold tracking-tight">{t("resetPassword.title", "Reset your password")}</h1>
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
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            maxLength={72}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-13 rounded-2xl"
            required
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy || !ready} className="press h-13 w-full rounded-2xl text-base">
          {t("resetPassword.submit", "Update password")}
        </Button>
      </form>
    </div>
  );
}
