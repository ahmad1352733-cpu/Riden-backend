import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

const API = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? 'jordan-ride-connect.replit.app'}/api`;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function navigate(router: ReturnType<typeof useRouter>, data: any) {
  if (data?.screen === 'notifications') {
    router.replace('/(tabs)/notifications');
  } else if (data?.screen === 'trip-update') {
    router.replace('/(tabs)');
  }
}

export function usePushNotifications(token: string | null) {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    if (!token) return;
    registerForPush(token);

    // ─── التطبيق كان مغلقاً (killed) ───
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      navigate(router, data);
    });

    // ─── التطبيق في الخلفية أو مفتوح ───
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      navigate(router, data);
    });

    return () => { responseListener.current?.remove(); };
  }, [token]);
}

async function registerForPush(authToken: string) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('trip-updates', {
        name: 'تحديثات الرحلة',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'ddb45a5b-2f33-415c-9467-ff89c70c196a',
    });

    await fetch(`${API}/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: tokenData.data }),
    });
  } catch (e) {
    console.log('[push] register error:', e);
  }
}
