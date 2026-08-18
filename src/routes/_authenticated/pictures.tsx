import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/AppShell";
import { SoftCard } from "@/components/SoftCard";
import { PicturesIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { localId, pictureRepo } from "@/data/repository";
import { useAuth } from "@/hooks/useAuth";
import { activity } from "@/lib/badgeActivity";
import { humanizeError } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/native/haptics";
import { isNative } from "@/lib/native/platform";
import { pickImageSource } from "@/lib/avatar";

const BUCKET = "activity-pictures";

/** Turns the native picker's data URL into an uploadable file. */
async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  const extension = blob.type.split("/")[1] ?? "jpg";
  return new File([blob], `photo.${extension}`, { type: blob.type || "image/jpeg" });
}

export const Route = createFileRoute("/_authenticated/pictures")({
  head: () => ({
    meta: [
      { title: "Pictures | No Contact Tracker" },
      { name: "description", content: "Save the photos that remind you why you're staying strong." },
      { property: "og:title", content: "Pictures | No Contact Tracker" },
      { property: "og:description", content: "A private album for your reset." },
    ],
  }),
  component: Pictures,
});

function Pictures() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");

  const pictures = useQuery({
    queryKey: ["pictures", userId],
    queryFn: () => pictureRepo.list(userId),
    enabled: Boolean(userId),
  });

  const rows = pictures.data ?? [];

  const signed = useQuery({
    queryKey: ["pictures-signed", userId, rows.map((row) => row.image_url).join("|")],
    enabled: Boolean(userId) && rows.length > 0,
    queryFn: async () => {
      const paths = rows.map((row) => row.image_url).filter(Boolean);
      if (paths.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      }
      return map;
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const extension = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${localId()}.${extension}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (error) throw error;
      return pictureRepo.save(userId, { image_url: path, caption: caption.trim() || null });
    },
    onSuccess: (next) => {
      activity.featureUsed("pictures");
      queryClient.setQueryData(["pictures", userId], next);
      setCaption("");
      haptic.success();
      toast.success(t("pictures.savedToAlbum"));
    },
    onError: (error) => toast.error(humanizeError(error)),
  });

  const remove = useMutation({
    mutationFn: async ({ id, path }: { id: string; path: string }) => {
      await supabase.storage.from(BUCKET).remove([path]);
      return pictureRepo.remove(userId, id);
    },
    onSuccess: (next) => queryClient.setQueryData(["pictures", userId], next),
    onError: (error) => toast.error(humanizeError(error)),
  });

  return (
    <AppShell title={t("pictures.title")} subtitle={t("pictures.subtitle")}>
      <PicturesIllustration className="mx-auto mb-5 mt-1 w-40" />
      <SoftCard className="space-y-3">
        <Input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder={t("pictures.captionPlaceholder")}
          className="h-12 rounded-2xl"
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) upload.mutate(file);
          }}
        />
        <Button
          className="press h-12 w-full rounded-2xl"
          disabled={upload.isPending}
          onClick={() => {
            haptic.light();
            if (isNative()) {
              // Native picker asks for camera/gallery access only at this point.
              void pickImageSource().then(async (source) => {
                if (!source) return;
                upload.mutate(await dataUrlToFile(source));
              });
              return;
            }
            fileInput.current?.click();
          }}
        >
          <ImagePlus className="mr-2 size-4" aria-hidden />
          {upload.isPending ? t("pictures.uploading") : t("pictures.addPicture")}
        </Button>
      </SoftCard>

      {rows.length === 0 ? (
        <p className="mt-5 px-1 text-sm text-muted-foreground">
          {t("pictures.noPictures")}
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {rows.map((picture) => (
            <li key={picture.id} className="soft-card overflow-hidden rounded-3xl">
              {signed.data?.[picture.image_url] ? (
                <img
                  src={signed.data[picture.image_url]}
                  alt={picture.caption ?? t("pictures.savedPicture")}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="aspect-square w-full bg-muted" />
              )}
              <div className="flex items-start justify-between gap-2 p-3">
                <p className="min-w-0 text-xs break-words text-muted-foreground">
                  {picture.caption ?? new Date(picture.created_at).toLocaleDateString()}
                </p>
                <button
                  type="button"
                  aria-label={t("pictures.deletePicture")}
                  onClick={() => remove.mutate({ id: picture.id, path: picture.image_url })}
                  className="press text-muted-foreground"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
