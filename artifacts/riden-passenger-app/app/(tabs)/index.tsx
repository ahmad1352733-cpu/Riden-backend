import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, TextInput, Modal, FlatList, ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import {
  useGetActiveTrip,
  useGetTripTracking,
  useEstimateFare,
  useRequestTrip,
  useCancelTrip,
  useRateTrip,
} from '@workspace/api-client-react';

// ─── Amman Areas ─────────────────────────────────────────────────────────────
const AREAS = [
  { id: 1, name: 'وسط البلد', lat: 31.9539, lng: 35.9106 },
  { id: 2, name: 'مطار الملكة علياء', lat: 31.7228, lng: 35.9920 },
  { id: 3, name: 'الصويفرة', lat: 31.9556, lng: 35.8858 },
  { id: 4, name: 'جامعة الأردن', lat: 32.0138, lng: 35.8721 },
  { id: 5, name: 'العبدلي', lat: 31.9729, lng: 35.9221 },
  { id: 6, name: 'مول مكة', lat: 31.9371, lng: 35.8593 },
  { id: 7, name: 'الزرقاء', lat: 32.0727, lng: 36.0877 },
  { id: 8, name: 'الرابية', lat: 31.9796, lng: 35.9076 },
  { id: 9, name: 'الجبيهة', lat: 32.0277, lng: 35.8687 },
  { id: 10, name: 'دابوق', lat: 32.0161, lng: 35.8436 },
];

