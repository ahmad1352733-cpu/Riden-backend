/**
 * FCM v1 Push Notifications
 * يستخدم Firebase Cloud Messaging HTTP v1 API مع Service Account
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "riden-be20b";
const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// Service account credentials (نخزّنهم كـ env vars)
const SA_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ?? "";
const SA_PRIVATE_KEY  = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp > now + 60) return cachedToken.token;

  if (!SA_CLIENT_EMAIL || !SA_PRIVATE_KEY) {
    throw new Error("FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY غير مضبوطة");
  }

  // بناء JWT يدوياً بدون مكتبات خارجية
  const { createSign } = await import("node:crypto");
  const header  = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({
    iss: SA_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const toSign = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(toSign);
  const sig = sign.sign(SA_PRIVATE_KEY, "base64url");
  const jwt = `${toSign}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth2:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json() as any;
  if (!json.access_token) throw new Error("FCM OAuth2 فشل: " + JSON.stringify(json));
  cachedToken = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return cachedToken.token;
}

function b64url(str: string) {
  return Buffer.from(str).toString("base64url");
}

export async function sendPush(
  tokens: (string | null | undefined)[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  priority: "default" | "high" = "high",
): Promise<void> {
  const valid = tokens.filter(t => t && typeof t === "string" && t.length > 10) as string[];
  if (valid.length === 0) return;

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    console.error("[push] FCM auth error:", e);
    return;
  }

  const channelId = (data?.channelId as string) ?? "general";
  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    stringData[k] = String(v);
  }
  stringData.title = title;
  stringData.body  = body;
  stringData.channelId = channelId;

  for (const token of valid) {
    try {
      console.log("[push] FCM v1 → token:", token.slice(0, 20) + "...");
      const res = await fetch(FCM_V1_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: stringData,
            android: {
              priority: priority === "high" ? "HIGH" : "NORMAL",
              notification: {
                channel_id: channelId,
                notification_priority: "PRIORITY_MAX",
                sound: "default",
                default_vibrate_timings: true,
                click_action: "OPEN_ACTIVITY_1",
              },
            },
          },
        }),
      });
      const json = await res.json() as any;
      if (json.name) {
        console.log("[push] FCM v1 ✓ sent:", json.name);
      } else {
        console.error("[push] FCM v1 ✗ error:", JSON.stringify(json));
      }
    } catch (e) {
      console.error("[push] FCM v1 send error:", e);
    }
  }
}

export { sendPush as sendPushNotifications };
