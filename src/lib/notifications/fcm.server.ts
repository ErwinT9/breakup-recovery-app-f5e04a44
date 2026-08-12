// Firebase Cloud Messaging (HTTP v1) sender — server only.
//
// The service-account JSON lives ONLY in the FIREBASE_SERVICE_ACCOUNT secret.
// It is never bundled into the app, Capacitor, public JSON or git.

export type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export const NOTIFICATION_CHANNEL_ID = "no-contact-reminders";

export function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env['FIREBASE_SERVICE_ACCOUNT'];
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
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
export async function getAccessToken(sa: ServiceAccount): Promise<string> {
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
  const token = (await response.json()) as { access_token?: string };
  if (!response.ok || !token.access_token) {
    throw new Error(`Google auth failed: ${JSON.stringify(token)}`);
  }
  return token.access_token;
}

export type SendResult = { ok: boolean; status: number; detail: string; invalid: boolean };

/** Sends one message to a single device token. */
export async function sendToToken(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
): Promise<SendResult> {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data,
          android: {
            priority: "HIGH",
            notification: { channel_id: NOTIFICATION_CHANNEL_ID },
          },
        },
      }),
    },
  );
  if (response.ok) return { ok: true, status: response.status, detail: "", invalid: false };
  const detail = await response.text();
  const invalid = response.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(detail);
  return { ok: false, status: response.status, detail, invalid };
}

/** "16:30" and "2026-08-12" for a given IANA timezone. */
export function localClock(timezone: string, now: Date): { time: string; date: string } | null {
  try {
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return { time, date };
  } catch {
    return null;
  }
}
