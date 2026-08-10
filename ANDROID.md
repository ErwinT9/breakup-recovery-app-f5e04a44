# Android (Capacitor) — build & release guide

App ID: `com.nocontacttracker.app` · App name: **No Contact Tracker**

The native Android project lives in `android/` and is committed to the repo.

---

## 1. Prerequisites

- Node/Bun (this repo uses Bun) and `bun install` completed
- JDK 21
- Android Studio (Ladybug or newer) with Android SDK 36 + build tools
- `ANDROID_HOME` set (Android Studio does this for you)

## 2. First-time setup after cloning

Build artifacts and generated plugin glue are intentionally not committed, so run:

```bash
bun install
bun run build:mobile   # produces the static SPA in dist/client
bun run sync:android   # copies web assets + regenerates plugin projects
```

`sync:android` recreates `android/capacitor-cordova-android-plugins/` and
`android/app/src/main/assets/public/`, which Gradle needs. Run it after **every**
web change before building the APK.

Open the project:

```bash
bun run open:android
```

## 3. Firebase Cloud Messaging

1. Create a Firebase project and add an Android app with package
   `com.nocontacttracker.app`.
2. Download `google-services.json` and place it at `android/app/google-services.json`.
   (It is gitignored — each developer/CI supplies their own.)
   The Google Services plugin is applied automatically when the file exists.
3. In Firebase → Project settings → Service accounts, generate a private key and
   store its JSON in the Supabase secret used by the `send-push-notification`
   edge function.

Notification appearance is already wired:
- small icon: `res/drawable/ic_stat_leaf.xml` (white silhouette)
- accent colour: `res/values/notification_colors.xml` (`#6BCB77`)
- default channel: `no-contact-reminders` (matches the app's local notifications)

Debug builds keep the same application ID on purpose, so FCM works in debug too.

## 4. Debug build / run on device

```bash
bun run build:mobile && bun run sync:android
cd android && ./gradlew assembleDebug
# or press Run in Android Studio
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`

## 5. Release signing

Create an upload keystore once:

```bash
keytool -genkey -v -keystore upload-keystore.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Copy `android/keystore.properties.example` to `android/keystore.properties` and
fill in the paths/passwords. Both the keystore and that file are gitignored.

If `keystore.properties` is absent the release build falls back to debug signing,
so the project always compiles — but never ship that artifact.

## 6. Release build

```bash
bun run build:mobile && bun run sync:android
cd android
./gradlew clean bundleRelease   # Play Store AAB
./gradlew assembleRelease       # sideloadable APK
```

Outputs:
- `android/app/build/outputs/bundle/release/app-release.aab`
- `android/app/build/outputs/apk/release/app-release.apk`

Release builds use R8 (`minifyEnabled` + `shrinkResources`) with keep rules for
Capacitor plugins, Firebase and RevenueCat in `android/app/proguard-rules.pro`.

## 7. Versioning

Bump `versionCode` (integer, must increase every Play upload) and `versionName`
in `android/app/build.gradle`.

## 8. Permissions declared

INTERNET, ACCESS_NETWORK_STATE, POST_NOTIFICATIONS, VIBRATE,
RECEIVE_BOOT_COMPLETED, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM.
Camera/photo permissions are merged in by `@capacitor/camera`; the camera
hardware feature is marked optional.

## 9. Installed Capacitor plugins

app, camera, device, filesystem, haptics, local-notifications, network,
preferences, push-notifications, share, splash-screen, status-bar,
and `@revenuecat/purchases-capacitor`.

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `project ':capacitor-cordova-android-plugins' not found` | run `bun run sync:android` |
| Blank white screen | web assets missing — rerun `build:mobile` then `sync:android` |
| Push not received | `google-services.json` missing or package mismatch |
| Gradle JVM errors | set Gradle JDK to 21 in Android Studio settings |

## Google Sign-In on Android (deep link)

The APK does not use the web redirect. `signInWithOAuth` is called with
`skipBrowserRedirect` and the URL is opened in a Custom Tab; Supabase then
returns to the app through this deep link:

```
com.nocontacttracker.app://auth-callback
```

Setup:

1. Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs:
   add `com.nocontacttracker.app://auth-callback`. Keep the existing
   `https://breakup-recovery-app.lovable.app/**` entry so the web app keeps working.
2. Run `bun run sync:android` so `@capacitor/browser` and the updated web assets
   land in the native project, then rebuild the APK.

Nothing changes in the Google Cloud console: Google still redirects to the
Supabase callback URL; only the final hop back into the app changed.

## Gboard voice typing

## Crashlytics & Performance Monitoring

Both are wired through the Firebase BoM in `android/app/build.gradle` (Crashlytics,
Crashlytics NDK, Analytics, Performance). The Crashlytics and Performance Gradle
plugins are applied at the top of that file, guarded by the presence of
`google-services.json`, so the project still builds without Firebase config.

- Release builds upload the R8 mapping file; debug builds skip the upload.
- ANRs are collected automatically on Android 11+; the NDK artifact adds native crashes.
- JS layer lives in `src/lib/monitoring/`. `analytics.track()` becomes a Crashlytics
  breadcrumb and `analytics.error()` becomes a non-fatal, so existing instrumentation
  is reused. Custom keys: screen, feature, app version/build, OS version, device model,
  network status, anonymous user id.
- Performance auto-collects app start, screen rendering, slow/frozen frames and native
  HTTP. WebView `fetch` calls are recorded as sampled `webview_http_request` traces.
- Everything is native-only and inert on web/SSR (plugins are dynamically imported).

Data appears in the Firebase console a few minutes after a real device session.

## Gboard voice typing

`android.captureInput` must remain `false` in `capacitor.config.ts`. When it is
`true`, Capacitor's WebView returns a `TYPE_NULL` input connection to the IME,
which disables composing text — Gboard voice typing, gesture typing and
autocorrect silently stop inserting text (Chrome is unaffected because it never
sets that flag). `MainActivity` also uses `windowSoftInputMode="adjustResize"`
so the focused field stays visible while dictation is active.

Run `bun run sync:android` after changing `capacitor.config.ts`, then rebuild.
