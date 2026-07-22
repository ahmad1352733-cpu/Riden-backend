import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import { useRouter } from 'expo-router';

// Railway backend — ثابت لا يتغير بالـ OTA
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
    if (data?.screen === 'trip-request') router.replace('/(tabs)');
    else if (data?.screen === 'notifications') router.replace('/(tabs)/notifications');
  }, 500);
}

export function usePushNotifications(token: string | null) {
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener     = useRef<Notifications.EventSubscription>();
  const handled              = useRef(false);

  useEffect(() => {
    if (!token) return;

    registerForPush(token);

    // أعد التسجيل عند العودة للـ foreground
    const appStateSub = AppState.addEventListener('change', state => {
      if (state === 'active') registerForPush(token);
    });

    // إشعار ضُغط عليه وهو في الخلفية
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

async function requestAndroid13Permission(): Promise<boolean> {
  // Android 13+ (API 33+) يحتاج طلب POST_NOTIFICATIONS صريح
  if (Platform.OS !== 'android' || (Platform.Version as number) < 33) return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function registerForPush(authToken: string) {
  try {
    // 1. إعداد notification channels (Android)
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

    // 2. طلب إذن Android 13+
    const android13ok = await requestAndroid13Permission();
    if (!android13ok) {
      console.log('[push] POST_NOTIFICATIONS permission denied (Android 13+)');
      return;
    }

    // 3. طلب إذن expo-notifications
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[push] notification permission denied');
      return;
    }

    // 4. الحصول على FCM token مباشرة (getDevicePushTokenAsync)
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    console.log('[push] token type:', deviceToken.type, 'data:', String(deviceToken.data).slice(0, 30));

    // 5. إرسال الـ token لـ Railway
    const resp = await fetch(`${API}/users/push-token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body:    JSON.stringify({ token: deviceToken.data, type: deviceToken.type }),
    });

    if (resp.ok) {
      console.log('[push] token registered ✓ to Railway');
    } else {
      const err = await resp.text();
      console.log('[push] token register failed:', resp.status, err);
    }
  } catch (e) {
    console.log('[push] register error:', e);
  }
}
