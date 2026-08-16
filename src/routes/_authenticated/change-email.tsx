import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { SoftCard } from "@/components/SoftCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { humanizeError } from "@/lib/analytics";
import { haptic } from "@/lib/native/haptics";
import { toastOnce } from "@/lib/toastOnce";

export const Route = createFileRoute("/_authenticated/change-email")({
  head: () => ({
    meta: [
      { title: "Change email | No Contact Tracker" },
      {
        name: "description",
        content: "Update the email address linked to your No Contact Tracker account.",
      },
      { property: "og:title", content: "Change email | No Contact Tracker" },
      { property: "og:description", content: "Update your account email address securely." },
    ],
  }),
  component: ChangeEmailScreen,
});

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);

function ChangeEmailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
    if (parsed.data.toLowerCase() === (user?.email ?? "").toLowerCase())
      return setError("That's already your current email address.");

    setBusy(true);
    // Supabase Auth owns the email — works for password and Google accounts alike.
    const { error: updateError } = await supabase.auth.updateUser(
      { email: parsed.data },
      { emailRedirectTo: window.location.origin },
    );
    setBusy(false);
    if (updateError) return setError(humanizeError(updateError));
    haptic.light();
    setSent(parsed.data);
    toastOnce("email-change-sent", "Confirmation link sent. Check your inbox.", "success");
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
        <h1 className="mt-4 text-[2rem] font-semibold tracking-tight">Change email</h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <main className="flex-1 px-5 py-5">
        {sent ? (
          <SoftCard className="space-y-3">
            <p className="text-sm">
              We sent a confirmation link to <span className="font-medium">{sent}</span>.
            </p>
            <p className="text-sm text-muted-foreground">
              Your email address will only change once you open that link. If your account also has
              the old address confirmed, you may receive a confirmation request at both addresses —
              open both links to complete the change. Keep signing in with your current email until
              then.
            </p>
            <Button
              className="press h-12 w-full rounded-2xl"
              onClick={() => void navigate({ to: "/profile", replace: true })}
            >
              Done
            </Button>
          </SoftCard>
        ) : (
          <SoftCard>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="space-y-1">
                <Label htmlFor="new-email">New email address</Label>
                <Input
                  id="new-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={255}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a confirmation link to the new address. The change takes effect after
                  you confirm it.
                </p>
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={busy} className="press h-12 w-full rounded-2xl">
                Send confirmation link
              </Button>
            </form>
          </SoftCard>
        )}
      </main>
    </div>
  );
}
