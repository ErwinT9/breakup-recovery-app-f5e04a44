# Original splash screen backup (pre-logo change)

Restore prompt: "Restore the original splash screen from backup/splash-original".

Contents:
- `android-res/<drawable-dir>/splash.png` — original native Android launch splash bitmaps
  (plain white). Restore with:
  `for d in backup/splash-original/android-res/*/; do cp "$d/splash.png" "android/app/src/main/res/$(basename $d)/splash.png"; done`
  then `bun run sync:android`.
- `styles.xml` — original `android/app/src/main/res/values/styles.xml` (unchanged by the logo work).
- `HeartLeaf.tsx` — original in-app splash mark (still present at `src/components/HeartLeaf.tsx`).
- `index.tsx` — original `src/routes/index.tsx` splash route using `<HeartLeaf animate />`.
- `capacitor.config.ts` — original Capacitor config (unchanged by the logo work).

Nothing was deleted; the new logo lives at `src/assets/app-logo.png`.
