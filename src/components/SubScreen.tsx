import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { haptic } from "@/lib/native/haptics";
import { cn } from "@/lib/utils";

/** Shared push-screen chrome: back button (also the Android back target), title, body. */
export function SubScreen({
  title,
  description,
  children,
  headerClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  headerClassName?: string;
}) {
  const router = useRouter();
  return (
    <div className="animate-in slide-in-from-right-6 fade-in mx-auto flex min-h-screen w-full max-w-md flex-col duration-300">
      <header
        className={cn(
          "rounded-b-[2rem] bg-muted/60 px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6",
          headerClassName,
        )}
      >
        <button
          type="button"
          aria-label="Go back"
          onClick={() => {
            haptic.light();
            router.history.back();
          }}
          className="press flex size-10 items-center justify-center rounded-full bg-background"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <h1 className="mt-4 text-[1.75rem] font-semibold leading-tight tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </header>
      <main className="flex-1 px-5 py-6 pb-24">{children}</main>
    </div>
  );
}