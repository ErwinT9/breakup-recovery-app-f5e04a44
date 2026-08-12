import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

export type PushSendResult = {
  sent: number;
  deactivated: number;
  total: number;
  message?: string;
};

/**
 * Invokes the `send-push-notification` Edge Function as the *signed-in user*.
 *
 * The user's Supabase access token is attached explicitly — `functions.invoke`
 * otherwise falls back to the publishable/anon key, which the function rejects
 * with 401 Unauthorized. No service-role key is ever used from the browser:
 * the function itself resolves the caller and only allows notifying their own
 * devices.
 */
export async function sendPushToSelf(
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<PushSendResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session?.access_token || !session.user?.id) {
    throw new Error("You need to be signed in to send a notification.");
  }

  const response = await supabase.functions.invoke<PushSendResult & { error?: string }>(
    "send-push-notification",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {
        user_id: session.user.id,
        title,
        body,
        data,
      },
    },
  );

  if (response.error) {
    // Surface the function's own JSON error message when it sent one.
    let detail = response.error.message;
    const context = (response.error as { context?: Response }).context;
    try {
      const payload = await context?.clone().json();
      if (payload?.error) detail = String(payload.error);
    } catch {
      // Non-JSON body; keep the generic message.
    }
    analytics.error(new Error(detail), { stage: "push_send" });
    throw new Error(detail);
  }

  const result = response.data;
  if (!result) throw new Error("The notification service returned an empty response.");
  if (result.sent === 0) {
    throw new Error(
      result.message ??
        "No active device is registered for push notifications. Open the app on your phone with notifications enabled, then try again.",
    );
  }
  return result;
}
