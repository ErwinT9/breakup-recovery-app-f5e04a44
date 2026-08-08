import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";

import { HeartLeaf } from "@/components/HeartLeaf";
import { OfflineScreen } from "@/components/OfflineScreen";
import { getCachedSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { supabase } from "@/integrations/supabase/client";
import { analytics, humanizeError } from "@/lib/analytics";
import { cleanAuthFragment, waitForOAuthSession } from "@/lib/auth/oauthHash";
import { setNativeOAuthHandlers, signInWithGoogle } from "@/lib/auth/oauthNative";
import { openExternalUrl, PRIVACY_URL, TERMS_URL } from "@/lib/openExternal";
import { haptic } from "@/lib/native/haptics";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in | No Contact Tracker" },
      { name: "description", content: "Create your private account or sign in to continue your streak." },
      { property: "og:title", content: "Sign in | No Contact Tracker" },
      { property: "og:description", content: "Your streak, flags, wins and letters stay private to you." },
    ],
  }),
  component: AuthScreen,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

type Mode = "welcome" | "signup" | "signin" | "forgot";

function AuthScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { online } = useNetworkStatus();
  const [mode, setMode] = useState<Mode>("welcome");
  // Navigation stack so Back returns to the screen the user came from and
  // form fields (email/password) survive the round trip.
  const [history, setHistory] = useState<Mode[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = useCallback((next: Mode) => {
    setHistory((stack) => [...stack, mode]);
    setError(null);
    setMode(next);
  }, [mode]);

  const goBack = useCallback(() => {
    haptic.select();
    setError(null);
    setHistory((stack) => {
      setMode(stack[stack.length - 1] ?? "welcome");
      return stack.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    analytics.screen("auth");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void waitForOAuthSession().then((oauthSession) => {
      if (cancelled) return;
      if (oauthSession) void navigate({ to: "/home", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (session) void navigate({ to: "/home", replace: true });
  }, [session, navigate]);

  // Relaunching offline: a persisted session means the user has authenticated
  // before, so send them straight into the cached app instead of a retry wall.
  const [cachedChecked, setCachedChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void getCachedSession().then((cached) => {
      if (cancelled) return;
      if (cached) void navigate({ to: "/home", replace: true });
      setCachedChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    setNativeOAuthHandlers({
      onError: (message) => {
        setBusy(false);
        toast.error(message);
      },
      onPendingChange: (pending) => setBusy(pending),
    });
    return () => setNativeOAuthHandlers({});
  }, []);

  // Offline with no cached session: signing in needs the network, so show a
  // dedicated offline screen rather than a form that can only fail.
  if (!online && !session && cachedChecked) return <OfflineScreen />;

  const google = async () => {
    haptic.light();
    if (!online) {
      toast.error("You're offline. Connect to the internet to sign in.");
      return;
    }
    setBusy(true);
    const { error: oauthError } = await signInWithGoogle();
    if (oauthError) {
      setBusy(false);
      cleanAuthFragment();
      toast.error(humanizeError(new Error(oauthError)));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!online) {
      toast.error("You're offline. Connect to the internet to sign in.");
      return;
    }

    if (mode === "forgot") {
      const parsed = z.string().email().safeParse(email.trim());
      if (!parsed.success) return setError(t("auth.invalidEmail", "Enter a valid email"));
      setBusy(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setBusy(false);
      if (resetError) return setError(humanizeError(resetError));
      toast.success(t("auth.resetLinkSent", "Password reset link sent. Check your inbox."));
      setMode("signin");
      return;
    }

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success)
      return setError(parsed.error.issues[0]?.message ?? t("auth.checkDetails", "Check your details"));

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          toast.success(t("auth.confirmEmail", "Check your email to confirm your account."));
          setMode("signin");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signInError) throw signInError;
        haptic.success();
      }
    } catch (caught) {
      analytics.error(caught, { stage: "auth", mode });
      setError(humanizeError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pt-[calc(env(safe-area-inset-top)+3rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      {mode !== "welcome" ? (
        <button
          type="button"
          onClick={goBack}
          aria-label={t("auth.back", "Go back")}
          className="press mb-4 -ml-2 flex size-10 items-center justify-center rounded-full bg-muted text-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
      ) : null}
      <HeartLeaf animate={false} className="size-16" />
      <h1 className="mt-6 text-3xl leading-tight font-semibold tracking-tight">
        {mode === "welcome" ? t("auth.welcomeTitle", "Welcome. You made it here.") : null}
        {mode === "signup" ? t("auth.signupTitle", "Create your account") : null}
        {mode === "signin" ? t("auth.signinTitle", "Welcome back") : null}
        {mode === "forgot" ? t("auth.forgotTitle", "Reset your password") : null}
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        {mode === "welcome"
          ? t(
              "auth.welcomeSubtitle",
              "Your streak, flags, wins and letters stay private to you — synced securely and available offline.",
            )
          : t("auth.otherSubtitle", "Everything you write is encrypted on your device and tied to your account only.")}
      </p>

      <div className="mt-8 flex flex-1 flex-col justify-between">
        {mode === "welcome" ? (
          <div className="flex flex-col gap-3 animate-rise">
            <Button className="press h-13 rounded-2xl text-base" disabled={busy} onClick={google}>
              {t("auth.continueGoogle", "Continue with Google")}
            </Button>
            <Button
              variant="secondary"
              className="press h-13 rounded-2xl text-base"
              onClick={() => goTo("signup")}
            >
              {t("auth.signupEmail", "Sign up with email")}
            </Button>
            <Button
              variant="ghost"
              className="press h-13 rounded-2xl text-base"
              onClick={() => goTo("signin")}
            >
              {t("auth.haveAccount", "I already have an account")}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4 animate-rise" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.emailLabel", "Email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={255}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-13 rounded-2xl"
                required
              />
            </div>

            {mode !== "forgot" ? (
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.passwordLabel", "Password")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  maxLength={72}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-13 rounded-2xl"
                  required
                />
              </div>
            ) : null}

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={busy} className="press h-13 rounded-2xl text-base">
              {mode === "signup"
                ? t("auth.createAccount", "Create account")
                : mode === "signin"
                  ? t("auth.signIn", "Sign in")
                  : t("auth.sendResetLink", "Send reset link")}
            </Button>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <button type="button" className="press" onClick={() => goTo(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? t("auth.createAnAccount", "Create an account") : t("auth.iHaveAccount", "I have an account")}
              </button>
              <button type="button" className="press" onClick={() => goTo("forgot")}>
                {t("auth.forgotPassword", "Forgot password?")}
              </button>
            </div>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          {t("auth.agreePrefix", "By continuing you agree to our")}{" "}
          <Link to="/terms" className="underline">
            {t("auth.termsLink", "Terms")}
          </Link>{" "}
          {t("auth.and", "and")}{" "}
          <Link to="/privacy" className="underline">
            {t("auth.privacyLink", "Privacy Policy")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
