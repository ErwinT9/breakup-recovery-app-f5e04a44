import { isNative } from "@/lib/native/platform";

/** Opens an external URL in an Android Custom Tab (native) or a new browser tab (web). */
export async function openExternalUrl(url: string): Promise<void> {
  if (isNative()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url, presentationStyle: "popover" });
      return;
    } catch {
      // fall through to web handling
    }
  }
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export const PRIVACY_URL = "https://vexalabs.biz/privacy";
export const TERMS_URL = "https://vexalabs.biz/terms";
