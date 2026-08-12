import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Deep-link target used by the Evening Reminder notification. The check-in
 * itself lives on Home, so this route forwards there and asks Home to open the
 * check-in sheet immediately.
 */
export const Route = createFileRoute("/_authenticated/check-in")({
  beforeLoad: () => {
    throw redirect({ to: "/home", search: { checkin: "1" } as never, replace: true });
  },
  component: () => null,
});
