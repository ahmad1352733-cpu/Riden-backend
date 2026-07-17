import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

const API = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? 'jordan-ride-connect.replit.app'}/api`;

// تهيئة كيفية عرض الإشعارات عند فتح التطبيق
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications(token: string | null) {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!token) return;
    registerForPush(token);

    // لما يصل إشعار والتطبيق مفتوح
    notificationListener.current = Notifications.addNotificationReceivedListener(_notification => {
      // يعرض الإشعار تلقائياً بسبب setNotificationHandler
    });

    // لما يضغط الكابتن على الإشعار
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      if (data?.screen === 'trip-request') {
        router.replace('/(tabs)');
      } else if (data?.screen === 'notifications') {
        router.replace('/(tabs)/notifications');
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [token]);
}

async function registerForPush(authToken: string) {
  try {
    // إنشاء قناة Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('trip-requests', {
        name: 'طلبات الرحلات',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22C55E',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات العامة',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    // طلب إذن الإشعارات
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // جلب التوكن
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'f6dd92f2-ecc0-405b-be6f-cad0e6188537',
    });

    // إرسال التوكن للسيرفر
    await fetch(`${API}/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: tokenData.data }),
    });
  } catch (e) {
    console.log('[push] register error:', e);
  }
}
