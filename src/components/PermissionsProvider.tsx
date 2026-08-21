import { Bell, Camera as CameraIcon, Images, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isNative } from "@/lib/native/platform";
import {
  PERMISSION_COPY,
  PERMISSION_ONBOARDED_KEY,
  checkPermission,
  openAppSettings,
  requestPermission,
  setPermissionBlockedHandler,
  type PermissionKey,
} from "@/lib/native/permissions";
import { storage } from "@/lib/native/storage";
import { setImageSourceChooser, type ImageSource } from "@/lib/native/imageSource";
import { syncNotificationDeviceState } from "@/lib/notifications/deviceState";

const ICONS: Record<PermissionKey, typeof Bell> = {
  notifications: Bell,
  camera: CameraIcon,
  photos: Images,
};

/**
 * Only notifications are asked up-front: camera is requested at the moment the
 * user taps "Take photo", and the gallery needs no permission at all because
 * it uses the system photo picker.
 */
const ONBOARDING_ORDER: PermissionKey[] = ["notifications"];

/**
 * Owns the two pieces of permission UI:
 *  - the first-launch sequence (one friendly explainer per permission)
 *  - the "permanently denied" dialog with a shortcut to system settings
 */
export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<PermissionKey[]>([]);
  const [blocked, setBlocked] = useState<PermissionKey | null>(null);
  const [sourceResolve, setSourceResolve] = useState<((source: ImageSource | null) => void) | null>(
    null,
  );

  useEffect(() => {
    setPermissionBlockedHandler((key) => setBlocked(key));
    return () => setPermissionBlockedHandler(null);
  }, []);

  useEffect(() => {
    setImageSourceChooser((resolve) => setSourceResolve(() => resolve));
    return () => setImageSourceChooser(null);
  }, []);

  const chooseSource = (source: ImageSource | null) => {
    sourceResolve?.(source);
    setSourceResolve(null);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isNative()) return;
      if (await storage.get<boolean>(PERMISSION_ONBOARDED_KEY, false)) return;
      const pending: PermissionKey[] = [];
      for (const key of ONBOARDING_ORDER) {
        // Only ask for what the OS can still prompt for.
        if ((await checkPermission(key)) === "prompt") pending.push(key);
      }
      await storage.set(PERMISSION_ONBOARDED_KEY, true);
      if (!cancelled && pending.length > 0) setQueue(pending);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = queue[0] ?? null;
  const advance = () => setQueue((rest) => rest.slice(1));

  const allow = async () => {
    if (!current) return;
    const state = await requestPermission(current);
    // Persist the newly granted/denied Android state immediately for the
    // signed-in user instead of waiting for a later app resume.
    if (current === "notifications" && user?.id && state !== "unsupported" && state !== "prompt") {
      await syncNotificationDeviceState(user.id);
    }
    advance();
  };

  return (
    <>
      {children}

      {/* First-launch explainer, one permission at a time */}
      <Dialog open={Boolean(current)} onOpenChange={(open) => (!open ? advance() : undefined)}>
        <DialogContent className="max-w-sm rounded-3xl">
          {current ? <Explainer permission={current} /> : null}
          <DialogFooter className="mt-2 flex-row gap-2 sm:justify-end">
            <Button variant="ghost" className="flex-1 rounded-full" onClick={advance}>
              Not now
            </Button>
            <Button className="flex-1 rounded-full" onClick={() => void allow()}>
              Allow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanently denied — offer system settings */}
      <Dialog
        open={Boolean(sourceResolve)}
        onOpenChange={(open) => (!open ? chooseSource(null) : undefined)}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader className="items-center text-center">
            <DialogTitle>Add a photo</DialogTitle>
            <DialogDescription>Take a new photo or choose one from your gallery.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-row gap-2 sm:justify-end">
            <Button
              variant="secondary"
              className="flex-1 rounded-full"
              onClick={() => chooseSource("gallery")}
            >
              <Images className="mr-2 size-4" />
              Gallery
            </Button>
            <Button className="flex-1 rounded-full" onClick={() => chooseSource("camera")}>
              <CameraIcon className="mr-2 size-4" />
              Camera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(blocked)}
        onOpenChange={(open) => (!open ? setBlocked(null) : undefined)}
      >
        <DialogContent className="max-w-sm rounded-3xl">
          {blocked ? (
            <>
              <Explainer permission={blocked} blocked />
              <DialogFooter className="mt-2 flex-row gap-2 sm:justify-end">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-full"
                  onClick={() => setBlocked(null)}
                >
                  Not now
                </Button>
                <Button
                  className="flex-1 rounded-full"
                  onClick={() => {
                    setBlocked(null);
                    void openAppSettings();
                  }}
                >
                  <Settings2 className="mr-2 size-4" />
                  Open settings
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Explainer({ permission, blocked }: { permission: PermissionKey; blocked?: boolean }) {
  const copy = PERMISSION_COPY[permission];
  const Icon = ICONS[permission];
  return (
    <DialogHeader className="items-center text-center">
      <span className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="size-7" />
      </span>
      <DialogTitle>
        {blocked ? `${copy.title} is turned off` : `Allow ${copy.title.toLowerCase()}?`}
      </DialogTitle>
      <DialogDescription className="text-balance">
        {blocked ? `${copy.why} ${copy.settingsHint}` : copy.why}
      </DialogDescription>
    </DialogHeader>
  );
}
