import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  Platform, Linking, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { startForegroundService, stopForegroundService } from '@/tasks/backgroundTripTask';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

// حساب المسافة بين نقطتين GPS بالكيلومترات (Haversine)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
import {
  useGetCaptainProfile,
  useUpdateCaptainAvailability,
  useUpdateCaptainLocation,
  useGetCaptainPendingTrip,
  useGetCaptainTrips,
  useGetTripTracking,
  useAcceptTrip,
  useRejectTrip,
  useStartTrip,
  useCompleteTrip,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import RidenMap from '@/components/RidenMap';

const AMMAN = { lat: 31.9539, lng: 35.9106 };

export default function DashboardScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [captainLoc, setCaptainLoc] = useState<{ lat: number; lng: number }>(AMMAN);
  const locationSubRef    = useRef<Location.LocationSubscription | null>(null);
  const locationMutateRef = useRef<ReturnType<typeof useUpdateCaptainLocation>['mutate'] | null>(null);

  // ─── تتبع المسافة والوقت أثناء الرحلة ──────────────────────────────────
  const tripStartTimeRef    = useRef<number | null>(null);   // timestamp ms
  const accDistanceRef      = useRef<number>(0);             // كم متراكمة
  const lastTripLocRef      = useRef<{ lat: number; lng: number } | null>(null);
  const activeTripIdRef     = useRef<number | null>(null);   // لمعرفة متى تبدأ رحلة جديدة

  // ─── البيانات ────────────────────────────────────────────────────────────
  const { data: captain, refetch: refetchProfile, isLoading: profileLoading } = useGetCaptainProfile({
    query: { enabled: !!token, staleTime: 15000 },
  });

  const isOnline   = captain?.isOnline   ?? false;
  const isApproved = captain?.isApproved ?? false;

  const { data: pendingTrip } = useGetCaptainPendingTrip({
    query: { enabled: !!token && isApproved && isOnline, refetchInterval: isApproved && isOnline ? 3000 : false },
  });

  const { data: captainTrips, refetch: refetchTrips } = useGetCaptainTrips({
    query: { enabled: !!token && isApproved, refetchInterval: isApproved ? 6000 : false },
  });

  const activeTrip: any = captainTrips?.find(
    (t: any) => t.status === 'accepted' || t.status === 'started',
  ) ?? null;

  const { data: tracking } = useGetTripTracking(
    activeTrip?.id ?? 0,
    { query: { enabled: !!activeTrip?.id, refetchInterval: 3000 } } as any,
  );

  const trackingData   = tracking as any;
  // موقع الراكب: حي من tracking أو ثابت من نقطة الانطلاق fallback
  const passengerCoord = trackingData?.passengerLat
    ? { lat: Number(trackingData.passengerLat), lng: Number(trackingData.passengerLng) }
    : activeTrip?.pickupLat
      ? { lat: Number(activeTrip.pickupLat), lng: Number(activeTrip.pickupLng) }
      : null;

  // ─── الطفرات ─────────────────────────────────────────────────────────────
  const availabilityMutation = useUpdateCaptainAvailability({
    mutation: { onSuccess: () => refetchProfile(), onError: () => Alert.alert('خطأ', 'تعذّر تغيير الحالة') },
  });

  const locationMutation = useUpdateCaptainLocation();
  locationMutateRef.current = locationMutation.mutate;

  const acceptMutation = useAcceptTrip({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getCaptainTrips'] });
        qc.invalidateQueries({ queryKey: ['getCaptainPendingTrip'] });
        Alert.alert('✓ تم القبول', 'توجّه لموقع الراكب الآن.');
      },
      onError: () => Alert.alert('خطأ', 'لم يتم القبول، ربما قَبِلها كابتن آخر.'),
    },
  });

  const rejectMutation = useRejectTrip({
    mutation: {
      onSuccess: () => {
        qc.setQueryData(['getCaptainPendingTrip'], null);
        qc.invalidateQueries({ queryKey: ['getCaptainPendingTrip'] });
      },
      onError: () => {
        // حتى لو فشل السيرفر، نخفي الرحلة محلياً
        qc.setQueryData(['getCaptainPendingTrip'], null);
      },
    },
  });

  const startMutation = useStartTrip({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: ['getCaptainTrips'] }),
      onError:   () => Alert.alert('خطأ', 'تعذّر بدء الرحلة'),
    },
  });

  const completeMutation = useCompleteTrip({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: ['getCaptainTrips'] });
        qc.invalidateQueries({ queryKey: ['getCaptainEarnings'] });
        qc.invalidateQueries({ queryKey: ['getCaptainProfile'] });
        const fare     = (data as any)?.finalFare   ?? 0;
        const commRate = (data as any)?.commissionRate ?? 0.1;
        const comm     = Math.round(fare * commRate * 100) / 100;
        const earned   = fare > 0
          ? `\nالأجرة النقدية: ${fare.toFixed(2)} د.أ\nالعمولة المخصومة: ${comm.toFixed(2)} د.أ`
          : '';
        Alert.alert('أحسنت! 🎉', `اكتملت الرحلة بنجاح.${earned}`);
      },
      onError: () => Alert.alert('خطأ', 'تعذّر إنهاء الرحلة'),
    },
  });

  // ─── بدء/إعادة تعيين تتبع الرحلة عند تغيّر حالتها إلى "started" ────────
  useEffect(() => {
    if (activeTrip?.status === 'started') {
      if (activeTripIdRef.current !== activeTrip.id) {
        // رحلة جديدة بدأت — صفّر العداد
        activeTripIdRef.current = activeTrip.id;
        tripStartTimeRef.current = Date.now();
        accDistanceRef.current   = 0;
        lastTripLocRef.current   = null;
      }
    } else {
      // لا توجد رحلة نشطة — صفّر
      activeTripIdRef.current  = null;
      tripStartTimeRef.current = null;
      accDistanceRef.current   = 0;
      lastTripLocRef.current   = null;
    }
  }, [activeTrip?.id, activeTrip?.status]);

  // ─── GPS للكابتن ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        // آخر موقع محفوظ فوراً
        const last = await Location.getLastKnownPositionAsync({});
        if (last) setCaptainLoc({ lat: last.coords.latitude, lng: last.coords.longitude });
        // تحديث مستمر حتى نحصل على موقع دقيق
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 0, timeInterval: 1000 },
          (loc) => {
            setCaptainLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            sub.remove(); // نوقف بعد أول موقع دقيق
          },
        );
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (!isOnline || !isApproved) {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
      stopForegroundService();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;

        await startForegroundService();

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 3, timeInterval: 2000 },
          (loc) => {
            const { latitude, longitude } = loc.coords;
            setCaptainLoc({ lat: latitude, lng: longitude });
            locationMutateRef.current?.({ data: { lat: latitude, lng: longitude } });

            // تراكم المسافة فقط عند الرحلة الجارية
            if (activeTripIdRef.current && tripStartTimeRef.current) {
              if (lastTripLocRef.current) {
                const d = haversineKm(
                  lastTripLocRef.current.lat, lastTripLocRef.current.lng,
                  latitude, longitude,
                );
                // تجاهل القفزات الكبيرة (GPS error > 5 كم)
                if (d < 5) accDistanceRef.current += d;
              }
              lastTripLocRef.current = { lat: latitude, lng: longitude };
            }
          },
        );
        if (cancelled) { sub.remove(); return; }
        locationSubRef.current = sub;
      } catch { /* ignore */ }
    })();
    return () => {
      cancelled = true;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, [isOnline, isApproved]);

  const handleToggleOnline = () => {
    if (!isApproved) { Alert.alert('بانتظار الموافقة', 'حسابك قيد المراجعة من قِبل الإدارة'); return; }
    availabilityMutation.mutate({ data: { isOnline: !isOnline } });
  };

  const handleComplete = () => {
    if (!activeTrip) return;
    const dist = accDistanceRef.current > 0
      ? Math.round(accDistanceRef.current * 100) / 100
      : 0.1; // حد أدنى للرحلات القصيرة جداً
    completeMutation.mutate({ id: activeTrip.id, data: { distanceKm: dist } });
  };

  const callPassenger = () => {
    const phone = activeTrip?.passenger?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const openDirections = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`);
  };

  const s = styles(colors);

  // ─── مؤشرات الخريطة ──────────────────────────────────────────────────────
  const mapMarkers: any[] = [];

  // الكابتن — مركبة متحركة عند الإتاحة
  mapMarkers.push({
    id: 'captain',
    lat: captainLoc.lat, lng: captainLoc.lng,
    color: '#22C55E',
    label: '🚗',
    isVehicle: true,
    pulse: isOnline,
  });

  if (activeTrip?.status === 'accepted') {
    // موقع الراكب الحي (tracking) أو نقطة الانطلاق fallback
    if (passengerCoord) {
      mapMarkers.push({
        id: 'passenger',
        lat: passengerCoord.lat, lng: passengerCoord.lng,
        color: '#F59E0B', label: '👤 الراكب', pulse: true,
      });
    }
    // نقطة الانطلاق
    if (activeTrip.pickupLat) {
      mapMarkers.push({
        id: 'pickup',
        lat: activeTrip.pickupLat, lng: activeTrip.pickupLng,
        color: '#F59E0B', label: '📍 الانطلاق',
      });
    }
  }

  if (activeTrip?.status === 'started') {
    // الراكب معك في السيارة — أظهر الوجهة فقط
    if (activeTrip.dropoffLat) {
      mapMarkers.push({
        id: 'dropoff',
        lat: activeTrip.dropoffLat, lng: activeTrip.dropoffLng,
        color: '#22C55E', label: '🏁 الوجهة',
      });
    }
  }

  // مركز الخريطة — بين الكابتن والراكب عند الانتظار، بين الكابتن والوجهة عند السير
  const mapCenter = activeTrip?.status === 'accepted' && passengerCoord
    ? { lat: (captainLoc.lat + passengerCoord.lat) / 2, lng: (captainLoc.lng + passengerCoord.lng) / 2 }
    : activeTrip?.status === 'started' && activeTrip.dropoffLat
      ? { lat: (captainLoc.lat + activeTrip.dropoffLat) / 2, lng: (captainLoc.lng + activeTrip.dropoffLng) / 2 }
      : captainLoc;

  const mapZoom = activeTrip ? 13 : 15;

  // نُظهر شاشة التحميل فقط في أول مرة (لا يوجد بيانات أبداً)
  if (!captain && profileLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={s.loadingText}>جارٍ التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>

      {/* ─── الخريطة — تملأ الشاشة ─── */}
      <RidenMap
        center={mapCenter}
        zoom={mapZoom}
        markers={mapMarkers}
        style={s.map}
      />

      {/* ─── الشريط العلوي (فوق الخريطة) ─── */}
      <View style={[s.topBar, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12) }]}>
        <View style={s.balanceBadge}>
          <Text style={s.balanceLabel}>الرصيد</Text>
          <Text style={s.balanceValue}>{(captain?.balance ?? 0).toFixed(2)} د.أ</Text>
        </View>
        <TouchableOpacity
          style={[s.onlineToggle, isOnline ? s.onlineBg : s.offlineBg]}
          onPress={handleToggleOnline}
          disabled={availabilityMutation.isPending}
        >
          {availabilityMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <View style={[s.dot, { backgroundColor: isOnline ? '#fff' : colors.mutedForeground }]} />
              <Text style={s.onlineTxt}>{isOnline ? 'متاح' : 'غير متاح'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── اللوح السفلي (فوق الخريطة) ─── */}
      <View style={[s.panel, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 80) }]}>

        {/* بانتظار الموافقة */}
        {!isApproved && (
          <View style={s.card}>
            <Feather name="clock" size={28} color={colors.warning as string} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>بانتظار موافقة الإدارة</Text>
              <Text style={s.cardSub}>سيتم مراجعة طلبك والإخطار بنتيجة القبول</Text>
            </View>
          </View>
        )}

        {/* غير متاح */}
        {isApproved && !isOnline && !activeTrip && (
          <View style={s.card}>
            <Feather name="power" size={24} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>أنت غير متاح</Text>
              <Text style={s.cardSub}>اضغط "غير متاح" أعلاه لتبدأ قبول الرحلات</Text>
            </View>
          </View>
        )}

        {/* يبحث عن رحلات */}
        {isApproved && isOnline && !pendingTrip && !activeTrip && (
          <View style={s.card}>
            <ActivityIndicator color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>يبحث عن رحلات...</Text>
              <Text style={s.cardSub}>ستصلك إشعارات الرحلات القريبة منك</Text>
            </View>
          </View>
        )}

        {/* طلب رحلة جديد */}
        {isApproved && isOnline && pendingTrip && !activeTrip && (
          <View style={[s.card, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <View style={s.cardRow}>
              <Text style={s.newBadgeTxt}>🔔 طلب رحلة جديد</Text>
              <View style={s.badge}><Text style={s.badgeTxt}>جديد</Text></View>
            </View>
            <View style={s.routeInfo}>
              <Feather name="circle" size={9} color={colors.primary} />
              <Text style={s.routeText} numberOfLines={1}>{(pendingTrip as any).pickupAddress}</Text>
            </View>
            <View style={s.routeInfo}>
              <Feather name="map-pin" size={11} color={colors.destructive} />
              <Text style={s.routeText} numberOfLines={1}>{(pendingTrip as any).dropoffAddress}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[s.primaryBtn, { flex: 1, backgroundColor: colors.destructive }]}
                onPress={() => rejectMutation.mutate({ id: (pendingTrip as any).id })}
                disabled={rejectMutation.isPending || acceptMutation.isPending}
              >
                {rejectMutation.isPending
                  ? <ActivityIndicator color="#fff" />
                  : <><Feather name="x" size={17} color="#fff" /><Text style={s.primaryBtnTxt}>رفض</Text></>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { flex: 2 }]}
                onPress={() => acceptMutation.mutate({ id: (pendingTrip as any).id })}
                disabled={acceptMutation.isPending || rejectMutation.isPending}
              >
                {acceptMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <><Feather name="check" size={17} color={colors.primaryForeground} /><Text style={s.primaryBtnTxt}>قبول الرحلة</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* في الطريق للراكب */}
        {activeTrip?.status === 'accepted' && (
          <View style={[s.card, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>🚗 في الطريق للراكب</Text>
            </View>
            {activeTrip.passenger && (
              <View style={s.passengerRow}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{activeTrip.passenger.name?.charAt(0) ?? 'R'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.passengerName}>{activeTrip.passenger.name}</Text>
                  <Text style={s.passengerPhone}>{activeTrip.passenger.phone}</Text>
                </View>
                <TouchableOpacity style={s.callBtn} onPress={callPassenger}>
                  <Feather name="phone" size={19} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {/* زر الاتجاهات → Google Maps */}
            {activeTrip.pickupLat && (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: '#1D4ED8' }]}
                onPress={() => openDirections(activeTrip.pickupLat, activeTrip.pickupLng)}
              >
                <Feather name="navigation" size={17} color="#fff" />
                <Text style={s.primaryBtnTxt}>الحصول على الاتجاهات</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: colors.warning as string }]}
              onPress={() => startMutation.mutate({ id: activeTrip.id })}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="user-check" size={17} color="#fff" /><Text style={s.primaryBtnTxt}>وصلت للراكب ← ابدأ الرحلة</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* الرحلة جارية */}
        {activeTrip?.status === 'started' && (
          <View style={[s.card, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
            <View style={s.cardRow}>
              <Text style={s.cardTitle}>🏁 الرحلة جارية</Text>
            </View>
            {activeTrip.passenger && (
              <View style={s.passengerRow}>
                <View style={s.avatar}><Text style={s.avatarTxt}>{activeTrip.passenger.name?.charAt(0) ?? 'R'}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.passengerName}>{activeTrip.passenger.name}</Text>
                  <View style={s.routeInfo}>
                    <Feather name="flag" size={11} color="#22C55E" />
                    <Text style={s.routeText} numberOfLines={1}>{activeTrip.dropoffAddress}</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.callBtn} onPress={callPassenger}>
                  <Feather name="phone" size={19} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {/* زر الاتجاهات للوجهة */}
            {activeTrip.dropoffLat && (
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: '#1D4ED8' }]}
                onPress={() => openDirections(activeTrip.dropoffLat, activeTrip.dropoffLng)}
              >
                <Feather name="navigation" size={17} color="#fff" />
                <Text style={s.primaryBtnTxt}>اتجاهات للوجهة</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.primaryBtn} onPress={() => {
              const dist = accDistanceRef.current;
              const elapsed = tripStartTimeRef.current
                ? Math.round((Date.now() - tripStartTimeRef.current) / 60000)
                : 0;
              Alert.alert(
                'إنهاء الرحلة',
                `المسافة: ${dist > 0 ? dist.toFixed(2) : '—'} كم\nالوقت: ${elapsed} دقيقة\nالسعر يُحسب تلقائياً`,
                [
                  { text: 'إلغاء', style: 'cancel' },
                  { text: 'تأكيد الإنهاء', style: 'destructive', onPress: handleComplete },
                ]
              );
            }}>
              <Feather name="check-circle" size={17} color={colors.primaryForeground} />
              <Text style={s.primaryBtnTxt}>إنهاء الرحلة</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background },
  map:         { ...StyleSheet.absoluteFillObject },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.mutedForeground, fontSize: 15 },

  // ─── شريط علوي ───
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  balanceBadge: {
    backgroundColor: '#0F1B2DEE', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  balanceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  balanceValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  onlineToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    minWidth: 100, justifyContent: 'center',
  },
  onlineBg:  { backgroundColor: colors.primary },
  offlineBg: { backgroundColor: '#0F1B2DEE', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  dot:       { width: 8, height: 8, borderRadius: 4 },
  onlineTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ─── اللوح السفلي ───
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 12, paddingTop: 8,
  },
  card: {
    backgroundColor: colors.card + 'F5',
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 8,
  },
  cardRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  cardSub:   { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  badge:     { backgroundColor: colors.primary + '30', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt:  { fontSize: 11, fontWeight: '600', color: colors.primary },
  newBadgeTxt: { fontSize: 15, fontWeight: '700', color: colors.foreground },

  routeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { flex: 1, fontSize: 13, color: colors.foreground, textAlign: 'right' },

  primaryBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 13, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.primaryForeground },

  // ─── بطاقة الراكب ───
  passengerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F59E0B25', borderWidth: 2, borderColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:     { fontSize: 18, fontWeight: '800', color: '#F59E0B' },
  passengerName: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
  passengerPhone:{ fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
  callBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },

  // ─── مودال ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 14,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center' },
  modalSub:    { fontSize: 13, color: colors.mutedForeground, textAlign: 'center' },
  modalField:  { gap: 6 },
  modalLabel:  { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
  modalInput: {
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: colors.foreground,
  },
  modalBtns:      { flexDirection: 'row', gap: 12 },
  modalBtn:       { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancel:    { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  modalCancelTxt: { color: colors.mutedForeground, fontWeight: '600', fontSize: 15 },
  modalConfirm:   { backgroundColor: colors.primary },
  modalConfirmTxt:{ color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
} as any);
