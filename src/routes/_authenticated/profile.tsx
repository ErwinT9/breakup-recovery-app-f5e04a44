import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Crown,

  Image as ImageIcon,
  KeyRound,
  Mail,
  Pencil,
  Moon,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SoftCard } from "@/components/SoftCard";
import { AvatarCropper } from "@/components/AvatarCropper";
import { UserAvatar } from "@/components/UserAvatar";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/lib/theme";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { clearUserCache, profileRepo, streakRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { activity } from "@/lib/badgeActivity";
import { useSubscription } from "@/hooks/useSubscription";
import { analytics, humanizeError } from "@/lib/analytics";
import { isPasswordUser } from "@/lib/authProvider";
import { supabase } from "@/integrations/supabase/client";
import { pickImageSource } from "@/lib/avatar";
import { haptic } from "@/lib/native/haptics";
import { daysSince } from "@/lib/streak";
import { clearAllLocalData, storage } from "@/lib/native/storage";
import { deleteMyAccount } from "@/lib/account";
import { toastOnce } from "@/lib/toastOnce";
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_CATEGORIES,
  deactivatePushToken,
  ensurePushChannel,
  loadNotificationPrefs,
  syncNotificationDeviceState,
  registerPush,
  notificationPermissionGranted,
  saveNotificationPrefs,
  syncReminders,
  type NotificationPrefs,
} from "@/lib/notifications";
import {
  checkPermission,
  openNotificationSettings,
  requestPermission,
  type PermissionState,
} from "@/lib/native/permissions";
import { isNative } from "@/lib/native/platform";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Settings | No Contact Tracker" },
      {
        name: "description",
        content: "Manage your profile, reminders, backup and account.",
      },
      { property: "og:title", content: "Settings | No Contact Tracker" },
      { property: "og:description", content: "Your account, reminders and privacy settings." },
    ],
  }),
  component: SettingsScreen,
});

type NotifPrefs = NotificationPrefs;
const DEFAULT_NOTIFS: NotifPrefs = DEFAULT_NOTIFICATION_PREFS;
const NOTIF_ENABLED_KEY = "nc:notifications-enabled";

