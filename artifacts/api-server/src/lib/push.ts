/**
 * Expo Push Notifications helper
 * يرسل إشعارات حقيقية لأجهزة Expo عبر HTTP API
 */

export interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  badge?: number;
  ttl?: number;
  expiration?: number;
  mutableContent?: boolean;
}

export async function sendPushNotifications(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // نرسل كل رسالة منفردة لتجنب خطأ PUSH_TOO_MANY_EXPERIENCE_IDS
  // (يحدث عند خلط توكنات من تطبيقات/حسابات Expo مختلفة في طلب واحد)
  for (const message of messages) {
    try {
      console.log("[push] sending to token:", message.to);
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });
      const json = await res.json() as any;
      console.log("[push] expo response:", JSON.stringify(json));
      if (json?.data?.status === "error") {
        console.error("[push] ticket error:", JSON.stringify(json.data));
      }
    } catch (e) {
      console.error("[push] failed to send:", e);
    }
  }
}

/** يرسل إشعار واحد لتوكن واحد أو قائمة توكنز */
export async function sendPush(
  tokens: (string | null | undefined)[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  priority: "default" | "high" = "high",
): Promise<void> {
  const valid = tokens.filter(t => t && t.startsWith("ExponentPushToken[")) as string[];
  if (valid.length === 0) return;

  const channelId = (data?.channelId as string) ?? "general";
  await sendPushNotifications(
    valid.map(to => ({
      to,
      title,
      body,
      sound: "default",
      priority,
      channelId,
      badge: 1,
      ttl: 86400,          // 24 ساعة — لا يُحذف لو الجهاز كان أوف
      mutableContent: true,
      data: { ...(data ?? {}), channelId },
    }))
  );
}
