import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  TextInput, ScrollView, Platform, I18nManager, Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
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
  useAcceptTrip,
  useStartTrip,
  useCompleteTrip,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

const AMMAN_CENTER = { latitude: 31.9539, longitude: 35.9106 };

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const qc = useQueryClient();

  const [captainLoc, setCaptainLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [distanceKm, setDistanceKm] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const locationMutateRef = useRef<ReturnType<typeof useUpdateCaptainLocation>['mutate'] | null>(null);

  const { data: captain, refetch: refetchProfile, isLoading: profileLoading } = useGetCaptainProfile({
    query: { enabled: !!token, staleTime: 15000 },
  });

  const isOnline = captain?.isOnline ?? false;
  const isApproved = captain?.isApproved ?? false;

  const { data: pendingTrip, refetch: refetchPending } = useGetCaptainPendingTrip({
    query: {
      enabled: !!token && isApproved && isOnline,
      refetchInterval: isApproved && isOnline ? 5000 : false,
    },
  });

  const { data: captainTrips, refetch: refetchTrips } = useGetCaptainTrips({
    query: {
      enabled: !!token && isApproved,
      refetchInterval: isApproved ? 8000 : false,
    },
  });

  const activeTrip = captainTrips?.find(
    (t: any) => t.status === 'accepted' || t.status === 'started',
  );

  const availabilityMutation = useUpdateCaptainAvailability({
    mutation: {
      onSuccess: () => { refetchProfile(); },
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
        Alert.alert('تم', 'قبلت الرحلة! توجّه للراكب.');
      },
      onError: () => Alert.alert('خطأ', 'لم يتم قبول الرحلة، قد تكون قد قُبلت من كابتن آخر'),
    },
  });

  const startMutation = useStartTrip({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getCaptainTrips'] });
        Alert.alert('تم', 'بدأت الرحلة!');
      },
      onError: () => Alert.alert('خطأ', 'تعذّر بدء الرحلة'),
    },
  });

  const completeMutation = useCompleteTrip({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getCaptainTrips'] });
        qc.invalidateQueries({ queryKey: ['getCaptainEarnings'] });
        qc.invalidateQueries({ queryKey: ['getCaptainProfile'] });
        setShowCompleteModal(false);
        setDistanceKm('');
        setDurationMin('');
        Alert.alert('أحسنت!', 'تم إنهاء الرحلة بنجاح 🎉');
      },
      onError: () => Alert.alert('خطأ', 'تعذّر إنهاء الرحلة'),
    },
  });

  // Location tracking
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
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: 30000 },
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

  // Initial location for map
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

  const s = styles(colors);
  const mapRegion = captainLoc
    ? { ...captainLoc, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : { ...AMMAN_CENTER, latitudeDelta: 0.08, longitudeDelta: 0.08 };

  const tripMarker = activeTrip
    ? {
        latitude: activeTrip.status === 'accepted'
          ? (activeTrip as any).pickupLat
          : (activeTrip as any).dropoffLat,
        longitude: activeTrip.status === 'accepted'
          ? (activeTrip as any).pickupLng
          : (activeTrip as any).dropoffLng,
      }
    : pendingTrip
      ? { latitude: (pendingTrip as any).pickupLat, longitude: (pendingTrip as any).pickupLng }
      : null;

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
      {/* Map */}
      {Platform.OS !== 'web' ? (
        <MapView
          style={s.map}
          provider={PROVIDER_DEFAULT}
          region={mapRegion}
          showsUserLocation={false}
        >
          {captainLoc && (
            <Marker coordinate={captainLoc} title="موقعك">
              <View style={s.captainMarker}>
                <Feather name="navigation" size={18} color={colors.primaryForeground} />
              </View>
            </Marker>
          )}
          {tripMarker && (
            <Marker coordinate={tripMarker} title={activeTrip?.status === 'accepted' ? 'موقع الراكب' : 'الوجهة'}>
              <View style={[s.captainMarker, { backgroundColor: colors.warning }]}>
                <Feather name="map-pin" size={16} color={colors.warningForeground} />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={[s.map, s.mapPlaceholder]}>
          <Feather name="map" size={48} color={colors.mutedForeground} />
          <Text style={s.mapPlaceholderText}>الخريطة متاحة على الهاتف</Text>
        </View>
      )}

      {/* Top Bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 12 }]}>
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
              <View style={[s.dot, isOnline ? s.dotOnline : s.dotOffline]} />
              <Text style={s.onlineText}>{isOnline ? 'متاح' : 'غير متاح'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Panel */}
      <View style={[s.panel, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 80) }]}>

        {/* Not Approved */}
        {!isApproved && (
          <View style={s.infoCard}>
            <Feather name="clock" size={28} color={colors.warning} style={{ marginBottom: 8 }} />
            <Text style={s.infoTitle}>بانتظار الموافقة</Text>
            <Text style={s.infoSub}>طلبك قيد المراجعة من الإدارة. سيتم إخطارك عند القبول.</Text>
          </View>
        )}

        {/* Approved + Offline */}
        {isApproved && !isOnline && !activeTrip && (
          <View style={s.infoCard}>
            <Feather name="power" size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={s.infoTitle}>أنت غير متاح حالياً</Text>
            <Text style={s.infoSub}>اضغط على "غير متاح" أعلاه للبدء بقبول الرحلات</Text>
          </View>
        )}

        {/* Online, no trip */}
        {isApproved && isOnline && !pendingTrip && !activeTrip && (
          <View style={s.infoCard}>
            <ActivityIndicator color={colors.primary} style={{ marginBottom: 10 }} />
            <Text style={s.infoTitle}>تبحث عن رحلات...</Text>
            <Text style={s.infoSub}>جاهز لقبول الرحلات القريبة منك</Text>
          </View>
        )}

        {/* Pending Trip */}
        {isApproved && isOnline && pendingTrip && !activeTrip && (
          <View style={s.tripCard}>
            <View style={s.tripCardHeader}>
              <Text style={s.tripCardTitle}>طلب رحلة جديد</Text>
              <View style={s.newBadge}>
                <Text style={s.newBadgeText}>جديد</Text>
              </View>
            </View>

            <View style={s.routeRow}>
              <View style={s.routeIcon}>
                <Feather name="circle" size={10} color={colors.primary} />
              </View>
              <View style={s.routeTextWrap}>
                <Text style={s.routeLabel}>نقطة الانطلاق</Text>
                <Text style={s.routeValue}>{(pendingTrip as any).pickupAddress}</Text>
              </View>
            </View>
            <View style={s.routeDivider} />
            <View style={s.routeRow}>
              <View style={s.routeIcon}>
                <Feather name="map-pin" size={12} color={colors.destructive} />
              </View>
              <View style={s.routeTextWrap}>
                <Text style={s.routeLabel}>الوجهة</Text>
                <Text style={s.routeValue}>{(pendingTrip as any).dropoffAddress}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.acceptBtn}
              onPress={() => acceptMutation.mutate({ id: (pendingTrip as any).id })}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending
                ? <ActivityIndicator color={colors.primaryForeground} />
                : <Text style={s.acceptBtnText}>✓ قبول الرحلة</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Active Trip — Accepted (En route to passenger) */}
        {activeTrip && activeTrip.status === 'accepted' && (
          <View style={s.tripCard}>
            <View style={s.tripCardHeader}>
              <Text style={s.tripCardTitle}>في الطريق للراكب</Text>
              <View style={[s.newBadge, { backgroundColor: colors.warning + '30' }]}>
                <Text style={[s.newBadgeText, { color: colors.warning }]}>قيد التنفيذ</Text>
              </View>
            </View>

            <View style={s.routeRow}>
              <View style={s.routeIcon}>
                <Feather name="circle" size={10} color={colors.primary} />
              </View>
              <View style={s.routeTextWrap}>
                <Text style={s.routeLabel}>موقع الراكب</Text>
                <Text style={s.routeValue}>{activeTrip.pickupAddress}</Text>
              </View>
            </View>
            <View style={s.routeDivider} />
            <View style={s.routeRow}>
              <View style={s.routeIcon}>
                <Feather name="map-pin" size={12} color={colors.destructive} />
              </View>
              <View style={s.routeTextWrap}>
                <Text style={s.routeLabel}>الوجهة</Text>
                <Text style={s.routeValue}>{activeTrip.dropoffAddress}</Text>
              </View>
            </View>

            {(activeTrip as any).passenger && (
              <Text style={s.passengerName}>
                الراكب: {(activeTrip as any).passenger?.name ?? ''}
              </Text>
            )}

            <TouchableOpacity
              style={[s.acceptBtn, { backgroundColor: colors.warning }]}
              onPress={() => startMutation.mutate({ id: activeTrip.id })}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending
                ? <ActivityIndicator color={colors.warningForeground} />
                : <Text style={[s.acceptBtnText, { color: colors.warningForeground }]}>وصلت للراكب ← ابدأ الرحلة</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Active Trip — Started (trip in progress) */}
        {activeTrip && activeTrip.status === 'started' && (
          <View style={s.tripCard}>
            <View style={s.tripCardHeader}>
              <Text style={s.tripCardTitle}>الرحلة جارية</Text>
              <View style={[s.newBadge, { backgroundColor: colors.primary + '30' }]}>
                <Text style={[s.newBadgeText, { color: colors.primary }]}>نشط</Text>
              </View>
            </View>

            <View style={s.routeRow}>
              <View style={s.routeIcon}>
                <Feather name="map-pin" size={12} color={colors.destructive} />
              </View>
              <View style={s.routeTextWrap}>
                <Text style={s.routeLabel}>الوجهة</Text>
                <Text style={s.routeValue}>{activeTrip.dropoffAddress}</Text>
              </View>
            </View>

            {(activeTrip as any).passenger && (
              <Text style={s.passengerName}>
                الراكب: {(activeTrip as any).passenger?.name ?? ''}
              </Text>
            )}

            <TouchableOpacity
              style={s.acceptBtn}
              onPress={() => setShowCompleteModal(true)}
            >
              <Text style={s.acceptBtnText}>إنهاء الرحلة</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Complete Trip Modal */}
      <Modal visible={showCompleteModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.modalTitle}>تفاصيل الرحلة</Text>
            <Text style={s.modalSub}>أدخل البيانات الفعلية للرحلة</Text>

            <View style={s.modalField}>
              <Text style={s.modalLabel}>المسافة (كم)</Text>
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
              <Text style={s.modalLabel}>المدة (دقيقة)</Text>
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
              <TouchableOpacity
                style={[s.modalBtn, s.cancelBtn]}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={s.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.confirmBtn]}
                onPress={handleComplete}
                disabled={completeMutation.isPending}
              >
                {completeMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.confirmBtnText}>تأكيد الإنهاء</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    loadingText: { color: colors.mutedForeground, fontSize: 15 },
    map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    mapPlaceholder: {
      alignItems: 'center', justifyContent: 'center', gap: 12,
      backgroundColor: colors.secondary,
    },
    mapPlaceholderText: { color: colors.mutedForeground, fontSize: 14 },
    captainMarker: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
      elevation: 6,
    },
    topBar: {
      position: 'absolute', top: 0, left: 0, right: 0,
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 16, paddingBottom: 12,
    },
    balanceBadge: {
      backgroundColor: colors.card + 'EE',
      borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    balanceLabel: { fontSize: 11, color: colors.mutedForeground, textAlign: 'center' },
    balanceValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
    onlineToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
      minWidth: 90, justifyContent: 'center',
    },
    onlineBg: { backgroundColor: colors.primary },
    offlineBg: { backgroundColor: colors.secondary + 'DD', borderWidth: 1, borderColor: colors.border },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotOnline: { backgroundColor: colors.primaryForeground },
    dotOffline: { backgroundColor: colors.mutedForeground },
    onlineText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
    panel: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 16, paddingTop: 16,
    },
    infoCard: {
      backgroundColor: colors.card + 'F2',
      borderRadius: 20, padding: 24, alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    infoTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
    infoSub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
    tripCard: {
      backgroundColor: colors.card + 'F5',
      borderRadius: 20, padding: 18, gap: 10,
      borderWidth: 1, borderColor: colors.border,
    },
    tripCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tripCardTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
    newBadge: { backgroundColor: colors.primary + '30', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
    newBadgeText: { fontSize: 12, fontWeight: '600', color: colors.primary },
    routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    routeIcon: { marginTop: 3, width: 20, alignItems: 'center' },
    routeTextWrap: { flex: 1 },
    routeLabel: { fontSize: 11, color: colors.mutedForeground },
    routeValue: { fontSize: 14, color: colors.foreground, fontWeight: '500', textAlign: 'right' },
    routeDivider: { height: 1, backgroundColor: colors.border, marginLeft: 20 },
    passengerName: { fontSize: 13, color: colors.mutedForeground, textAlign: 'right' },
    acceptBtn: {
      backgroundColor: colors.primary, borderRadius: 14,
      paddingVertical: 13, alignItems: 'center', marginTop: 4,
    },
    acceptBtnText: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalBox: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, gap: 14,
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
    modalSub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center' },
    modalField: { gap: 6 },
    modalLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
    modalInput: {
      backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 12,
      fontSize: 16, color: colors.foreground,
    },
    modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
    modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
    cancelBtn: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
    cancelBtnText: { color: colors.mutedForeground, fontWeight: '600', fontSize: 15 },
    confirmBtn: { backgroundColor: colors.primary },
    confirmBtnText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
    // Warning color usage
    warning: { color: colors.warning ?? '#F59E0B' },
    warningBg: { backgroundColor: colors.warning ?? '#F59E0B' },
  } as any);