function Row({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SettingsScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const userId = user?.id ?? "";
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isPremium } = useSubscription();
  const theme = useTheme();
  const canChangePassword = isPasswordUser(user);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [recovery, setRecovery] = useState("");
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [finalOpen, setFinalOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [deleting, setDeleting] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifOn, setNotifOn] = useState(false);
  // OS-level (Android system) notification permission — the master control.
  const [permState, setPermState] = useState<PermissionState>("granted");

  const systemBlocked = permState === "denied" || permState === "blocked";

  const refreshPermission = useCallback(async () => {
    const state = await checkPermission("notifications");
    setPermState(state);
    // Mirror the real OS state (and timezone) to Supabase on every re-check.
    if (userId) void syncNotificationDeviceState(userId);
    return state;
  }, [userId]);

  useEffect(() => {
    analytics.screen("settings");
    void loadNotificationPrefs().then(setNotifs);
    void storage.get<boolean>(NOTIF_ENABLED_KEY, false).then((value) => setNotifOn(Boolean(value)));
  }, []);

  // Re-check the OS permission on open and whenever the user comes back from
  // the Android settings screen, so the UI never shows a stale state.
  useEffect(() => {
    void refreshPermission();
    let remove: (() => void) | undefined;
    if (isNative()) {
      void import("@capacitor/app")
        .then(({ App }) =>
          App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) void refreshPermission();
          }),
        )
        .then((handle) => {
          remove = () => void handle.remove();
        })
        .catch(() => {});
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshPermission();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      remove?.();
    };
  }, [refreshPermission]);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileRepo.get(userId),
    enabled: Boolean(userId),
  });
  const streak = useQuery({
    queryKey: ["streak", userId],
    queryFn: () => streakRepo.get(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.display_name ?? "");
    setBio(profile.data.bio ?? "");
    setAvatar(profile.data.avatar_url ?? "");
  }, [profile.data]);

  /** 1-based recovery day, shared with the server-side 30-day rotation. */
  const currentRecoveryDay = () =>
    streak.data?.started_at ? daysSince(streak.data.started_at) + 1 : 1;

  useEffect(() => {
    if (streak.data?.started_at) setRecovery(streak.data.started_at.slice(0, 16));
  }, [streak.data?.started_at]);

  // The switch mirrors the saved preference; if the OS permission was revoked
  // outside the app we fall back to off so the control never lies.
  useEffect(() => {
    const saved = profile.data?.notifications_enabled;
    if (saved === undefined) return;
    if (!saved) {
      setNotifOn(false);
      void storage.set(NOTIF_ENABLED_KEY, false);
      return;
    }
    void notificationPermissionGranted().then((granted) => {
      // "unsupported" platforms (web preview) report false — keep the stored
      // preference there instead of forcing the toggle off.
      setNotifOn(granted || typeof Notification === "undefined");
    });
  }, [profile.data?.notifications_enabled]);

  const update = useMutation({
    mutationFn: async (patch: Parameters<typeof profileRepo.update>[1]) =>
      profileRepo.update(userId, patch),
    onSuccess: (next) => {
      queryClient.setQueryData(["profile", userId], next);
      analytics.track("profile_updated");
      if (next.display_name) activity.profileSetupDone();
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const saveNotifs = async (patch: Partial<NotifPrefs>) => {
    const next = { ...notifs, ...patch };
    setNotifs(next);
    haptic.select();
    await saveNotificationPrefs(next);
    await syncReminders({
      enabled: profile.data?.notifications_enabled ?? false,
      morning: profile.data?.morning_reminder ?? true,
      evening: profile.data?.evening_reminder ?? true,
      categories: next,
      recoveryDay: currentRecoveryDay(),
    });
  };

  const toggleReminders = async (enabled: boolean) => {
    haptic.select();
    setNotifBusy(true);
    setNotifOn(enabled);
    try {
      if (!enabled) {
        await storage.set(NOTIF_ENABLED_KEY, false);
        await update.mutateAsync({ notifications_enabled: false });
        await syncReminders({ enabled: false, morning: false, evening: false, categories: notifs });
        await deactivatePushToken(userId || null);
        toast(t("settings.notificationsOff"));
        return;
      }

      // Feature-time request: also routes a permanent denial to the settings dialog.
      const state = await requestPermission("notifications");
      setPermState(state);
      if (state === "denied" || state === "blocked") {
        setNotifOn(false);
        await storage.set(NOTIF_ENABLED_KEY, false);
        await update.mutateAsync({ notifications_enabled: false });
        // Android best practice: don't leave a dead switch — send the user
        // straight to the app's system notification screen.
        toast(t("settings.notificationsSystemOff"));
        await openNotificationSettings();
        return;
      }

      // Channel first, then Firebase registration, then the local schedule.
      await ensurePushChannel();
      const token = await registerPush(userId);
      await storage.set(NOTIF_ENABLED_KEY, true);
      await update.mutateAsync({ notifications_enabled: true });
      await syncReminders({
        enabled: true,
        morning: profile.data?.morning_reminder ?? true,
        evening: profile.data?.evening_reminder ?? true,
        categories: notifs,
        recoveryDay: currentRecoveryDay(),
      });
      // Push the fresh permission + timezone up so the 16:30 dispatcher sees it.
      await syncNotificationDeviceState(userId);
      toast.success(token ? t("settings.notificationsOnDevice") : t("settings.notificationsOn"));
    } catch (error) {
      setNotifOn(!enabled);
      toast.error(humanizeError(error));
    } finally {
      setNotifBusy(false);
    }
  };

  const saveProfile = async () => {
    haptic.light();
    await update.mutateAsync({
      display_name: name.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatar.trim() || null,
    });
    if (recovery && streak.data) {
      const next = await streakRepo.setStart(userId, streak.data, new Date(recovery).toISOString());
      queryClient.setQueryData(["streak", userId], next);
    }
    toastOnce("profile-saved", t("toast.saved"), "success");
  };

  const choosePhoto = async () => {
    haptic.light();
    setPhotoBusy(true);
    try {
      const source = await pickImageSource();
      if (!source) return;
      setCropSource(source);
    } catch {
      toastOnce("avatar-failed", t("toast.photoFailed"), "error");
    } finally {
      setPhotoBusy(false);
    }
  };

  /** Persists the cropped square image and refreshes every avatar in the app. */
  const saveCroppedPhoto = async (dataUrl: string) => {
    setPhotoBusy(true);
    try {
      setAvatar(dataUrl);
      await update.mutateAsync({ avatar_url: dataUrl });
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setCropSource(null);
      toastOnce("avatar-updated", t("toast.photoUpdated"), "success");
    } catch {
      toastOnce("avatar-failed", t("toast.photoFailed"), "error");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    haptic.light();
    setAvatar("");
    await update.mutateAsync({ avatar_url: null });
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    toastOnce("avatar-removed", t("toast.photoRemoved"), "success");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await clearUserCache(userId);
      await queryClient.cancelQueries();
      queryClient.clear();
      await signOut();
      await clearAllLocalData();
      setFinalOpen(false);
      setDeleteOpen(false);
      setCountdown(5);
      setDeletedOpen(true);
    } catch (error) {
      toast.error(humanizeError(error));
    } finally {
      setDeleting(false);
      setConfirmText("");
    }
  };

  useEffect(() => {
    if (!deletedOpen) return;
    const timer = window.setInterval(() => {
      setCountdown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deletedOpen]);

  // Redirect once the countdown reaches zero. Navigation must live in its own
  // effect (never inside a state updater) so it actually runs, and we fall back
  // to a hard load so the Android WebView always lands on the sign-in screen.
  useEffect(() => {
    if (!deletedOpen || countdown > 0) return;
    void navigate({ to: "/auth", replace: true });
    const fallback = window.setTimeout(() => {
      if (window.location.pathname !== "/auth") window.location.replace("/auth");
    }, 400);
    return () => window.clearTimeout(fallback);
  }, [deletedOpen, countdown, navigate]);

  return (
    <div className="animate-in slide-in-from-right-6 fade-in mx-auto flex min-h-screen w-full max-w-md flex-col duration-300">
      <header className="rounded-b-[2rem] bg-muted/60 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6">
        <button
          type="button"
          aria-label={t("common.back")}
          onClick={() => {
            haptic.light();
            router.history.back();
          }}
          className="press flex size-10 items-center justify-center rounded-full bg-background"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="mt-4 text-[2rem] font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <main className="flex-1 space-y-4 px-5 py-5">
        <SoftCard className="space-y-4">
          <Row
            icon={UserRound}
            title={t("settings.editProfile")}
            description={t("settings.editProfileDesc")}
          />
          <div className="flex items-center gap-4">
            <UserAvatar
              src={avatar || null}
              name={name}
              alt={t("settings.profilePhoto")}
              className="size-16 text-xl"
            />
            <div className="flex-1 space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <ImageIcon className="size-4" aria-hidden /> {t("settings.profilePhoto")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="press h-10 rounded-2xl"
                  disabled={photoBusy}
                  onClick={() => void choosePhoto()}
                >
                  <Upload className="size-4" aria-hidden />
                  {avatar ? t("common.change") : t("common.upload")}
                </Button>
                {avatar ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="press h-10 rounded-2xl text-destructive"
                    disabled={photoBusy}
                    onClick={() => void removePhoto()}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {t("common.remove")}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.photoHint")}</p>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="display-name">{t("settings.displayName")}</Label>
            <Input
              id="display-name"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bio">{t("settings.bio")}</Label>
            <Textarea
              id="bio"
              maxLength={200}
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="recovery-date" className="flex items-center gap-2">
              <CalendarDays className="size-4" aria-hidden /> {t("settings.recoveryStart")}
            </Label>
            <Input
              id="recovery-date"
              type="datetime-local"
              value={recovery}
              max={new Date().toISOString().slice(0, 16)}
              onChange={(event) => setRecovery(event.target.value)}
              className="h-12 rounded-2xl"
            />
          </div>
          <Button
            className="press h-12 w-full rounded-2xl"
            disabled={update.isPending}
            onClick={() => void saveProfile()}
          >
            {t("settings.saveChanges")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="press h-12 w-full justify-start rounded-2xl"
            onClick={() => {
              haptic.light();
              if (!canChangePassword) {
                toastOnce(
                  "google-password",
                  "You signed in using your Google account. Your password is managed by Google and cannot be changed from within the app.",
                );
                return;
              }
              void navigate({ to: "/change-password" });
            }}
          >
            <KeyRound className="size-4" aria-hidden />
            Change Password
          </Button>
        </SoftCard>

        <SoftCard className="space-y-4">
          <Row
            icon={Bell}
            title={t("settings.notifications")}
            description={t("settings.notificationsDesc")}
          >
            <Switch
              // Android permission is authoritative: while blocked the switch
              // reads OFF, but the saved preference in Supabase is untouched.
              checked={notifOn && !systemBlocked}
              onCheckedChange={(checked) => {
                if (systemBlocked) {
                  haptic.light();
                  toast(t("settings.notificationsSystemOff"));
                  void openNotificationSettings();
                  return;
                }
                void toggleReminders(checked);
              }}
              disabled={notifBusy}
              aria-label={t("settings.notifications")}
            />
          </Row>
          {systemBlocked ? (
            <div className="space-y-3 rounded-2xl bg-muted/60 p-3">
              <p className="text-sm text-muted-foreground">
                {t("settings.notificationsSystemOff")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.notificationsSystemOffHint")}
              </p>
              <Button
                variant="outline"
                className="press h-11 w-full rounded-2xl"
                onClick={() => {
                  haptic.light();
                  toast(t("settings.openingSystemSettings"));
                  void openNotificationSettings();
                }}
              >
                {t("settings.openSystemNotifications")}
              </Button>
            </div>
          ) : null}
          {notifOn || systemBlocked ? (
            <div
              className={
                systemBlocked ? "space-y-3 pointer-events-none opacity-50" : "space-y-3"
              }
              aria-disabled={systemBlocked}
            >
              {NOTIFICATION_CATEGORIES.filter(
                ({ key }) => key !== "morning" && key !== "evening",
              ).map(({ key, labelKey, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{t(labelKey, label)}</span>
                  <Switch
                    checked={notifs[key]}
                    onCheckedChange={(checked) => void saveNotifs({ [key]: checked })}
                    disabled={systemBlocked}
                    aria-label={t(labelKey, label)}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("settings.morningReminder")}</span>
                <Switch
                  checked={profile.data?.morning_reminder ?? true}
                  disabled={systemBlocked}
                  onCheckedChange={(checked) => {
                    void update.mutateAsync({ morning_reminder: checked }).then(() =>
                      syncReminders({
                        enabled: true,
                        morning: checked,
                        evening: profile.data?.evening_reminder ?? true,
                        recoveryDay: currentRecoveryDay(),
                      }),
                    );
                  }}
                  aria-label={t("settings.morningReminder")}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {t("settings.eveningReminder")}
                  <span className="block text-xs text-muted-foreground">
                    {t("settings.eveningReminderDesc")}
                  </span>
                </span>
                <Switch
                  checked={profile.data?.evening_reminder ?? true}
                  disabled={systemBlocked}
                  onCheckedChange={(checked) => {
                    void update.mutateAsync({ evening_reminder: checked }).then(() =>
                      syncReminders({
                        enabled: true,
                        morning: profile.data?.morning_reminder ?? true,
                        evening: checked,
                        recoveryDay: currentRecoveryDay(),
                      }),
                    );
                  }}
                  aria-label={t("settings.eveningReminder")}
                />
              </div>
            </div>
          ) : null}
        </SoftCard>

        <SoftCard className="space-y-3">
          <Row
            icon={Moon}
            title={t("settings.appearance")}
            description={t("settings.appearanceDesc")}
          />
          <Select
            value={theme.resolved}
            onValueChange={(value) => theme.setMode(value as ThemeMode)}
          >
            <SelectTrigger className="h-12 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
              <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
            </SelectContent>
          </Select>
        </SoftCard>

        {!isPremium ? (
          <Link to="/paywall" className="press block">
            <SoftCard className="bg-lavender flex items-center gap-3">
              <Crown className="size-5 text-on-tint" aria-hidden />
              <div className="flex-1">
                <p className="font-medium text-on-tint">{t("settings.goPremium")}</p>
                <p className="text-sm text-on-tint/75">{t("settings.goPremiumDesc")}</p>
              </div>
            </SoftCard>
          </Link>
        ) : (
          <SoftCard className="bg-lavender flex items-center gap-3">
            <Crown className="size-5 text-on-tint" aria-hidden />
            <p className="font-medium text-on-tint">{t("settings.premiumActive")}</p>
          </SoftCard>
        )}

        <Button
          variant="ghost"
          className="press h-12 w-full rounded-2xl text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" aria-hidden />
          {t("settings.deleteAccount")}
        </Button>
      </main>

      <AvatarCropper
        open={Boolean(cropSource)}
        source={cropSource}
        busy={photoBusy}
        onCancel={() => setCropSource(null)}
        onCropped={saveCroppedPhoto}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setConfirmText("");
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">{t("settings.deleteBody1")}</span>
              <span className="block">{t("settings.deleteBody2")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            placeholder={t("settings.typeDelete")}
            onChange={(event) => setConfirmText(event.target.value)}
            className="h-12 rounded-2xl"
            aria-label={t("settings.typeDelete")}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-2xl"
              disabled={deleting || confirmText.trim().toLowerCase() !== "delete"}
              onClick={() => setFinalOpen(true)}
            >
              {t("settings.deleteForever")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={finalOpen} onOpenChange={setFinalOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl" disabled={deleting}>
              {t("settings.keepAccount")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-2xl"
              disabled={deleting}
              onClick={() => void deleteAccount()}
            >
              {t("settings.deleteForever")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletedOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deletedTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deletedDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {t("settings.redirecting", { count: countdown })}
          </p>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