// Haversine distance in km
function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS_LABELS: Record<string, { text: string; color: string; icon: string }> = {
  pending:  { text: 'جاري البحث عن كابتن...', color: '#F59E0B', icon: 'loader' },
  accepted: { text: 'الكابتن في الطريق إليك', color: '#22C55E', icon: 'truck' },
  started:  { text: 'الرحلة جارية', color: '#3B82F6', icon: 'navigation' },
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const mapRef = useRef<MapView>(null);
  const startedTripIdRef = useRef<number | null>(null);

  const [userLoc, setUserLoc] = useState({ lat: 31.9539, lng: 35.9106 });
  const [pickup, setPickup] = useState<typeof AREAS[0] | null>(null);
  const [dropoff, setDropoff] = useState<typeof AREAS[0] | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [pickingFor, setPickingFor] = useState<'pickup' | 'dropoff' | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingTripId, setRatingTripId] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [fareData, setFareData] = useState<any>(null);

  // GPS
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  // Active trip polling
  const { data: activeTrip, refetch: refetchTrip } = useGetActiveTrip({
    query: { refetchInterval: 5000 },
  } as any);

  // Track started trip for rating
  useEffect(() => {
    if ((activeTrip as any)?.status === 'started') {
      startedTripIdRef.current = (activeTrip as any).id;
    }
  }, [(activeTrip as any)?.status, (activeTrip as any)?.id]);

  const prevActiveRef = useRef(false);
  useEffect(() => {
    const isActive = !!activeTrip;
    if (prevActiveRef.current && !isActive && startedTripIdRef.current) {
      setRatingTripId(startedTripIdRef.current);
      setShowRating(true);
      startedTripIdRef.current = null;
    }
    prevActiveRef.current = isActive;
  }, [activeTrip]);

  // Captain tracking
  const tripId = (activeTrip as any)?.id ?? 0;
  const { data: tracking } = useGetTripTracking({ id: tripId }, {
    query: {
      enabled: !!tripId && !!((activeTrip as any)?.captainId),
      refetchInterval: 4000,
    },
  } as any);

  // Mutations
  const estimateMutation = useEstimateFare({
    mutation: { onSuccess: (data: any) => setFareData(data) },
  } as any);

  const requestMutation = useRequestTrip({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFareData(null);
        refetchTrip();
      },
    },
  } as any);

  const cancelMutation = useCancelTrip({
    mutation: {
      onSuccess: () => {
        setShowCancelSheet(false);
        setCancelReason('');
        refetchTrip();
      },
    },
  } as any);

  const rateMutation = useRateTrip({
    mutation: {
      onSuccess: () => {
        setShowRating(false);
        setRatingTripId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  } as any);

  const handleEstimate = () => {
    if (!pickup || !dropoff) return;
    const dist = distKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const dur = Math.ceil(dist * 2.5);
    estimateMutation.mutate({ data: { distanceKm: dist, durationMin: dur, discountCode: discountCode || undefined } } as any);
  };

  const handleRequest = () => {
    if (!pickup || !dropoff) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    requestMutation.mutate({
      data: {
        pickupLat: pickup.lat, pickupLng: pickup.lng, pickupAddress: pickup.name,
        dropoffLat: dropoff.lat, dropoffLng: dropoff.lng, dropoffAddress: dropoff.name,
        discountCode: discountCode || undefined,
      },
    } as any);
  };

  const trip = activeTrip as any;
  const captain = trip?.captain;
  const status = trip?.status;
  const statusInfo = STATUS_LABELS[status] ?? null;
  const trackingData = tracking as any;

  const mapRegion = {
    latitude: userLoc.lat,
    longitude: userLoc.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const s = styles(colors, insets);
  const TAB_BAR_H = 60;

  return (
    <View style={s.root}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Pickup */}
        {pickup && !trip && (
          <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="الانطلاق">
            <View style={[s.pin, { backgroundColor: '#F5A623' }]}>
              <Feather name="map-pin" size={14} color="#fff" />
            </View>
          </Marker>
        )}
        {/* Dropoff */}
        {dropoff && !trip && (
          <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} title="الوجهة">
            <View style={[s.pin, { backgroundColor: '#22C55E' }]}>
              <Feather name="flag" size={14} color="#fff" />
            </View>
          </Marker>
        )}
        {/* Captain marker */}
        {trip && trackingData?.captainLat && (
          <>
            <Marker coordinate={{ latitude: trackingData.captainLat, longitude: trackingData.captainLng }} title="الكابتن">
              <View style={[s.pin, { backgroundColor: '#3B82F6', width: 36, height: 36, borderRadius: 18 }]}>
                <Feather name="truck" size={16} color="#fff" />
              </View>
            </Marker>
            <Polyline
              coordinates={[
                { latitude: trackingData.captainLat, longitude: trackingData.captainLng },
                { latitude: userLoc.lat, longitude: userLoc.lng },
              ]}
              strokeColor="#F5A623"
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          </>
        )}
        {/* Dropoff during active trip */}
        {trip && (
          <Marker coordinate={{ latitude: trip.dropoffLat, longitude: trip.dropoffLng }} title="الوجهة" pinColor="#22C55E" />
        )}
      </MapView>

      {/* ── Top greeting ── */}
      <View style={[s.topBar, { top: insets.top + (Platform.OS === 'web' ? 67 : 0) }]}>
        <Text style={s.greeting}>مرحباً، {user?.name?.split(' ')[0] ?? 'راكب'} 👋</Text>
        {!trip && <Text style={s.subGreeting}>إلى أين تريد الذهاب؟</Text>}
      </View>

      {/* ── Bottom sheet ── */}
      <View style={[s.sheet, { paddingBottom: insets.bottom + TAB_BAR_H + (Platform.OS === 'web' ? 34 : 0) }]}>

        {trip ? (
          /* ── Active trip ── */
          <View>
            {/* Status */}
            {statusInfo && (
              <View style={[s.statusBadge, { backgroundColor: statusInfo.color + '22', borderColor: statusInfo.color }]}>
                <Feather name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                <Text style={[s.statusTxt, { color: statusInfo.color }]}>{statusInfo.text}</Text>
              </View>
            )}

            {/* Addresses */}
            <View style={s.addrRow}>
              <Feather name="map-pin" size={13} color="#F5A623" />
              <Text style={s.addrTxt} numberOfLines={1}>{trip.pickupAddress}</Text>
            </View>
            <View style={s.addrRow}>
              <Feather name="navigation" size={13} color="#22C55E" />
              <Text style={s.addrTxt} numberOfLines={1}>{trip.dropoffAddress}</Text>
            </View>

            {/* Captain info */}
            {captain && (
              <View style={s.captainCard}>
                <View style={s.captainAvatar}>
                  <Feather name="user" size={22} color="#F5A623" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.captainName}>{captain.name}</Text>
                  <Text style={s.captainCar}>
                    {captain.vehicleColor} {captain.vehicleMake} {captain.vehicleModel}
                  </Text>
                  <Text style={s.captainPlate}>🚗 {captain.vehiclePlate}</Text>
                </View>
                <View style={s.ratingBadge}>
                  <Feather name="star" size={12} color="#F5A623" />
                  <Text style={s.ratingVal}>{captain.rating?.toFixed(1) ?? '-'}</Text>
                </View>
              </View>
            )}

            {/* Cancel button */}
            {(status === 'pending' || status === 'accepted') && (
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCancelSheet(true)}>
                <Text style={s.cancelBtnTxt}>إلغاء الرحلة</Text>
              </TouchableOpacity>
            )}

            {status === 'started' && trip.fare && (
              <View style={s.fareNote}>
                <Text style={s.fareNoteTxt}>الأجرة المتوقعة: {trip.fare?.toFixed(2)} د.أ</Text>
              </View>
            )}
          </View>
        ) : (
          /* ── Booking form ── */
          <View>
            <Text style={s.bookTitle}>احجز رحلتك</Text>

            {/* Pickup */}
            <TouchableOpacity style={s.locationRow} onPress={() => setPickingFor('pickup')}>
              <Feather name="map-pin" size={16} color="#F5A623" />
              <Text style={[s.locationTxt, !pickup && { color: colors.mutedForeground }]}>
                {pickup?.name ?? 'اختر نقطة الانطلاق'}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Dropoff */}
            <TouchableOpacity style={s.locationRow} onPress={() => setPickingFor('dropoff')}>
              <Feather name="navigation" size={16} color="#22C55E" />
              <Text style={[s.locationTxt, !dropoff && { color: colors.mutedForeground }]}>
                {dropoff?.name ?? 'اختر الوجهة'}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            {/* Discount */}
            <TextInput
              style={s.discountInput}
              value={discountCode}
              onChangeText={setDiscountCode}
              placeholder="كود الخصم (اختياري)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              textAlign="right"
            />

            {/* Fare estimate */}
            {fareData && (
              <View style={s.fareCard}>
                <View style={s.fareRow}><Text style={s.fareLabel}>الأجرة الأساسية</Text><Text style={s.fareVal}>{fareData.baseFare?.toFixed(2)} د.أ</Text></View>
                {fareData.discountAmount > 0 && (
                  <View style={s.fareRow}>
                    <Text style={[s.fareLabel, { color: '#22C55E' }]}>خصم {fareData.discountPercent}%</Text>
                    <Text style={[s.fareVal, { color: '#22C55E' }]}>-{fareData.discountAmount?.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[s.fareRow, s.fareTotalRow]}>
                  <Text style={[s.fareLabel, { color: '#fff', fontFamily: 'Inter_700Bold' }]}>الإجمالي</Text>
                  <Text style={[s.fareVal, { color: '#F5A623', fontSize: 17, fontFamily: 'Inter_700Bold' }]}>{fareData.finalFare?.toFixed(2)} د.أ</Text>
                </View>
              </View>
            )}

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.estimateBtn, (!pickup || !dropoff) && { opacity: 0.5 }]}
                onPress={handleEstimate}
                disabled={!pickup || !dropoff || estimateMutation.isPending}
              >
                {estimateMutation.isPending
                  ? <ActivityIndicator size="small" color="#F5A623" />
                  : <Text style={s.estimateTxt}>احسب السعر</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.requestBtn, (!pickup || !dropoff) && { opacity: 0.5 }]}
                onPress={handleRequest}
                disabled={!pickup || !dropoff || requestMutation.isPending}
              >
                {requestMutation.isPending
                  ? <ActivityIndicator size="small" color="#0F1B2D" />
                  : <Text style={s.requestTxt}>اطلب رحلة</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Area picker ── */}
      <Modal visible={!!pickingFor} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.modalTitle}>{pickingFor === 'pickup' ? 'اختر نقطة الانطلاق' : 'اختر الوجهة'}</Text>
            <FlatList
              data={AREAS}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.areaItem} onPress={() => {
                  if (pickingFor === 'pickup') setPickup(item);
                  else setDropoff(item);
                  setPickingFor(null);
                  setFareData(null);
                }}>
                  <Feather name="map-pin" size={14} color="#F5A623" />
                  <Text style={s.areaName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── Cancel sheet ── */}
      <Modal visible={showCancelSheet} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.modalTitle}>إلغاء الرحلة</Text>
            <TextInput
              style={[s.discountInput, { height: 80, textAlignVertical: 'top', marginBottom: 16 }]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="سبب الإلغاء (اختياري)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlign="right"
            />
            <TouchableOpacity style={[s.cancelBtn, { marginBottom: 10 }]}
              onPress={() => cancelMutation.mutate({ id: trip?.id, data: { reason: cancelReason } } as any)}>
              {cancelMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.cancelBtnTxt}>تأكيد الإلغاء</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCancelSheet(false)} style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 14 }}>تراجع</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Rating modal ── */}
      <Modal visible={showRating} animationType="fade" transparent>
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[s.modalCard, { padding: 28, marginHorizontal: 24, borderRadius: 20 }]}>
            <Text style={[s.modalTitle, { textAlign: 'center', fontSize: 20, marginBottom: 8 }]}>قيّم رحلتك</Text>
            <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontFamily: 'Inter_400Regular', marginBottom: 24, fontSize: 14 }}>
              كيف كانت تجربتك مع الكابتن؟
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 28 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => { setSelectedRating(star); Haptics.selectionAsync(); }}>
                  <Feather name="star" size={40} color={star <= selectedRating ? '#F5A623' : '#2A3F5A'} style={{ marginHorizontal: 5 }} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.requestBtn} onPress={() => {
              if (ratingTripId) rateMutation.mutate({ id: ratingTripId, data: { rating: selectedRating } } as any);
            }}>
              {rateMutation.isPending
                ? <ActivityIndicator color="#0F1B2D" size="small" />
                : <Text style={s.requestTxt}>إرسال التقييم</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowRating(false); setRatingTripId(null); }} style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium', fontSize: 14 }}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  greeting: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff', textAlign: 'right', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  subGreeting: { fontSize: 13, fontFamily: 'Inter_400Regular', color: 'rgba(255,255,255,0.8)', textAlign: 'right', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: c.border },
  pin: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F5A623', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, marginBottom: 12 },
  statusTxt: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  addrRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 6 },
  addrTxt: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right' },
  captainCard: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: c.background, borderRadius: 12, padding: 12, marginTop: 12, marginBottom: 12, gap: 10, borderWidth: 1, borderColor: c.border },
  captainAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#F5A623' },
  captainName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: c.foreground, textAlign: 'right' },
  captainCar: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right' },
  captainPlate: { fontSize: 13, fontFamily: 'Inter_700Bold', color: c.primary, textAlign: 'right' },
  ratingBadge: { alignItems: 'center', gap: 2 },
  ratingVal: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#F5A623' },
  cancelBtn: { backgroundColor: '#3D1515', borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: c.destructive },
  cancelBtnTxt: { color: c.destructive, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  fareNote: { backgroundColor: c.background, borderRadius: 10, padding: 10, marginTop: 8, alignItems: 'center' },
  fareNoteTxt: { color: c.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' },
  bookTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: c.foreground, textAlign: 'right', marginBottom: 14 },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: c.background, borderRadius: 10, padding: 14, marginBottom: 10, gap: 10, borderWidth: 1, borderColor: c.border },
  locationTxt: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', color: c.foreground, textAlign: 'right' },
  discountInput: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.foreground, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 12 },
  fareCard: { backgroundColor: c.background, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: c.border },
  fareRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 },
  fareTotalRow: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, marginTop: 4 },
  fareLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  fareVal: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  actionRow: { flexDirection: 'row-reverse', gap: 10 },
  estimateBtn: { flex: 1, backgroundColor: c.background, borderWidth: 1, borderColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  estimateTxt: { color: c.primary, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  requestBtn: { flex: 2, backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  requestTxt: { color: c.primaryForeground, fontSize: 15, fontFamily: 'Inter_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: c.foreground, textAlign: 'right', marginBottom: 16 },
  areaItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  areaName: { fontSize: 15, fontFamily: 'Inter_500Medium', color: c.foreground, textAlign: 'right' },
});
