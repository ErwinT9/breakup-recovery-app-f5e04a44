/**
 * Turns the printable (line-art only) coloring illustration into a PNG the
 * user can download on the web or save/share on Android through Capacitor.
 */
import { toast } from "sonner";

import { isNative } from "@/lib/native/platform";

const FILE_NAME = "no-contact-coloring-page.png";

function svgToDataUrl(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const markup = new XMLSerializer().serializeToString(clone);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

async function renderPng(svg: SVGSVGElement): Promise<Blob> {
  const width = 1240;
  const height = 930;
  const image = new Image();
  image.crossOrigin = "anonymous";
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("render failed"));
  });
  image.src = svgToDataUrl(svg);
  await loaded;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("encode failed");
  return blob;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

export async function downloadColoringPage(svg: SVGSVGElement | null): Promise<void> {
  if (!svg) return;
  try {
    const blob = await renderPng(svg);

    if (isNative()) {
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import("@capacitor/filesystem"),
        import("@capacitor/share"),
      ]);
      const data = await blobToBase64(blob);
      const saved = await Filesystem.writeFile({
        path: FILE_NAME,
        data,
        directory: Directory.Cache,
      });
      try {
        await Share.share({
          title: "Your coloring page",
          text: "My 7-day streak reward",
          url: saved.uri,
          dialogTitle: "Save your coloring page",
        });
      } catch {
        /* user dismissed the share sheet */
      }
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = FILE_NAME;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Coloring page downloaded.");
  } catch {
    toast.error("Couldn't create the coloring page. Please try again.");
  }
}
