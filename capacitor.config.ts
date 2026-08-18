import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nocontacttracker.app",
  appName: "No Contact Tracker",
  webDir: "dist/client",
  android: {
    backgroundColor: "#FFFFFF",
    // Stable https://localhost origin so Supabase auth storage survives restarts.
    androidScheme: "https",
    allowMixedContent: false,
    // Capacitor 7+ defaults this to "auto": when the app targets SDK 35 it adds
    // status/navigation-bar sized margins around the WebView, exposing the
    // window background as a solid band at the top. The web layer already
    // handles insets via env(safe-area-inset-*), so margins are disabled and
    // the WebView truly draws edge-to-edge.
    adjustMarginsForEdgeToEdge: "disable",
    // captureInput MUST stay false: when true the WebView sets
    // TYPE_NULL on the input connection, which disables IME composing text —
    // Gboard voice typing (and swipe/autocorrect) then never reaches inputs.
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // Safety net: if JS ever fails to boot, the OS still removes the splash
      // instead of leaving a permanent white screen. hideNativeSplash() hides
      // it earlier, as soon as React mounts.
      launchAutoHide: true,
      launchShowDuration: 3000,
      launchFadeOutDuration: 200,
      backgroundColor: "#FFFFFF",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_leaf",
      iconColor: "#6BCB77",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
