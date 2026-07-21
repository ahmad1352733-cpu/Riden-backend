/**
 * FCM v1 Push Notifications
 * يستخدم Firebase Cloud Messaging HTTP v1 API مع Service Account
 */
import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "riden2";
const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

let auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (auth) return auth;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL ?? "";
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    throw new Error("FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY غير مضبوطة");
  }

  auth = new GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  return auth;
}

async function getAccessToken(): Promise<string> {
  const client = await getAuth().getClient();
  const tokenRes = await client.getAccessToken();
  if (!tokenRes.token) throw new Error("فشل الحصول على access token من Google");
  return tokenRes.token;
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
