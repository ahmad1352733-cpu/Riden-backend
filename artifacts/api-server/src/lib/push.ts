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

  // Expo Push API يقبل حتى 100 رسالة في الطلب الواحد
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
    } catch (e) {
      // لا نوقف السيرفر إذا فشل الإشعار
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
