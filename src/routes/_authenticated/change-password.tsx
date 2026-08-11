import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

import { PasswordInput } from "@/components/PasswordInput";
import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/analytics";
import { isPasswordUser } from "@/lib/authProvider";
import { haptic } from "@/lib/native/haptics";
import { toastOnce } from "@/lib/toastOnce";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({
    meta: [
      { title: "Change password | No Contact Tracker" },
      {
        name: "description",
        content: "Update the password for your No Contact Tracker account securely.",
      },
      { property: "og:title", content: "Change password | No Contact Tracker" },
      { property: "og:description", content: "Update your account password securely." },
    ],
  }),
  component: ChangePasswordScreen,
});

const GOOGLE_MESSAGE =
  "You signed in using your Google account. Your password is managed by Google and cannot be changed from within the app.";

function ChangePasswordScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();
  const canChange = isPasswordUser(user);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!current) return setError("Enter your current password.");
    if (next.length < 8) return setError("Your new password must be at least 8 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");
    if (next === current) return setError("Choose a password different from your current one.");

    setBusy(true);
    // Re-authenticate to validate the current password before changing it.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: current,
    });
    if (signInError) {
      setBusy(false);
      return setError("Your current password is incorrect.");
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (updateError) return setError(humanizeError(updateError));
    haptic.light();
    toastOnce("password-updated", "Your password has been updated successfully.", "success");
    void navigate({ to: "/profile", replace: true });
  };

  return (
    <div className="animate-in slide-in-from-right-6 fade-in mx-auto flex min-h-screen w-full max-w-md flex-col duration-300">
      <header className="rounded-b-[2rem] bg-muted/60 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => {
            haptic.light();
            router.history.back();
          }}
          className="press flex size-10 items-center justify-center rounded-full bg-background"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="mt-4 text-[2rem] font-semibold tracking-tight">Change password</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <main className="flex-1 px-5 py-5">
        {canChange ? (
          <SoftCard>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  maxLength={72}
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                  className="h-12 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  maxLength={72}
                  value={next}
                  onChange={(event) => setNext(event.target.value)}
                  className="h-12 rounded-2xl"
                  required
                />
                <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  maxLength={72}
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  className="h-12 rounded-2xl"
                  required
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={busy} className="press h-12 w-full rounded-2xl">
                Update password
              </Button>
            </form>
          </SoftCard>
        ) : (
          <SoftCard>
            <p className="text-sm text-muted-foreground">{GOOGLE_MESSAGE}</p>
          </SoftCard>
        )}
      </main>
    </div>
  );
}