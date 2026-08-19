# Android Release Optimization Audit (AGP 8.13.0 — read-only)

Nothing was changed. Findings below are from `android/app/build.gradle`, `android/app/proguard-rules.pro`, `android/gradle.properties`, `android/app/src/main/res/`, `AndroidManifest.xml`, and `public/`.

## 1. Current optimization limitations

The code-shrinking side is already close to optimal. The remaining size/optimization gap is almost entirely **non-code payload** — web assets shipped inside the APK — plus a few bundle-splitting options that are currently switched off.

- **24 MB of meditation audio in `public/audio/`** is copied by `cap sync` into `android/app/src/main/assets/public/`. R8 and `shrinkResources` cannot touch assets. This dwarfs everything else in the build and is the single biggest limiter.
- **The entire web bundle (JS/CSS/fonts/images)** is likewise an asset — none of it participates in Android shrinking. Play's optimization score reads uncompressible asset bulk as unoptimized payload.
- **Language splits are disabled** (`bundle { language { enableSplit = false } }`), so every device downloads all bundled locales even though the app is English-only.
- **Full native debug symbols** (`ndk { debugSymbolLevel 'FULL' }`) inflate the uploaded AAB considerably. They are stripped from user delivery, but they enlarge the artifact Play analyses.
- **11 splash PNG variants (~370 KB)** plus a legacy launcher set; splash images are referenced from the theme, so `shrinkResources` keeps all of them.
- **`android:allowBackup="true"`** and a legacy `activity_main.xml` layout with a raw `WebView` — the layout is unused by Capacitor's `BridgeActivity` but is referenced-safe, so it stays.
- **No `resConfigs`-equivalent shrink of vector/mipmap density buckets** — mipmaps in 5 densities are correct and should stay.

## 2. Exact files / rules responsible

| Area | File | Detail |
|---|---|---|
| Audio payload | `public/audio/meditation/*.m4a` | 24 MB, shipped as assets |
| Language split off | `android/app/build.gradle` (`bundle { language { enableSplit = false } }`) | forces single monolithic language slice |
| Native symbols | `android/app/build.gradle` (`debugSymbolLevel 'FULL'`) | large symbol payload in AAB |
| Splash resources | `res/drawable-*/splash.png` (11 files) | theme-referenced, unshrinkable |
| Keep rules | `android/app/proguard-rules.pro` | already tightly scoped — see §5 |
| Gradle flags | `android/gradle.properties` | R8 full mode is AGP 8 default; nothing disabling it |

Positive findings: `minifyEnabled true`, `shrinkResources true`, `proguard-android-optimize.txt`, `nonTransitiveRClass=true`, `resourceConfigurations += ["en"]`, and no broad `-keep class com.google.firebase.**` / `com.revenuecat.**` rules. The Capacitor keeps are the minimum required set.

## 3. Safe improvements available (classified)

🟢 **Safe**
1. **Stream the meditation audio instead of bundling it** — host the four `.m4a` files on Supabase Storage (or any CDN) and load by URL, with an optional on-device cache. Removes ~24 MB from the APK.
2. **Re-encode the audio** if bundling must stay — 64 kbps mono AAC for ambient loops is transparent; typically a 60–75% reduction.
3. **Enable language splits** — `bundle { language { enableSplit = true } }`. The app is English-only, so behaviour is unchanged.
4. **Drop the unused `res/layout/activity_main.xml`** — Capacitor's `BridgeActivity` never inflates it.
5. **Set `android:allowBackup="false"`** — matches an app whose state lives in Supabase; also removes a Play data-safety flag.
6. **Prune the 8 landscape/portrait splash variants** down to a single density-independent splash drawable.

🟡 **Needs testing**
7. **`debugSymbolLevel 'SYMBOL_TABLE'` instead of `'FULL'`** — still symbolicates native crash frames, much smaller artifact. Verify a native Crashlytics report after the change.
8. **`android.enableR8.fullMode=true` written explicitly** in `gradle.properties` — it is the AGP 8 default, but pinning it guards against future default changes. Requires a full release smoke test (push, Google sign-in, RevenueCat purchase).
9. **Repackage obfuscated classes** with `-repackageclasses ''` in ProGuard rules — small DEX/string-pool win. Must be validated against Capacitor's reflective plugin lookup and Crashlytics deobfuscation mapping upload.
10. **Vite bundle trimming** — audit unused Radix/shadcn components and split the route bundles; reduces asset weight directly.

🔴 **Risky / not recommended**
11. Removing `-keep @com.getcapacitor.annotation.CapacitorPlugin` / `@interface` keeps — this is exactly what caused the earlier `getPermissionStates` NPE crash.
12. Adding `-dontwarn`/aggressive `-assumenosideeffects` for Firebase or RevenueCat — silently breaks push registration and entitlement checks.
13. `-overloadaggressively` or class-name obfuscation of plugin classes — Capacitor resolves plugins by name.
14. Removing `resourceConfigurations += ["en"]` or the mipmap density set.
15. Any AGP/Gradle/Capacitor/Firebase version change — out of scope and independently risky.

## 4. Expected benefit

| Change | Expected effect |
|---|---|
| Stream audio (1) | −24 MB download; largest single improvement to the Play score |
| Re-encode audio (2) | −14 to −18 MB if kept local |
| Language splits (3) | small (<1 MB), but Play explicitly scores split coverage |
| SYMBOL_TABLE symbols (7) | typically −5 to −15 MB of uploaded AAB |
| Splash/layout cleanup (4,6) | ~0.3 MB, plus a cleaner resource table |
| repackageclasses (9) | ~1–3% DEX |
| Web bundle trim (10) | 0.5–2 MB depending on what is unused |

Realistically, (1) or (2) alone moves the Play optimization figure the most; everything else is incremental.

## 5. What should NOT be changed

- Every existing rule in `proguard-rules.pro` — the Capacitor plugin/annotation keeps, `@JavascriptInterface` keep, Cordova keep, and the `SourceFile,LineNumberTable` attributes for readable crash reports.
- `minifyEnabled` / `shrinkResources` / `proguard-android-optimize.txt` (already correct).
- Package name, `google-services.json`, Firebase plugin wiring, Supabase config, OAuth intent filters, RevenueCat setup.
- AGP 8.13.0, Gradle 8.14.3, Capacitor 8.5.0, Firebase BoM.

## Next step

Tell me which numbered items you want implemented and I'll do exactly those.
