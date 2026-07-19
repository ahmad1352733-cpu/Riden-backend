/**
 * FCM Push Notifications - يرسل مباشرة عبر Firebase Cloud Messaging
 * يتجاوز Expo Push Service لتفادي مشكلة FCM credentials
 */

const FCM_SERVER_KEY = process.env.FIREBASE_SERVER_KEY ?? "";
const FCM_URL = "https://fcm.googleapis.com/fcm/send";

export async function sendPush(
  tokens: (string | null | undefined)[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  priority: "default" | "high" = "high",
): Promise<void> {
  const valid = tokens.filter(
    t => t && typeof t === "string" && t.length > 10
  ) as string[];
  if (valid.length === 0) return;

  if (!FCM_SERVER_KEY) {
    console.error("[push] FIREBASE_SERVER_KEY غير مضبوط — لا يمكن إرسال الإشعارات");
    return;
  }

  const channelId = (data?.channelId as string) ?? "general";

  for (const token of valid) {
    try {
      console.log("[push] sending FCM to token:", token.slice(0, 20) + "...");
      const res = await fetch(FCM_URL, {
        method: "POST",
        headers: {
          "Authorization": `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          priority: priority === "high" ? "high" : "normal",
          notification: {
            title,
            body,
            sound: "default",
            android_channel_id: channelId,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          data: {
            ...(data ?? {}),
            channelId,
            title,
            body,
          },
          android: {
            priority: "high",
            notification: {
              channel_id: channelId,
              notification_priority: "PRIORITY_MAX",
              sound: "default",
              default_vibrate_timings: true,
            },
          },
        }),
      });
      const json = await res.json() as any;
      console.log("[push] FCM response:", JSON.stringify(json));
      if (json?.failure > 0) {
        console.error("[push] FCM delivery failed:", JSON.stringify(json?.results));
      }
    } catch (e) {
      console.error("[push] FCM send error:", e);
    }
  }
}

// للتوافق مع أي استخدام قديم
export { sendPush as sendPushNotifications };
