/**
 * Push Notifications — Hybrid
 * - ExponentPushToken[...] → Expo Push API
 * - FCM token             → FCM v1 HTTP API مع Service Account
 *
 * الـ credentials تُقرأ من Environment Variables (Railway dashboard)
 * FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
import { GoogleAuth } from "google-auth-library";

// ── FCM v1 Setup ──────────────────────────────────────────────────────────────
const PROJECT_ID   = process.env.FIREBASE_PROJECT_ID  ?? "riden2";
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL ?? "";
const PRIVATE_KEY  = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

let _auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (_auth) return _auth;

  if (!CLIENT_EMAIL || !PRIVATE_KEY) {
    throw new Error(
      "[push] FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY غير مضبوطة في env vars"
    );
  }

  _auth = new GoogleAuth({
    credentials: { client_email: CLIENT_EMAIL, private_key: PRIVATE_KEY },
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  return _auth;
}

async function getFcmAccessToken(): Promise<string> {
  const client   = await getAuth().getClient();
  const tokenRes = await client.getAccessToken();
  if (!tokenRes.token) throw new Error("[push] فشل الحصول على access token من Google");
  return tokenRes.token;
}

// ── Push Result ───────────────────────────────────────────────────────────────
export interface PushResult {
  /** عدد الـ tokens التي أُرسل إليها بنجاح */
  successCount: number;
  /** عدد الـ tokens التي فشل إرسالها */
  failureCount: number;
  /** تفاصيل الأخطاء لكل token */
  errors: { token: string; error: string }[];
}

// ── Expo Push ─────────────────────────────────────────────────────────────────
async function sendViaExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<PushResult> {
  const result: PushResult = { successCount: 0, failureCount: 0, errors: [] };

  const messages = tokens.map(to => ({
    to,
    title,
    body,
    data,
    priority: "high",
    sound: "default",
    channelId: data.channelId ?? "general",
  }));

  try {
    const res  = await fetch("https://exp.host/--/api/v2/push/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body:    JSON.stringify(messages),
    });
    const json    = await res.json() as any;
    const results: any[] = Array.isArray(json.data) ? json.data : [json.data ?? json];

    results.forEach((r, i) => {
      if (r?.status === "ok") {
        result.successCount++;
        console.log(`[push] Expo ✓ token[${i}]`);
      } else {
        result.failureCount++;
        const errMsg = JSON.stringify(r);
        result.errors.push({ token: tokens[i]?.slice(0, 20) ?? "?", error: errMsg });
        console.error(`[push] Expo ✗ token[${i}]:`, errMsg);
      }
    });
  } catch (e) {
    result.failureCount += tokens.length;
    const errMsg = String(e);
    tokens.forEach(t => result.errors.push({ token: t.slice(0, 20), error: errMsg }));
    console.error("[push] Expo send error:", e);
  }

  return result;
}

// ── FCM v1 ────────────────────────────────────────────────────────────────────
async function sendViaFcm(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>,
  channelId: string,
): Promise<PushResult> {
  const result: PushResult = { successCount: 0, failureCount: 0, errors: [] };

  let accessToken: string;
  try {
    accessToken = await getFcmAccessToken();
  } catch (e) {
    const errMsg = String(e);
    console.error("[push] FCM auth error:", errMsg);
    tokens.forEach(t => result.errors.push({ token: t.slice(0, 20), error: "auth_error: " + errMsg }));
    result.failureCount = tokens.length;
    return result;
  }

  for (const token of tokens) {
    try {
      const res  = await fetch(FCM_V1_URL, {
        method:  "POST",
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data,
            android: {
              priority: "HIGH",
              notification: {
                channel_id:             channelId,
                notification_priority:  "PRIORITY_MAX",
                sound:                  "default",
                default_vibrate_timings: true,
              },
            },
          },
        }),
      });

      const json = await res.json() as any;

      if (json.name) {
        result.successCount++;
        console.log(`[push] FCM v1 ✓ name=${json.name} token=${token.slice(0, 20)}...`);
      } else {
        result.failureCount++;
        const errMsg = JSON.stringify(json?.error ?? json);
        result.errors.push({ token: token.slice(0, 20), error: errMsg });
        console.error(`[push] FCM v1 ✗ token=${token.slice(0, 20)}... error=${errMsg}`);

        // امسح token المنتهي
        const errCode = json?.error?.status;
        if (errCode === "NOT_FOUND" || errCode === "UNREGISTERED") {
          try {
            const { pool } = await import("@workspace/db");
            const upd = await pool.query(
              "UPDATE users SET push_token = NULL WHERE push_token = $1 RETURNING id",
              [token],
            );
            if ((upd.rowCount ?? 0) > 0)
              console.log(`[push] cleared stale token user=${upd.rows[0]?.id}`);
          } catch {}
        }
      }
    } catch (e) {
      result.failureCount++;
      const errMsg = String(e);
      result.errors.push({ token: token.slice(0, 20), error: errMsg });
      console.error(`[push] FCM send error token=${token.slice(0, 20)}...:`, e);
    }
  }

  return result;
}

// ── Main Export ───────────────────────────────────────────────────────────────
export async function sendPush(
  tokens:   (string | null | undefined)[],
  title:    string,
  body:     string,
  data?:    Record<string, unknown>,
  _priority: "default" | "high" = "high",
): Promise<PushResult> {
  const valid = tokens.filter(
    t => t && typeof t === "string" && t.length > 10
  ) as string[];

  if (valid.length === 0) {
    console.log("[push] no tokens — skipping");
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  const channelId = (data?.channelId as string) ?? "general";

  // حوّل كل القيم إلى strings (FCM يشترط ذلك)
  const stringData: Record<string, string> = { channelId, title, body };
  for (const [k, v] of Object.entries(data ?? {})) {
    stringData[k] = typeof v === "string" ? v : String(v);
  }

  const expoTokens = valid.filter(t =>  t.startsWith("ExponentPushToken["));
  const fcmTokens  = valid.filter(t => !t.startsWith("ExponentPushToken["));

  console.log(
    `[push] "${title}" → expo:${expoTokens.length} fcm:${fcmTokens.length} channelId=${channelId}`
  );

  const [expoResult, fcmResult] = await Promise.all([
    expoTokens.length > 0
      ? sendViaExpoPush(expoTokens, title, body, stringData)
      : Promise.resolve<PushResult>({ successCount: 0, failureCount: 0, errors: [] }),
    fcmTokens.length > 0
      ? sendViaFcm(fcmTokens, title, body, stringData, channelId)
      : Promise.resolve<PushResult>({ successCount: 0, failureCount: 0, errors: [] }),
  ]);

  const combined: PushResult = {
    successCount: expoResult.successCount + fcmResult.successCount,
    failureCount: expoResult.failureCount + fcmResult.failureCount,
    errors: [...expoResult.errors, ...fcmResult.errors],
  };

  console.log(
    `[push] done: success=${combined.successCount} failure=${combined.failureCount}` +
    (combined.errors.length ? ` errors=${JSON.stringify(combined.errors)}` : "")
  );

  return combined;
}

export { sendPush as sendPushNotifications };
