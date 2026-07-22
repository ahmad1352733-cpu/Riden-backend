/**
 * FCM v1 Push Notifications
 * يستخدم Firebase Cloud Messaging HTTP v1 API مع Service Account (مضمّن)
 * المفتاح: 373c31611e — الوحيد الصالح
 */
import { GoogleAuth } from "google-auth-library";

const PROJECT_ID = "riden2";
const FCM_V1_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

const CREDENTIALS = {
  client_email: "firebase-adminsdk-fbsvc@riden2.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCp322hLjL9I4OP\noiJ9PODSNI7wmBhNrzm03TiPKVbl7VoKLM+dI93c821LZrscpPBfNuGQvPRJu4pV\nbfK4XPMD5mty3AteggEsYWosfvqLJIgvSdrRlBHZlVv5vl827SM0zVMrI7l4f9Lk\neZ/BU4B6eGXtroegjSHqRTKM31nhFO3yuyP57EfPgvc8/dio2bAPtDgcNTd4W9TD\n99G6eOA5+G2DQSX9JUFvcZVN3DUuXu/OuucTT8Qc0zbHQGltlSgfzTltOeS7VwUm\nigql3wymIL9AV3kRTp8it0NvVAS8g9z5L7m6lp1RIP/tNZYUolnhiW1IDyEfajuO\nW8XbtrUlAgMBAAECggEABqBEyh+033OOLdZuL/e68ULEPJWXhRg2UQa8A7biFoU5\nQ40B6tLmVDhZOrK0I7w59WInpESqkWGzq1IRlf1ngURwoSync4qbTxwxpFtY8dUn\n9r2Tv88IbzXzPied1n+jeutzY2BjsKk+aakQ1of89Un9ooAcoYzqa2qYO9nOdggR\nqGzUUFF5PhqiD0TyGvlCyJMkYACcSY/YqlpMB2P4hKau+XAzBldZX47f59q3mjc0\n+RVMZ0bLFEqv4fDiOibor0B64bnyL1gE1OS2evMRZcxvP67UWAtzwDVVbFAUuZFZ\nZ8G7pzpjZUZnfFQilx5QrZ+SosSzz8EmlCcG9pzWtQKBgQDfGVRMxf96mN1LLc/x\noZIKt3Ld/ZGibOoix2qGawscI2EN9y162/DcsUrH0wFk7oTU/pi1YdEH2HKoozLU\n0LjZR+Xsiy5+Yl5ija4gv2r7RUAETIEC+LHYYLPWMGMnjA+c2vXr+mAfNlm8naDA\n8FKTAdD8KRS7hYdkrPmcycfCZwKBgQDC7KWwqoysrP7qubkZAhGxYOAEhBXzS7kK\nl/Hmbiw/eC11f/EsOitxTappVImeQE4V1/Nx9hLYZh2TQIRmiw4HZEE3OzkKa5PX\nA6hV9JXhsKzzjh4YNSPseqte7WgypZTEMlc8+w9GKHwURSvKTQvMwVGJBWhc8WpM\n0arAuSjMkwKBgBbknX7nTmkBKKwfPlhYMQlCe9oFvB0Duh7pgafbch9oDfyF4bfa\nu+OZmcfZgioeQ6krmvX53J5GerWNUZj+9gjt1M0qFxJG+9J3IWgg3FR+baxDQXXR\nmUZP3gRboMEdITkCSvv1DEoHpLuzHRzPTFnjdNN7T7JSaGtPSKnrFsF/AoGBAJo3\n9wNmfDQmDu2REVQq4eqv1a1c/6zlLTqnarjAU/vHTlgXaK1wPGzBYOFDBDqTb/Qy\nTibM5K4XZLDbK6WhwPCyLjLPhVqsMGS+PRH8mBTe3oc32rGWYZy4lRtew8DGZoQv\nu/vAOp5sa3byHypIeNx/2s2I3MAkNNEgVXNzS0dHAoGAB86UvjhK0Jl6EP/ewlph\nHXmrbQ7k+635X9FnNC4fliDIr07IfsRg5vBsdaW1Z69Qu5FYvfqEXTrlAUEnkoj6\nhb+/3o7z/CSpD/RN6he1+MCY40p1236Wd1g2vT9rnt5SvmcJDnpqSDJ4+w16sSnG\nzB6zRmULIWq90KQ2pg4q1sI=\n-----END PRIVATE KEY-----\n",
};

let _auth: GoogleAuth | null = null;
function getAuth(): GoogleAuth {
  if (_auth) return _auth;
  _auth = new GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  return _auth;
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
  if (valid.length === 0) {
    console.log("[push] no tokens to send to (skipping)");
    return;
  }

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
  stringData.body = body;
  stringData.channelId = channelId;

  console.log(`[push] FCM v1 → sending "${title}" to ${valid.length} token(s)`);

  for (const token of valid) {
    try {
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
        console.error("[push] FCM v1 ✗:", JSON.stringify(json));
        const errStatus = json?.error?.status;
        if (errStatus === "NOT_FOUND" || errStatus === "UNREGISTERED") {
          try {
            const { pool } = await import("@workspace/db");
            const upd = await pool.query(
              "UPDATE users SET push_token = NULL WHERE push_token = $1 RETURNING id",
              [token],
            );
            if ((upd.rowCount ?? 0) > 0) {
              console.log(`[push] cleared stale token for user id=${upd.rows[0]?.id}`);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error("[push] FCM v1 send error:", e);
    }
  }
}

export { sendPush as sendPushNotifications };
