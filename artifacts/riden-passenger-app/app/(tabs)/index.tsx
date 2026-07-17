import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, TextInput, Modal, FlatList, Linking,
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
  useUpdatePassengerLocation,
} from '@workspace/api-client-react';

// ─── مناطق عمّان ────────────────────────────────────────────────────────────
const AREAS = [
  { id: 1,  name: 'وسط البلد',          lat: 31.9539, lng: 35.9106 },
  { id: 2,  name: 'مطار الملكة علياء',  lat: 31.7228, lng: 35.9920 },
  { id: 3,  name: 'الصويفرة',           lat: 31.9556, lng: 35.8858 },
  { id: 4,  name: 'جامعة الأردن',       lat: 32.0138, lng: 35.8721 },
  { id: 5,  name: 'العبدلي',            lat: 31.9729, lng: 35.9221 },
  { id: 6,  name: 'مول مكة',            lat: 31.9371, lng: 35.8593 },
  { id: 7,  name: 'الزرقاء',            lat: 32.0727, lng: 36.0877 },
  { id: 8,  name: 'الرابية',            lat: 31.9796, lng: 35.9076 },
  { id: 9,  name: 'الجبيهة',            lat: 32.0277, lng: 35.8687 },
  { id: 10, name: 'دابوق',              lat: 32.0161, lng: 35.8436 },
  { id: 11, name: 'شارع المدينة المنورة', lat: 31.9649, lng: 35.8710 },
  { id: 12, name: 'السابع',             lat: 31.9776, lng: 35.9400 },
];

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const STATUS_INFO: Record<string, { text: string; color: string; icon: string }> = {
  pending:  { text: 'جاري البحث عن كابتن...', color: '#F59E0B', icon: 'loader' },
  accepted: { text: 'الكابتن في الطريق إليك ✓', color: '#22C55E', icon: 'truck' },
  started:  { text: 'الرحلة جارية 🚗', color: '#3B82F6', icon: 'navigation' },
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mapRef = useRef<MapView>(null);

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
  const startedTripIdRef = useRef<number | null>(null);
  const prevActiveRef = useRef(false);

  // ─── GPS الراكب ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  // ─── استعلام الرحلة النشطة ───────────────────────────────────────────────
  const { data: activeTrip, refetch: refetchTrip } = useGetActiveTrip({
    query: { refetchInterval: 5000 },
  } as any);

  const trip = activeTrip as any;
  const captain = trip?.captain;
  const status = trip?.status;
  const tripId = trip?.id ?? 0;
  const statusInfo = STATUS_INFO[status] ?? null;

  // تتبع الرحلة المنتهية للتقييم
  useEffect(() => {
    if (status === 'started') startedTripIdRef.current = tripId;
  }, [status, tripId]);

  useEffect(() => {
    const isActive = !!trip;
    if (prevActiveRef.current && !isActive && startedTripIdRef.current) {
      setRatingTripId(startedTripIdRef.current);
      setShowRating(true);
      startedTripIdRef.current = null;
    }
    prevActiveRef.current = isActive;
  }, [trip]);

  // ─── تتبع موقع الكابتن ───────────────────────────────────────────────────
  const { data: tracking } = useGetTripTracking({ id: tripId }, {
    query: {
      enabled: !!tripId && !!trip?.captainId,
      refetchInterval: 4000,
    },
  } as any);

  // ─── إرسال موقع الراكب للسيرفر ──────────────────────────────────────────
  const passengerLocMutation = useUpdatePassengerLocation();

  useEffect(() => {
    if (!tripId || !['pending', 'accepted', 'started'].includes(status ?? '')) return;

    const send = async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (perm !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = pos.coords;
        setUserLoc({ lat: latitude, lng: longitude });
        passengerLocMutation.mutate({ id: tripId, data: { lat: latitude, lng: longitude } } as any);
      } catch { /* ignore */ }
    };

    send();
    const interval = setInterval(send, 20000);
    return () => clearInterval(interval);
  }, [tripId, status]);

  // ─── الطفرات ─────────────────────────────────────────────────────────────
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

  const callCaptain = () => {
    if (captain?.phone) Linking.openURL(`tel:${captain.phone}`);
  };

  const trackingData = tracking as any;
  const captainCoord = trackingData?.captainLat
    ? { latitude: trackingData.captainLat, longitude: trackingData.captainLng }
    : null;

  const s = styles(colors, insets);

  return (
    <View style={s.root}>
      {/* ─── الخريطة ─── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
        region={{
          latitude: captainCoord?.latitude ?? userLoc.lat,
          longitude: captainCoord?.longitude ?? userLoc.lng,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* نقطة الانطلاق قبل الرحلة */}
        {pickup && !trip && (
          <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="الانطلاق">
            <View style={[s.pin, { backgroundColor: '#F59E0B' }]}>
              <Feather name="map-pin" size={14} color="#fff" />
            </View>
          </Marker>
        )}
        {/* الوجهة قبل الرحلة */}
        {dropoff && !trip && (
          <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} title="الوجهة">
            <View style={[s.pin, { backgroundColor: '#22C55E' }]}>
              <Feather name="flag" size={14} color="#fff" />
            </View>
          </Marker>
        )}
        {/* موقع الكابتن */}
        {captainCoord && (
          <>
            <Marker coordinate={captainCoord} title="الكابتن">
              <View style={s.captainMarker}>
                <Feather name="truck" size={18} color="#fff" />
              </View>
            </Marker>
            {/* خط من الكابتن للراكب */}
            <Polyline
              coordinates={[captainCoord, { latitude: userLoc.lat, longitude: userLoc.lng }]}
              strokeColor="#F59E0B"
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          </>
        )}
        {/* الوجهة أثناء الرحلة */}
        {trip && (
          <Marker coordinate={{ latitude: trip.dropoffLat, longitude: trip.dropoffLng }} title="الوجهة">
            <View style={[s.pin, { backgroundColor: '#22C55E', width: 34, height: 34, borderRadius: 17 }]}>
              <Feather name="flag" size={15} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ─── شريط الترحيب العلوي ─── */}
      <View style={[s.topBar, { top: insets.top + (Platform.OS === 'web' ? 67 : 10) }]}>
        <View style={s.greetCard}>
          <Text style={s.greeting}>مرحباً، {user?.name?.split(' ')[0] ?? 'راكب'} 👋</Text>
          {!trip && <Text style={s.subGreeting}>إلى أين تريد الذهاب؟</Text>}
        </View>
      </View>

      {/* ─── اللوح السفلي ─── */}
      <View style={[s.sheet, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 70) }]}>

        {trip ? (
          /* ─── رحلة نشطة ─── */
          <View style={{ gap: 10 }}>
            {/* حالة الرحلة */}
            {statusInfo && (
              <View style={[s.statusBadge, { backgroundColor: statusInfo.color + '20', borderColor: statusInfo.color }]}>
                <Feather name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                <Text style={[s.statusTxt, { color: statusInfo.color }]}>{statusInfo.text}</Text>
              </View>
            )}

            {/* المسار */}
            <View style={s.routeCard}>
              <View style={s.routeRow}>
                <Feather name="circle" size={10} color="#F59E0B" />
                <Text style={s.routeTxt} numberOfLines={1}>{trip.pickupAddress}</Text>
              </View>
              <View style={s.routeLine} />
              <View style={s.routeRow}>
                <Feather name="map-pin" size={12} color="#22C55E" />
                <Text style={s.routeTxt} numberOfLines={1}>{trip.dropoffAddress}</Text>
              </View>
            </View>

            {/* بطاقة الكابتن الكاملة */}
            {captain && (
              <View style={s.captainCard}>
                <View style={s.captainLeft}>
                  <View style={s.captainAvatar}>
                    <Text style={s.captainAvatarText}>{captain.name?.charAt(0) ?? 'K'}</Text>
                  </View>
                  <View style={s.ratingRow}>
                    <Feather name="star" size={12} color="#F59E0B" />
                    <Text style={s.ratingVal}>{(captain.rating ?? 0).toFixed(1)}</Text>
                  </View>
                </View>
                <View style={s.captainInfo}>
                  <Text style={s.captainName}>{captain.name}</Text>
                  <Text style={s.captainCar}>
                    {captain.vehicleColor} {captain.vehicleMake} {captain.vehicleModel} ({captain.vehicleYear})
                  </Text>
                  <View style={s.plateRow}>
                    <Feather name="credit-card" size={11} color={colors.mutedForeground} />
                    <Text style={s.plateNum}>{captain.vehiclePlate}</Text>
                  </View>
                  <Text style={s.captainPhone}>{captain.phone}</Text>
                </View>
                <TouchableOpacity style={s.callBtn} onPress={callCaptain}>
                  <Feather name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* الأجرة المتوقعة */}
            {status === 'started' && trip.fare && (
              <View style={s.fareNote}>
                <Feather name="dollar-sign" size={14} color={colors.primary} />
                <Text style={s.fareNoteTxt}>الأجرة المتوقعة: {trip.fare?.toFixed(2)} د.أ</Text>
              </View>
            )}

            {/* إلغاء */}
            {(status === 'pending' || status === 'accepted') && (
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCancelSheet(true)}>
                <Feather name="x-circle" size={15} color={colors.destructive} />
                <Text style={s.cancelBtnTxt}>إلغاء الرحلة</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* ─── نموذج الحجز ─── */
          <View style={{ gap: 10 }}>
            <Text style={s.bookTitle}>احجز رحلتك</Text>

            <TouchableOpacity style={s.locationRow} onPress={() => setPickingFor('pickup')}>
              <Feather name="map-pin" size={16} color="#F59E0B" />
              <Text style={[s.locationTxt, !pickup && { color: colors.mutedForeground }]}>
                {pickup?.name ?? 'اختر نقطة الانطلاق'}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={s.locationRow} onPress={() => setPickingFor('dropoff')}>
              <Feather name="navigation" size={16} color="#22C55E" />
              <Text style={[s.locationTxt, !dropoff && { color: colors.mutedForeground }]}>
                {dropoff?.name ?? 'اختر الوجهة'}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TextInput
              style={s.discountInput}
              value={discountCode}
              onChangeText={setDiscountCode}
              placeholder="كود الخصم (اختياري)"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              textAlign="right"
            />

            {fareData && (
              <View style={s.fareCard}>
                <View style={s.fareRow}>
                  <Text style={s.fareLabel}>أجرة الانطلاق</Text>
                  <Text style={s.fareVal}>{fareData.baseFare?.toFixed(2)} د.أ</Text>
                </View>
                {fareData.distanceFare > 0 && (
                  <View style={s.fareRow}>
                    <Text style={s.fareLabel}>أجرة المسافة</Text>
                    <Text style={s.fareVal}>{fareData.distanceFare?.toFixed(2)} د.أ</Text>
                  </View>
                )}
                {fareData.timeFare > 0 && (
                  <View style={s.fareRow}>
                    <Text style={s.fareLabel}>أجرة الوقت</Text>
                    <Text style={s.fareVal}>{fareData.timeFare?.toFixed(2)} د.أ</Text>
                  </View>
                )}
                {fareData.discountAmount > 0 && (
                  <View style={s.fareRow}>
                    <Text style={[s.fareLabel, { color: '#22C55E' }]}>خصم {fareData.discountPercent}%</Text>
                    <Text style={[s.fareVal, { color: '#22C55E' }]}>- {fareData.discountAmount?.toFixed(2)} د.أ</Text>
                  </View>
                )}
                <View style={[s.fareRow, s.fareTotalRow]}>
                  <Text style={[s.fareLabel, { color: colors.foreground, fontWeight: '700' }]}>الإجمالي</Text>
                  <Text style={[s.fareVal, { color: '#F59E0B', fontSize: 17, fontWeight: '800' }]}>
                    {fareData.finalFare?.toFixed(2)} د.أ
                  </Text>
                </View>
              </View>
            )}

            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.estimateBtn, (!pickup || !dropoff) && { opacity: 0.4 }]}
                onPress={handleEstimate}
                disabled={!pickup || !dropoff || estimateMutation.isPending}
              >
                {estimateMutation.isPending
                  ? <ActivityIndicator size="small" color="#F59E0B" />
                  : <Text style={s.estimateTxt}>احسب السعر</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.requestBtn, (!pickup || !dropoff) && { opacity: 0.4 }]}
                onPress={handleRequest}
                disabled={!pickup || !dropoff || requestMutation.isPending}
              >
                {requestMutation.isPending
                  ? <ActivityIndicator size="small" color="#0F1B2D" />
                  : <Text style={s.requestTxt}>اطلب رحلة 🚗</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ─── اختيار المنطقة ─── */}
      <Modal visible={!!pickingFor} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>
              {pickingFor === 'pickup' ? '📍 اختر نقطة الانطلاق' : '🏁 اختر الوجهة'}
            </Text>
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
                  <Feather name="map-pin" size={14} color="#F59E0B" />
                  <Text style={s.areaName}>{item.name}</Text>
                  <Feather name="chevron-left" size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ─── إلغاء الرحلة ─── */}
      <Modal visible={showCancelSheet} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>إلغاء الرحلة</Text>
            <TextInput
              style={[s.discountInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="سبب الإلغاء (اختياري)"
              placeholderTextColor={colors.mutedForeground}
              multiline
              textAlign="right"
            />
            <TouchableOpacity style={s.cancelBtnFull}
              onPress={() => cancelMutation.mutate({ id: trip?.id, data: { reason: cancelReason } } as any)}>
              {cancelMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.cancelBtnFullTxt}>تأكيد الإلغاء</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCancelSheet(false)} style={s.backLink}>
              <Text style={s.backLinkTxt}>تراجع</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── تقييم الرحلة ─── */}
      <Modal visible={showRating} animationType="fade" transparent>
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[s.modalCard, { padding: 28, marginHorizontal: 24, borderRadius: 24 }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>⭐</Text>
            <Text style={[s.modalTitle, { textAlign: 'center', fontSize: 20 }]}>قيّم تجربتك</Text>
            <Text style={s.ratingSubtitle}>كيف كانت الرحلة مع الكابتن؟</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => { setSelectedRating(star); Haptics.selectionAsync(); }}>
                  <Feather
                    name="star"
                    size={42}
                    color={star <= selectedRating ? '#F59E0B' : colors.border}
                    style={{ marginHorizontal: 4 }}
                  />
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
            <TouchableOpacity onPress={() => { setShowRating(false); setRatingTripId(null); }} style={s.backLink}>
              <Text style={s.backLinkTxt}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root: { flex: 1 },
  topBar: { position: 'absolute', left: 16, right: 16, zIndex: 10 },
  greetCard: {
    backgroundColor: 'rgba(15,27,45,0.88)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  greeting: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'right' },
  subGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'right', marginTop: 2 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, borderWidth: 1, borderColor: c.border,
  },
  pin: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
    elevation: 6,
  },
  captainMarker: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.5, shadowRadius: 5,
    elevation: 8,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1,
  },
  statusTxt: { fontSize: 14, fontWeight: '600' },
  routeCard: {
    backgroundColor: c.background, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: c.border, gap: 8,
  },
  routeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  routeTxt: { flex: 1, fontSize: 13, color: c.foreground, textAlign: 'right' },
  routeLine: { height: 1, backgroundColor: c.border, marginLeft: 14 },
  // ─── بطاقة الكابتن ───
  captainCard: {
    backgroundColor: c.background, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: c.border,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
  },
  captainLeft: { alignItems: 'center', gap: 4 },
  captainAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#F59E0B20', borderWidth: 2, borderColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center',
  },
  captainAvatarText: { fontSize: 22, fontWeight: '800', color: '#F59E0B' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingVal: { fontSize: 13, fontWeight: '700', color: '#F59E0B' },
  captainInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  captainName: { fontSize: 16, fontWeight: '700', color: c.foreground },
  captainCar: { fontSize: 12, color: c.mutedForeground },
  plateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  plateNum: { fontSize: 13, fontWeight: '700', color: c.primary, letterSpacing: 1 },
  captainPhone: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
  callBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#22C55E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 6,
    elevation: 6,
  },
  fareNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.background, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: c.border,
  },
  fareNoteTxt: { color: c.foreground, fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.destructive + '15', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: c.destructive,
  },
  cancelBtnTxt: { color: c.destructive, fontSize: 14, fontWeight: '600' },
  bookTitle: { fontSize: 18, fontWeight: '800', color: c.foreground, textAlign: 'right' },
  locationRow: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: c.background, borderRadius: 12, padding: 14,
    gap: 10, borderWidth: 1, borderColor: c.border,
  },
  locationTxt: { flex: 1, fontSize: 14, color: c.foreground, textAlign: 'right' },
  discountInput: {
    backgroundColor: c.background, borderWidth: 1, borderColor: c.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: c.foreground, fontSize: 14, textAlign: 'right',
  },
  fareCard: {
    backgroundColor: c.background, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: c.border, gap: 6,
  },
  fareRow: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  fareTotalRow: {
    borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, marginTop: 4,
  },
  fareLabel: { fontSize: 13, color: c.mutedForeground },
  fareVal: { fontSize: 14, fontWeight: '600', color: c.foreground },
  actionRow: { flexDirection: 'row-reverse', gap: 10 },
  estimateBtn: {
    flex: 1, backgroundColor: c.background, borderWidth: 1.5,
    borderColor: c.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  estimateTxt: { color: c.primary, fontSize: 14, fontWeight: '600' },
  requestBtn: {
    flex: 2, backgroundColor: c.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  requestTxt: { color: c.primaryForeground, fontSize: 15, fontWeight: '800' },
  // ─── مودال ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, maxHeight: '75%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: c.foreground, textAlign: 'right', marginBottom: 16 },
  areaItem: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  areaName: { flex: 1, fontSize: 15, fontWeight: '500', color: c.foreground, textAlign: 'right' },
  cancelBtnFull: {
    backgroundColor: c.destructive, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 10,
  },
  cancelBtnFullTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backLink: { alignItems: 'center', paddingVertical: 8 },
  backLinkTxt: { color: c.mutedForeground, fontSize: 14 },
  ratingSubtitle: { color: c.mutedForeground, textAlign: 'center', fontSize: 14, marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
});
