import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

const API = `https://${process.env.EXPO_PUBLIC_DOMAIN || 'jordan-ride-connect.replit.app'}/api`;

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

    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data as any;
      navigate(router, data);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as any;
      navigate(router, data);
    });

    return () => { responseListener.current?.remove(); };
  }, [token]);
}

async function dbg(step: string, data?: object) {
  try {
    await fetch(`${API}/debug/push-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, data }),
    });
  } catch {}
}

async function registerForPush(authToken: string) {
  try {
    await dbg('start', { platform: Platform.OS });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('general', {
        name: 'الإشعارات العامة',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('trip-updates', {
        name: 'تحديثات الرحلة',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'الإشعارات',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        showBadge: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      await dbg('permission-denied', { finalStatus });
      return;
    }

    // ─── FCM token مباشرة (يتجاوز Expo Push Service) ───
    await dbg('getting-device-token');
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    await dbg('got-device-token', { token: deviceToken.data, type: deviceToken.type });

    const resp = await fetch(`${API}/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: deviceToken.data, type: deviceToken.type }),
    });
    await dbg('saved-token', { status: resp.status });
  } catch (e: any) {
    await dbg('error', { message: String(e?.message ?? e) });
    console.log('[push] register error:', e);
  }
}
