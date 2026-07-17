import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  TextInput, Platform, Modal, Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import {
  useGetCaptainProfile,
  useUpdateCaptainAvailability,
  useUpdateCaptainLocation,
  useGetCaptainPendingTrip,
  useGetCaptainTrips,
  useGetTripTracking,
  useAcceptTrip,
  useStartTrip,
  useCompleteTrip,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

const AMMAN = { latitude: 31.9539, longitude: 35.9106 };

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [captainLoc, setCaptainLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [distanceKm, setDistanceKm] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const locationMutateRef = useRef<ReturnType<typeof useUpdateCaptainLocation>['mutate'] | null>(null);

  // ─── الملف الشخصي ────────────────────────────────────────────────────────
  const { data: captain, refetch: refetchProfile, isLoading: profileLoading } = useGetCaptainProfile({
    query: { enabled: !!token, staleTime: 15000 },
  });

  const isOnline = captain?.isOnline ?? false;
  const isApproved = captain?.isApproved ?? false;

  // ─── طلبات الرحلة المعلّقة ────────────────────────────────────────────────
  const { data: pendingTrip } = useGetCaptainPendingTrip({
    query: {
      enabled: !!token && isApproved && isOnline,
      refetchInterval: isApproved && isOnline ? 5000 : false,
    },
  });

  // ─── رحلات الكابتن (للرحلة النشطة) ─────────────────────────────────────
  const { data: captainTrips, refetch: refetchTrips } = useGetCaptainTrips({
    query: {
      enabled: !!token && isApproved,
      refetchInterval: isApproved ? 6000 : false,
    },
  });

  const activeTrip: any = captainTrips?.find(
    (t: any) => t.status === 'accepted' || t.status === 'started',
  ) ?? null;

  // ─── تتبع موقع الراكب (من السيرفر) ─────────────────────────────────────
  const { data: tracking } = useGetTripTracking(
    { id: activeTrip?.id ?? 0 },
    {
      query: {
        enabled: !!activeTrip?.id,
        refetchInterval: 5000,
      },
    } as any,
  );

  const trackingData = tracking as any;
  const passengerCoord = trackingData?.passengerLat
    ? { latitude: trackingData.passengerLat, longitude: trackingData.passengerLng }
    : activeTrip
      ? { latitude: activeTrip.pickupLat, longitude: activeTrip.pickupLng }
      : null;

  // ─── الطفرات ─────────────────────────────────────────────────────────────
  const availabilityMutation = useUpdateCaptainAvailability({
    mutation: {
      onSuccess: () => refetchProfile(),
      onError: () => Alert.alert('خطأ', 'تعذّر تغيير الحالة'),
    },
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

  const startMutation = useStartTrip({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getCaptainTrips'] });
      },
      onError: () => Alert.alert('خطأ', 'تعذّر بدء الرحلة'),
    },
  });

  const completeMutation = useCompleteTrip({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: ['getCaptainTrips'] });
        qc.invalidateQueries({ queryKey: ['getCaptainEarnings'] });
        qc.invalidateQueries({ queryKey: ['getCaptainProfile'] });
        setShowCompleteModal(false);
        setDistanceKm(''); setDurationMin('');
        const fare = (data as any)?.finalFare ?? 0;
        const commRate = (data as any)?.commissionRate ?? 0.1;
        const comm = Math.round(fare * commRate * 100) / 100;
        const earned = fare > 0 ? `\nالأجرة النقدية: ${fare.toFixed(2)} د.أ\nالعمولة المخصومة: ${comm.toFixed(2)} د.أ` : '';
        Alert.alert('أحسنت! 🎉', `اكتملت الرحلة بنجاح.${earned}`);
      },
      onError: () => Alert.alert('خطأ', 'تعذّر إنهاء الرحلة'),
    },
  });

  // ─── تتبع GPS للكابتن ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || !isApproved) {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 30, timeInterval: 15000 },
          (loc) => {
            const { latitude, longitude } = loc.coords;
            setCaptainLoc({ latitude, longitude });
            locationMutateRef.current?.({ data: { lat: latitude, lng: longitude } });
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

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setCaptainLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch { /* ignore */ }
    })();
  }, []);

  const handleToggleOnline = () => {
    if (!isApproved) {
      Alert.alert('بانتظار الموافقة', 'حسابك قيد المراجعة من قِبل الإدارة');
      return;
    }
    availabilityMutation.mutate({ data: { isOnline: !isOnline } });
  };

  const handleComplete = () => {
    const dist = parseFloat(distanceKm);
    const dur = parseFloat(durationMin);
    if (isNaN(dist) || isNaN(dur) || dist <= 0 || dur <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال مسافة ومدة صحيحة');
      return;
    }
    if (!activeTrip) return;
    completeMutation.mutate({ id: activeTrip.id, data: { distanceKm: dist, durationMin: dur } });
  };

  const callPassenger = () => {
    const phone = activeTrip?.passenger?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const s = styles(colors);

  if (profileLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={s.loadingText}>جارٍ التحميل...</Text>
      </View>
    );
  }

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      {/* ─── الشريط العلوي ─── */}
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

      {/* ─── اللوح السفلي ─── */}
      <View style={[s.panel, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 80), flex: 1 }]}>

        {/* بانتظار الموافقة */}
        {!isApproved && (
          <View style={s.infoCard}>
            <Feather name="clock" size={32} color={colors.warning as string} />
            <Text style={s.infoTitle}>بانتظار موافقة الإدارة</Text>
            <Text style={s.infoSub}>سيتم مراجعة طلبك والإخطار بنتيجة القبول</Text>
          </View>
        )}

        {/* متاح وغير متاح */}
        {isApproved && !isOnline && !activeTrip && (
          <View style={s.infoCard}>
            <Feather name="power" size={32} color={colors.mutedForeground} />
            <Text style={s.infoTitle}>أنت غير متاح</Text>
            <Text style={s.infoSub}>اضغط "غير متاح" أعلاه لتبدأ قبول الرحلات</Text>
          </View>
        )}

        {/* يبحث عن رحلات */}
        {isApproved && isOnline && !pendingTrip && !activeTrip && (
          <View style={s.infoCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={s.infoTitle}>يبحث عن رحلات...</Text>
            <Text style={s.infoSub}>ستصلك إشعارات الرحلات القريبة منك</Text>
          </View>
        )}

        {/* طلب رحلة جديد */}
        {isApproved && isOnline && pendingTrip && !activeTrip && (
          <View style={s.tripCard}>
            <View style={s.tripHeader}>
              <Text style={s.tripTitle}>🔔 طلب رحلة جديد</Text>
              <View style={s.newBadge}><Text style={s.newBadgeTxt}>جديد</Text></View>
            </View>
            <View style={s.routeBlock}>
              <View style={s.routeRow}>
                <Feather name="circle" size={10} color={colors.primary} />
                <View style={s.routeTexts}>
                  <Text style={s.routeLabel}>نقطة الانطلاق</Text>
                  <Text style={s.routeVal}>{(pendingTrip as any).pickupAddress}</Text>
                </View>
              </View>
              <View style={s.routeDivider} />
              <View style={s.routeRow}>
                <Feather name="map-pin" size={12} color={colors.destructive} />
                <View style={s.routeTexts}>
                  <Text style={s.routeLabel}>الوجهة</Text>
                  <Text style={s.routeVal}>{(pendingTrip as any).dropoffAddress}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={s.acceptBtn}
              onPress={() => acceptMutation.mutate({ id: (pendingTrip as any).id })}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending
                ? <ActivityIndicator color={colors.primaryForeground} />
                : <><Feather name="check" size={18} color={colors.primaryForeground} /><Text style={s.acceptTxt}>قبول الرحلة</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* في الطريق للراكب */}
        {activeTrip?.status === 'accepted' && (
          <View style={s.tripCard}>
            <View style={s.tripHeader}>
              <Text style={s.tripTitle}>🚗 في الطريق للراكب</Text>
              <View style={[s.newBadge, { backgroundColor: (colors.warning as string) + '30' }]}>
                <Text style={[s.newBadgeTxt, { color: colors.warning as string }]}>قيد التنفيذ</Text>
              </View>
            </View>

            {/* معلومات الراكب */}
            {activeTrip.passenger && (
              <View style={s.passengerCard}>
                <View style={s.passengerAvatar}>
                  <Text style={s.passengerAvatarText}>{activeTrip.passenger.name?.charAt(0) ?? 'R'}</Text>
                </View>
                <View style={s.passengerInfo}>
                  <Text style={s.passengerName}>{activeTrip.passenger.name}</Text>
                  <Text style={s.passengerPhone}>{activeTrip.passenger.phone}</Text>
                  <View style={s.routeRow}>
                    <Feather name="map-pin" size={11} color="#F59E0B" />
                    <Text style={s.passengerAddr} numberOfLines={1}>{activeTrip.pickupAddress}</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.callBtn} onPress={callPassenger}>
                  <Feather name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[s.acceptBtn, { backgroundColor: colors.warning as string }]}
              onPress={() => startMutation.mutate({ id: activeTrip.id })}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="user-check" size={18} color="#fff" /><Text style={[s.acceptTxt, { color: '#fff' }]}>وصلت للراكب ← ابدأ الرحلة</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* الرحلة جارية */}
        {activeTrip?.status === 'started' && (
          <View style={s.tripCard}>
            <View style={s.tripHeader}>
              <Text style={s.tripTitle}>🏁 الرحلة جارية</Text>
              <View style={[s.newBadge, { backgroundColor: colors.primary + '30' }]}>
                <Text style={[s.newBadgeTxt, { color: colors.primary }]}>نشط</Text>
              </View>
            </View>

            {/* معلومات الراكب */}
            {activeTrip.passenger && (
              <View style={s.passengerCard}>
                <View style={s.passengerAvatar}>
                  <Text style={s.passengerAvatarText}>{activeTrip.passenger.name?.charAt(0) ?? 'R'}</Text>
                </View>
                <View style={s.passengerInfo}>
                  <Text style={s.passengerName}>{activeTrip.passenger.name}</Text>
                  <Text style={s.passengerPhone}>{activeTrip.passenger.phone}</Text>
                  <View style={s.routeRow}>
                    <Feather name="flag" size={11} color="#22C55E" />
                    <Text style={s.passengerAddr} numberOfLines={1}>{activeTrip.dropoffAddress}</Text>
                  </View>
                </View>
                <TouchableOpacity style={s.callBtn} onPress={callPassenger}>
                  <Feather name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={s.acceptBtn} onPress={() => setShowCompleteModal(true)}>
              <Feather name="check-circle" size={18} color={colors.primaryForeground} />
              <Text style={s.acceptTxt}>إنهاء الرحلة</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ─── مودال إنهاء الرحلة ─── */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>تفاصيل الرحلة</Text>
            <Text style={s.modalSub}>أدخل البيانات الفعلية لاحتساب الأجرة</Text>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>المسافة الفعلية (كم)</Text>
              <TextInput
                style={s.modalInput}
                value={distanceKm}
                onChangeText={setDistanceKm}
                keyboardType="decimal-pad"
                placeholder="مثال: 5.2"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>مدة الرحلة (دقيقة)</Text>
              <TextInput
                style={s.modalInput}
                value={durationMin}
                onChangeText={setDurationMin}
                keyboardType="decimal-pad"
                placeholder="مثال: 18"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalBtn, s.modalCancel]} onPress={() => setShowCompleteModal(false)}>
                <Text style={s.modalCancelTxt}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.modalConfirm]} onPress={handleComplete} disabled={completeMutation.isPending}>
                {completeMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.modalConfirmTxt}>تأكيد الإنهاء</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.mutedForeground, fontSize: 15 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: '#0F1B2D',
  },
  balanceBadge: {
    backgroundColor: colors.card + 'EE', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border,
  },
  balanceLabel: { fontSize: 10, color: colors.mutedForeground, textAlign: 'center' },
  balanceValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  onlineToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, minWidth: 100, justifyContent: 'center',
  },
  onlineBg: { backgroundColor: colors.primary },
  offlineBg: { backgroundColor: colors.secondary + 'EE', borderWidth: 1, borderColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  onlineTxt: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  panel: { paddingHorizontal: 16, paddingTop: 16 },
  infoCard: {
    backgroundColor: colors.card + 'F2', borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  infoTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground },
  infoSub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  tripCard: {
    backgroundColor: colors.card + 'F5', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  newBadge: { backgroundColor: colors.primary + '30', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  newBadgeTxt: { fontSize: 12, fontWeight: '600', color: colors.primary },
  routeBlock: { gap: 6 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  routeTexts: { flex: 1 },
  routeLabel: { fontSize: 10, color: colors.mutedForeground },
  routeVal: { fontSize: 14, color: colors.foreground, fontWeight: '500', textAlign: 'right' },
  routeDivider: { height: 1, backgroundColor: colors.border, marginLeft: 20, marginVertical: 2 },
  // ─── بطاقة الراكب ───
  passengerCard: {
    backgroundColor: colors.background, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
  },
  passengerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#F59E0B25', borderWidth: 2, borderColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
  },
  passengerAvatarText: { fontSize: 20, fontWeight: '800', color: '#F59E0B' },
  passengerInfo: { flex: 1, alignItems: 'flex-end', gap: 3 },
  passengerName: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  passengerPhone: { fontSize: 13, color: colors.mutedForeground },
  passengerAddr: { flex: 1, fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 5,
    elevation: 5,
  },
  acceptBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  acceptTxt: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
  // ─── مودال ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 14,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center' },
  modalSub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center' },
  modalField: { gap: 6 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
  modalInput: {
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 16, color: colors.foreground,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  modalCancel: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  modalCancelTxt: { color: colors.mutedForeground, fontWeight: '600', fontSize: 15 },
  modalConfirm: { backgroundColor: colors.primary },
  modalConfirmTxt: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
  warning: { color: colors.warning ?? '#F59E0B' },
} as any);
