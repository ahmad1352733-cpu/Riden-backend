/**
 * Background trip-polling task for Android foreground service.
 * Runs while the captain is "available" — keeps the app alive in background
 * and fires a local notification when a pending trip is detected.
 *
 * NOTE: This file must be imported at the app root BEFORE any navigator renders
 *       (done in app/_layout.tsx) so TaskManager registers the task definition.
 */
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

export const BACKGROUND_LOCATION_TASK = 'RIDEN_BACKGROUND_LOCATION';

let _lastPendingTripId: number | null = null;

// ─── Register the task definition (must run at module load time) ─────────────
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) return;

  // Grab API domain (baked in at build / OTA bundle time)
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? 'jordan-ride-connect.replit.app';
  const base   = `https://${domain}/api`;

  try {
    // Read the stored token from AsyncStorage
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const token = await AsyncStorage.getItem('riden_token');
    if (!token) return;

    // Poll for pending trip
    const res = await fetch(`${base}/captains/pending-trip`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;

    const trip = await res.json();
    if (!trip?.id) { _lastPendingTripId = null; return; }

    // Only notify once per new trip
    if (trip.id === _lastPendingTripId) return;
    _lastPendingTripId = trip.id;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚖 طلب رحلة جديد!',
        body: `${trip.pickupAddress ?? 'موقع جديد'} ← ${trip.dropoffAddress ?? 'وجهة'}`,
        data: { tripId: trip.id },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // fire immediately
    });
  } catch { /* silent — background tasks must never throw */ }
});

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
      timeInterval: 15000,      // every 15 s
      distanceInterval: 50,     // or every 50 m
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'RIDEN — أنت متاح',
        notificationBody:  'يبحث RIDEN عن رحلات لك في الخلفية',
        notificationColor: '#22C55E',
      },
      pausesUpdatesAutomatically: false,
    });
  } catch { /* ignore — graceful degradation */ }
}

/** Stop the foreground-service location task (captain going offline). */
export async function stopForegroundService(): Promise<void> {
  try {
    const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch { /* ignore */ }
}
