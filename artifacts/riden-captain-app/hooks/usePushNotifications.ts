import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';

// ثابت: عنوان السيرفر الإنتاجي
const API = 'https://riden-api-production.up.railway.app/api';

// عرض الإشعارات حتى لو التطبيق مفتوح
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
  if (!data) return;
  setTimeout(() => {
    if (data?.screen === 'trip-request') {
      router.replace('/(tabs)');
    } else if (data?.screen === 'notifications') {
      router.replace('/(tabs)/notifications');
    }
  }, 500);
}

export function usePushNotifications(token: string | null) {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const handled = useRef(false);

  useEffect(() => {
    if (!token) return;

    registerForPush(token);

    // أعد التسجيل في كل مرة يرجع التطبيق للـ foreground
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') registerForPush(token);
    });

    // حالة: التطبيق كان مغلقاً والمستخدم ضغط الإشعار
    if (!handled.current) {
      Notifications.getLastNotificationResponseAsync().then(response => {
        if (!response) return;
        handled.current = true;
        navigate(router, response.notification.request.content.data);
      });
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      navigate(router, response.notification.request.content.data);
    });

    return () => {
      appStateSub.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [token]);
}

async function registerForPush(authToken: string) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('trip-requests', {
        name: 'طلبات الرحلات',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22C55E',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
      await Notifications.setNotificationChannelAsync('general', {
        name: 'الإشعارات العامة',
        importance: Notifications.AndroidImportance.MAX,
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
    if (finalStatus !== 'granted') return;

    // FCM token مباشرة
    const deviceToken = await Notifications.getDevicePushTokenAsync();

    const resp = await fetch(`${API}/users/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ token: deviceToken.data, type: deviceToken.type }),
    });

    if (resp.ok) {
      console.log('[push] token registered ✓');
    } else {
      console.log('[push] token register failed:', resp.status);
    }
  } catch (e) {
    console.log('[push] register error:', e);
  }
}
