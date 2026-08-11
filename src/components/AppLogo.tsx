import logo from "@/assets/app-logo.png";
import { cn } from "@/lib/utils";

/**
 * Brand mark: green heart formed of leaves.
 * Used on the in-app splash and the auth screens. The previous SVG mark
 * (HeartLeaf.tsx) is kept in the codebase so it can be restored.
 */
export function AppLogo({ animate = false, className }: { animate?: boolean; className?: string }) {
  return (
    <img
      src={logo}
      alt="No Contact Tracker logo"
      className={cn("size-32 object-contain select-none", animate && "animate-logo-reveal", className)}
      draggable={false}
    />
  );
}
