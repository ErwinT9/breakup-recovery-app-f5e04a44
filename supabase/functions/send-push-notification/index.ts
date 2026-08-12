// Sends a Firebase Cloud Messaging push to every active device of a user.
//
// Secrets required (Supabase → Edge Function secrets):
//   FIREBASE_SERVICE_ACCOUNT  – the full service-account JSON, one line
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY – injected automatically
//
// Never called from the browser with Firebase credentials: the credentials
// only ever live inside this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = {
  user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) buffer[i] = raw.charCodeAt(i);
  return buffer.buffer;
}

/** Exchanges the service account for a short-lived FCM access token. */
async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key.replace(/\\n/g, "\n")),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  );
  const assertion = `${header}.${claim}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const token = await response.json();
  if (!response.ok) throw new Error(`Google auth failed: ${JSON.stringify(token)}`);
  return token.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountRaw) return json({ error: "FIREBASE_SERVICE_ACCOUNT is not configured" }, 500);
    const serviceAccount = JSON.parse(serviceAccountRaw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearer = authHeader.replace("Bearer ", "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (!bearer) {
      return json({ error: "Missing Authorization header — sign in and retry." }, 401);
    }
    if (anonKey && bearer === anonKey) {
      // The client sent the publishable/anon key instead of the user session.
      return json(
        { error: "Missing user access token — the request was sent with the anon key." },
        401,
      );
    }

    // Trusted server callers may pass the service-role key and target any user.
    const isServiceCall = bearer === serviceRoleKey;
    let callerId: string | null = null;
    if (!isServiceCall) {
      const { data, error } = await admin.auth.getUser(bearer);
      if (error || !data.user) {
        console.error("auth.getUser failed", error?.message ?? "no user for token");
        return json({ error: "Invalid or expired session — please sign in again." }, 401);
      }
      callerId = data.user.id;
    }

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const targetUserId = payload.user_id ?? callerId;
    const title = (payload.title ?? "").toString().slice(0, 120);
    const body = (payload.body ?? "").toString().slice(0, 400);

    if (!targetUserId) return json({ error: "user_id is required" }, 400);
    if (!title || !body) return json({ error: "title and body are required" }, 400);
    // Signed-in users may only notify their own devices.
    if (!isServiceCall && targetUserId !== callerId) {
      return json({ error: "You can only send notifications to your own devices." }, 403);
    }

    const { data: tokens, error: tokenError } = await admin
      .from("push_tokens")
      .select("id, token")
      .eq("user_id", targetUserId)
      .eq("is_active", true);
    if (tokenError) {
      console.error("push_tokens query failed", tokenError.message);
      throw tokenError;
    }
    if (!tokens || tokens.length === 0) {
      return json({
        sent: 0,
        deactivated: 0,
        total: 0,
        message:
          "No active push token for this user. Open the Android app once with notifications enabled.",
      });
    }

    let accessToken: string;
    try {
      accessToken = await getAccessToken(serviceAccount);
    } catch (error) {
      console.error("firebase auth failed", (error as Error).message);
      return json(
        { error: "Firebase authentication failed — check FIREBASE_SERVICE_ACCOUNT." },
        502,
      );
    }
    const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    let sent = 0;
    const invalid: string[] = [];

    for (const row of tokens) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title, body },
            data: payload.data ?? {},
            android: { priority: "HIGH", notification: { channel_id: "no-contact-reminders" } },
          },
        }),
      });
      if (response.ok) {
        sent += 1;
        continue;
      }
      const detail = await response.text();
      if (response.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(detail)) {
        invalid.push(row.id as string);
      }
      console.error("fcm send failed", response.status, detail);
    }

    if (invalid.length > 0) {
      await admin.from("push_tokens").update({ is_active: false }).in("id", invalid);
    }

    return json({
      sent,
      deactivated: invalid.length,
      total: tokens.length,
      ...(sent === 0
        ? {
            message:
              invalid.length > 0
                ? "Device tokens were rejected by Firebase (unregistered) and have been deactivated. Reopen the app to re-register."
                : "Firebase rejected the send. Check the function logs for details.",
          }
        : {}),
    });
  } catch (error) {
    console.error("send-push-notification error", error);
    return json({ error: (error as Error).message ?? "Unexpected error" }, 500);
  }
});
