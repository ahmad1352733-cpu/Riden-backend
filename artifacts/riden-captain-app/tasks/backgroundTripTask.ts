/**
 * Background trip-polling task for Android foreground service.
 * Runs while the captain is "available" — keeps the app alive in background
 * and fires a local notification when a pending trip is detected.
 *
 * NOTE: This file must be imported at the app root BEFORE any navigator renders
 *       (done in app/_layout.tsx) so TaskManager registers the task definition.
 *
 * GRACEFUL DEGRADATION: If expo-task-manager native module is absent (old APK),
 * the defineTask call is wrapped in try-catch so it silently no-ops instead of
 * crashing the entire app. The start/stop helpers also no-op safely.
 */
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export const BACKGROUND_LOCATION_TASK = 'RIDEN_BACKGROUND_LOCATION';

let _lastPendingTripId: number | null = null;

// ─── Register the task definition (must run at module load time) ─────────────
try {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
    if (error) return;

    const domain = process.env.EXPO_PUBLIC_DOMAIN ?? 'jordan-ride-connect.replit.app';
    const base   = `https://${domain}/api`;

    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const token = await AsyncStorage.getItem('riden_token');
      if (!token) return;

      const res = await fetch(`${base}/captains/pending-trip`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const trip = await res.json();
      if (!trip?.id) { _lastPendingTripId = null; return; }

      if (trip.id === _lastPendingTripId) return;
      _lastPendingTripId = trip.id;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚖 طلب رحلة جديد!',
          body: `${trip.pickupAddress ?? 'موقع جديد'} ← ${trip.dropoffAddress ?? 'وجهة'}`,
          data: { tripId: trip.id, screen: 'trip-request' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    } catch { /* silent — background tasks must never throw */ }
  });
} catch { /* expo-task-manager not in this native build — silently skip */ }

// ─── Helpers called from UI ───────────────────────────────────────────────────

/** Start the foreground-service location task (captain going online). */
export async function startForegroundService(): Promise<void> {
  try {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') return;
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== 'granted') return;

    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (running) return;

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'RIDEN — أنت متاح',
        notificationBody:  'يبحث RIDEN عن رحلات لك في الخلفية',
        notificationColor: '#22C55E',
      },
      pausesUpdatesAutomatically: false,
    });
  } catch { /* ignore — graceful degradation if native module absent */ }
}

/** Stop the foreground-service location task (captain going offline). */
export async function stopForegroundService(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch { /* ignore */ }
}
