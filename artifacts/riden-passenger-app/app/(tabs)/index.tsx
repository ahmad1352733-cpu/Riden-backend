import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, TextInput, Modal, FlatList, Linking, Alert,
} from 'react-native';
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
import RidenMap from '@/components/RidenMap';

// ─── مقترحات سريعة ───────────────────────────────────────────────────────────
const QUICK = [
  { id: 1,  name: 'مطار الملكة علياء',    lat: 31.7228, lng: 35.9920 },
  { id: 2,  name: 'وسط البلد',            lat: 31.9539, lng: 35.9106 },
  { id: 3,  name: 'جامعة الأردن',         lat: 32.0138, lng: 35.8721 },
  { id: 4,  name: 'العبدلي',              lat: 31.9729, lng: 35.9221 },
  { id: 5,  name: 'مول مكة',              lat: 31.9371, lng: 35.8593 },
  { id: 6,  name: 'الزرقاء',              lat: 32.0727, lng: 36.0877 },
  { id: 7,  name: 'الرابية',              lat: 31.9796, lng: 35.9076 },
  { id: 8,  name: 'دابوق',               lat: 32.0161, lng: 35.8436 },
  { id: 9,  name: 'الجبيهة',              lat: 32.0277, lng: 35.8687 },
  { id: 10, name: 'شارع المدينة المنورة', lat: 31.9649, lng: 35.8710 },
];

interface Place { id: number; name: string; lat: number; lng: number; }

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function nominatimSearch(q: string): Promise<Place[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=jo&accept-language=ar`;
    const r = await fetch(url, { headers: { 'User-Agent': 'RidenApp/1.0' } });
    const data = await r.json();
    return (data as any[]).map((item: any, i: number) => ({
      id: i + 100,
      name: item.display_name?.split(',').slice(0, 2).join('، ') ?? item.name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch { return []; }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`,
      { headers: { 'User-Agent': 'RidenApp/1.0' } }
    );
    const d = await r.json();
    const addr = d.address;
    return [addr?.road, addr?.suburb, addr?.city]
      .filter(Boolean).slice(0, 2).join('، ') || d.display_name?.split(',')[0] || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
}

const STATUS_INFO: Record<string, { text: string; color: string; icon: string }> = {
  pending:  { text: 'جاري البحث عن كابتن...', color: '#F59E0B', icon: 'loader' },
  accepted: { text: 'الكابتن في الطريق إليك ✓', color: '#22C55E', icon: 'truck' },
  started:  { text: 'الرحلة جارية 🚗',          color: '#3B82F6', icon: 'navigation' },
};

export default function HomeScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const [userLoc,        setUserLoc]        = useState({ lat: 31.9539, lng: 35.9106 });
  const [pickup,         setPickup]         = useState<Place | null>(null);
  const [dropoff,        setDropoff]        = useState<Place | null>(null);
  const [discountCode,   setDiscountCode]   = useState('');
  const [pickingFor,     setPickingFor]     = useState<'pickup' | 'dropoff' | null>(null);
  const [cancelReason,   setCancelReason]   = useState('');
  const [showCancelSheet,setShowCancelSheet]= useState(false);
  const [showRating,     setShowRating]     = useState(false);
  const [ratingTripId,   setRatingTripId]   = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [fareData,       setFareData]       = useState<any>(null);

  // ─── بحث الموقع ──────────────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [mapPickMode,   setMapPickMode]   = useState(false);
  const [reverseLoading,setReverseLoading]= useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startedTripIdRef = useRef<number | null>(null);
  const prevActiveRef    = useRef(false);

  // ─── GPS الراكب ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      // آخر موقع محفوظ فوراً — الخريطة تتمركز بدون انتظار
      const last = await Location.getLastKnownPositionAsync({});
      if (last) setUserLoc({ lat: last.coords.latitude, lng: last.coords.longitude });
      // تحديث بالموقع الدقيق في الخلفية
      const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLoc({ lat: fresh.coords.latitude, lng: fresh.coords.longitude });
    })();
  }, []);

  // ─── البحث اللحظي عبر Nominatim ────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const results = await nominatimSearch(searchQuery);
      setSearchResults(results);
      setSearching(false);
    }, 600);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // ─── اختيار موقع ────────────────────────────────────────────────────────
  const selectPlace = (place: Place) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pickingFor === 'pickup') setPickup(place);
    else setDropoff(place);
    closeSearchModal();
    setFareData(null);
  };

  const closeSearchModal = () => {
    setPickingFor(null);
    setSearchQuery('');
    setSearchResults([]);
    setMapPickMode(false);
  };

  // ─── موقعي الحالي ────────────────────────────────────────────────────────
  const handleUseMyLocation = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // استخدم الموقع المحفوظ فوراً بدون انتظار GPS جديد
      const loc = { id: 0, name: 'موقعي الحالي 📍', lat: userLoc.lat, lng: userLoc.lng };
      // إذا المودال مفتوح استخدم selectPlace، وإلا حط الموقع في نقطة الانطلاق مباشرة
      if (pickingFor) {
        selectPlace(loc);
      } else {
        setPickup(loc);
        setFareData(null);
      }
      // حدّث الموقع في الخلفية للمرة القادمة
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then(loc2 => setUserLoc({ lat: loc2.coords.latitude, lng: loc2.coords.longitude }))
        .catch(() => {});
    } catch { /* ignore */ }
  };

  // ─── الضغط على الخريطة لاختيار موقع ─────────────────────────────────────
  const handleMapTap = async (lat: number, lng: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const placeId = Date.now();
    // احفظ pickingFor قبل ما يتغير بعد selectPlace
    const forField = pickingFor;
    // اختر الموقع فوراً بالإحداثيات
    selectPlace({ id: placeId, name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
    // جلب اسم الشارع في الخلفية وتحديث الاسم
    setReverseLoading(true);
    reverseGeocode(lat, lng).then(resolvedName => {
      setReverseLoading(false);
      if (forField === 'pickup') setPickup(p => p?.id === placeId ? { ...p, name: resolvedName } : p);
      else setDropoff(p => p?.id === placeId ? { ...p, name: resolvedName } : p);
    }).catch(() => setReverseLoading(false));
  };

  // ─── الرحلة النشطة ───────────────────────────────────────────────────────
  const { data: activeTrip, refetch: refetchTrip } = useGetActiveTrip({
    query: { refetchInterval: 3000 },
  } as any);

  const trip       = activeTrip as any;
  const captain    = trip?.captain;
  const status     = trip?.status;
  const tripId     = trip?.id ?? 0;
  const statusInfo = STATUS_INFO[status] ?? null;

  useEffect(() => { if (status === 'started') startedTripIdRef.current = tripId; }, [status, tripId]);

  // ─── حساب السعر تلقائي لما يتحدد الانطلاق والوجهة ───────────────────────
  useEffect(() => {
    if (!pickup || !dropoff || trip) return;
    const dist = distKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const dur  = Math.ceil(dist * 2.5);
    estimateMutation.mutate({ data: { distanceKm: dist, durationMin: dur, discountCode: discountCode || undefined } } as any);
  }, [pickup, dropoff, discountCode]);
  useEffect(() => {
    const isActive = !!trip;
    if (prevActiveRef.current && !isActive && startedTripIdRef.current) {
      setRatingTripId(startedTripIdRef.current);
      setShowRating(true);
      startedTripIdRef.current = null;
    }
    prevActiveRef.current = isActive;
  }, [trip]);

  // ─── تتبع موقع الكابتن (حي) ─────────────────────────────────────────────
  const { data: tracking } = useGetTripTracking(tripId, {
    query: { enabled: !!tripId && !!trip?.captainId, refetchInterval: 2000 },
  } as any);

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
    const interval = setInterval(send, 3000);
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
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? 'فشل طلب الرحلة، حاول مجدداً';
        Alert.alert('خطأ', typeof msg === 'string' ? msg : 'فشل طلب الرحلة، حاول مجدداً');
      },
    },
  } as any);

  const cancelMutation = useCancelTrip({
    mutation: {
      onSuccess: () => { setShowCancelSheet(false); setCancelReason(''); refetchTrip(); },
    },
  } as any);

  const rateMutation = useRateTrip({
    mutation: {
      onSuccess: () => {
        setShowRating(false); setRatingTripId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  } as any);

  const handleEstimate = () => {
    if (!pickup || !dropoff) return;
    const dist = distKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const dur  = Math.ceil(dist * 2.5);
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

  const callCaptain = () => { if (captain?.phone) Linking.openURL(`tel:${captain.phone}`); };

  // ─── مؤشرات الخريطة ──────────────────────────────────────────────────────
  const trackingData = tracking as any;
  const captainCoord = trackingData?.captainLat
    ? { lat: Number(trackingData.captainLat), lng: Number(trackingData.captainLng) }
    : null;

  const mapMarkers: any[] = [];

  if (!mapPickMode) {
    // موقع الراكب دائماً
    mapMarkers.push({ id: 'passenger', lat: userLoc.lat, lng: userLoc.lng, color: '#6366F1', label: 'أنت', pulse: !!trip });
    // انطلاق قبل الرحلة
    if (!trip && pickup)  mapMarkers.push({ id: 'pickup',  lat: pickup.lat,  lng: pickup.lng,  color: '#F59E0B', label: '📍 الانطلاق' });
    if (!trip && dropoff) mapMarkers.push({ id: 'dropoff', lat: dropoff.lat, lng: dropoff.lng, color: '#22C55E', label: '🏁 الوجهة' });
    // كابتن أثناء الرحلة — يتحرك مع كل تحديث
    if (trip && captainCoord) {
      mapMarkers.push({ id: 'captain', lat: captainCoord.lat, lng: captainCoord.lng, color: '#F59E0B', label: '🚗', isVehicle: true, pulse: true });
    }
    // وجهة الرحلة عند البدء
    if (trip?.status === 'started' && trip.dropoffLat) {
      mapMarkers.push({ id: 'dropoff', lat: trip.dropoffLat, lng: trip.dropoffLng, color: '#22C55E', label: '🏁 الوجهة' });
    }
  }

  // مركز الخريطة
  const mapCenter = mapPickMode
    ? userLoc
    : trip && captainCoord
      ? { lat: (userLoc.lat + captainCoord.lat) / 2, lng: (userLoc.lng + captainCoord.lng) / 2 }
      : pickup && dropoff
        ? { lat: (pickup.lat + dropoff.lat) / 2, lng: (pickup.lng + dropoff.lng) / 2 }
        : pickup ?? userLoc;

  const mapZoom = mapPickMode ? 15
    : (trip && captainCoord) || (pickup && dropoff) ? 12 : 14;

  const s = styles(colors, insets);

  return (
    <View style={s.root}>

      {/* ─── الخريطة ─── */}
      <View style={s.mapContainer}>
        <RidenMap
          center={mapCenter}
          zoom={mapZoom}
          markers={mapMarkers}
          style={{ flex: 1 }}
          onMapTap={mapPickMode ? handleMapTap : undefined}
        />

        {/* تراكب فوق الخريطة */}
        <View style={[s.mapOverlay, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
          {!mapPickMode && (
            <Text style={s.greeting}>مرحباً، {user?.name?.split(' ')[0] ?? 'راكب'} 👋</Text>
          )}
          {!trip && !mapPickMode && <Text style={s.subGreeting}>إلى أين تريد الذهاب؟</Text>}
          {trip && statusInfo && !mapPickMode && (
            <View style={[s.statusBadge, { backgroundColor: statusInfo.color + '25', borderColor: statusInfo.color }]}>
              <Feather name={statusInfo.icon as any} size={13} color={statusInfo.color} />
              <Text style={[s.statusTxt, { color: statusInfo.color }]}>{statusInfo.text}</Text>
            </View>
          )}
          {mapPickMode && (
            <View style={s.mapPickBanner}>
              <Feather name="crosshair" size={16} color="#fff" />
              <Text style={s.mapPickTxt}>
                {reverseLoading ? 'جاري تحديد الموقع...' : `اضغط على الخريطة لتحديد ${pickingFor === 'pickup' ? 'نقطة الانطلاق' : 'الوجهة'}`}
              </Text>
              <TouchableOpacity onPress={closeSearchModal} style={s.mapPickCancel}>
                <Feather name="x" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ─── اللوح السفلي ─── */}
      <View style={[s.sheet, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 70) }]}>

        {trip ? (
          /* ─── رحلة نشطة ─── */
          <View style={{ gap: 10 }}>
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
                  <Text style={s.captainCar}>{captain.vehicleColor} {captain.vehicleMake} {captain.vehicleModel}</Text>
                  <Text style={s.plateNum}>{captain.vehiclePlate}</Text>
                  {captainCoord && (
                    <View style={s.distRow}>
                      <Feather name="navigation" size={11} color="#6366F1" />
                      <Text style={s.distTxt}>
                        {distKm(userLoc.lat, userLoc.lng, captainCoord.lat, captainCoord.lng).toFixed(1)} كم منك
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={s.callBtn} onPress={callCaptain}>
                  <Feather name="phone" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {status === 'started' && trip.fare && (
              <View style={s.fareNote}>
                <Feather name="dollar-sign" size={14} color={colors.primary} />
                <Text style={s.fareNoteTxt}>الأجرة المتوقعة: {trip.fare?.toFixed(2)} د.أ</Text>
              </View>
            )}

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

            {/* نقطة الانطلاق */}
            <View style={s.pickupRow}>
              <TouchableOpacity style={[s.locationRow, { flex: 1 }]} onPress={() => { setPickingFor('pickup'); setMapPickMode(false); }}>
                <Feather name="map-pin" size={16} color="#F59E0B" />
                <Text style={[s.locationTxt, !pickup && { color: colors.mutedForeground }]} numberOfLines={1}>
                  {pickup?.name ?? 'اختر نقطة الانطلاق'}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity style={s.gpsBtn} onPress={handleUseMyLocation}>
                <Feather name="crosshair" size={18} color="#6366F1" />
              </TouchableOpacity>
            </View>

            {/* الوجهة */}
            <TouchableOpacity style={s.locationRow} onPress={() => { setPickingFor('dropoff'); setMapPickMode(false); }}>
              <Feather name="navigation" size={16} color="#22C55E" />
              <Text style={[s.locationTxt, !dropoff && { color: colors.mutedForeground }]} numberOfLines={1}>
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

      {/* ─── مودال البحث عن الموقع ─── */}
      <Modal visible={!!pickingFor && !mapPickMode} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16, maxHeight: '88%' }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>
              {pickingFor === 'pickup' ? '📍 اختر نقطة الانطلاق' : '🏁 اختر الوجهة'}
            </Text>

            {/* حقل البحث */}
            <View style={s.searchBox}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={s.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="ابحث عن شارع، منطقة، مكان..."
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
              {searchQuery.length > 0 && !searching && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                  <Feather name="x" size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* خيار الضغط على الخريطة */}
            <TouchableOpacity
              style={s.mapPickOption}
              onPress={() => setMapPickMode(true)}
            >
              <Feather name="map" size={16} color="#6366F1" />
              <Text style={s.mapPickOptionTxt}>اختر الموقع على الخريطة</Text>
              <Feather name="chevron-left" size={15} color="#6366F1" />
            </TouchableOpacity>

            {/* موقعي الحالي */}
            <TouchableOpacity style={s.myLocBtn} onPress={handleUseMyLocation}>
              <Feather name="crosshair" size={16} color="#22C55E" />
              <Text style={s.myLocTxt}>موقعي الحالي</Text>
            </TouchableOpacity>

            {/* نتائج البحث */}
            {searchResults.length > 0 ? (
              <>
                <Text style={s.sectionLabel}>نتائج البحث</Text>
                <FlatList
                  data={searchResults}
                  keyExtractor={i => String(i.id)}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={s.areaItem} onPress={() => selectPlace(item)}>
                      <Feather name="map-pin" size={14} color="#F59E0B" />
                      <Text style={s.areaName} numberOfLines={2}>{item.name}</Text>
                      <Feather name="chevron-left" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : searchQuery.length > 1 && !searching ? (
              <View style={s.noResults}>
                <Feather name="search" size={28} color={colors.border} />
                <Text style={s.noResultsTxt}>لا توجد نتائج — جرب كلمة أخرى</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionLabel}>مقترحات سريعة</Text>
                <FlatList
                  data={QUICK}
                  keyExtractor={i => String(i.id)}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity style={s.areaItem} onPress={() => selectPlace(item)}>
                      <Feather name="map-pin" size={14} color="#F59E0B" />
                      <Text style={s.areaName}>{item.name}</Text>
                      <Feather name="chevron-left" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            <TouchableOpacity style={s.cancelBtnFull} onPress={closeSearchModal}>
              <Text style={s.cancelBtnFullTxt}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── مودال إلغاء الرحلة ─── */}
      <Modal visible={showCancelSheet} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>إلغاء الرحلة</Text>
            <TextInput
              style={[s.discountInput, { minHeight: 80, textAlignVertical: 'top', marginBottom: 10 }]}
              value={cancelReason} onChangeText={setCancelReason}
              placeholder="سبب الإلغاء (اختياري)" placeholderTextColor={colors.mutedForeground}
              multiline textAlign="right"
            />
            <TouchableOpacity
              style={s.cancelBtnFull}
              onPress={() => cancelMutation.mutate({ id: tripId } as any)}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.cancelBtnFullTxt}>تأكيد الإلغاء</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCancelSheet(false)} style={s.backLink}>
              <Text style={s.backLinkTxt}>رجوع</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── مودال التقييم ─── */}
      <Modal visible={showRating} animationType="fade" transparent>
        <View style={[s.modalOverlay, { justifyContent: 'center' }]}>
          <View style={[s.modalCard, { padding: 28, marginHorizontal: 24, borderRadius: 24 }]}>
            <Text style={{ fontSize: 40, textAlign: 'center' }}>⭐</Text>
            <Text style={[s.modalTitle, { textAlign: 'center', fontSize: 20 }]}>قيّم تجربتك</Text>
            <Text style={s.ratingSubtitle}>كيف كانت الرحلة مع الكابتن؟</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => { setSelectedRating(star); Haptics.selectionAsync(); }}>
                  <Feather name="star" size={42} color={star <= selectedRating ? '#F59E0B' : colors.border} style={{ marginHorizontal: 4 }} />
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
  root:         { flex: 1, backgroundColor: c.background },

  // ─── الخريطة ───
  mapContainer: { height: '46%', position: 'relative' },
  mapOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  greeting:     { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  subGreeting:  { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-end',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  statusTxt:    { fontSize: 13, fontWeight: '600' },

  // ─── بانر اختيار على الخريطة ───
  mapPickBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(15,27,45,0.92)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#6366F1',
  },
  mapPickTxt:    { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'right' },
  mapPickCancel: { padding: 4 },

  // ─── اللوح السفلي ───
  sheet:       { flex: 1, backgroundColor: c.card, padding: 16, borderTopWidth: 1, borderTopColor: c.border },
  routeCard:   { backgroundColor: c.background, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border, gap: 8 },
  routeRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  routeTxt:    { flex: 1, fontSize: 13, color: c.foreground, textAlign: 'right' },
  routeLine:   { height: 1, backgroundColor: c.border, marginLeft: 14 },

  captainCard: { backgroundColor: c.background, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  captainLeft: { alignItems: 'center', gap: 4 },
  captainAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F59E0B20', borderWidth: 2, borderColor: '#F59E0B',
    alignItems: 'center', justifyContent: 'center' },
  captainAvatarText: { fontSize: 20, fontWeight: '800', color: '#F59E0B' },
  ratingRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingVal:   { fontSize: 12, fontWeight: '700', color: '#F59E0B' },
  captainInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  captainName: { fontSize: 15, fontWeight: '700', color: c.foreground },
  captainCar:  { fontSize: 12, color: c.mutedForeground },
  plateNum:    { fontSize: 13, fontWeight: '700', color: c.primary },
  distRow:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 },
  distTxt:     { fontSize: 11, color: '#6366F1', fontWeight: '600' },
  callBtn:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', elevation: 4 },

  fareNote:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: c.border },
  fareNoteTxt: { color: c.foreground, fontSize: 13, fontWeight: '600' },
  cancelBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.destructive + '15', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: c.destructive },
  cancelBtnTxt:{ color: c.destructive, fontSize: 14, fontWeight: '600' },

  bookTitle:   { fontSize: 17, fontWeight: '800', color: c.foreground, textAlign: 'right' },
  pickupRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  gpsBtn:      { width: 46, height: 46, borderRadius: 12, backgroundColor: '#6366F115', borderWidth: 1.5, borderColor: '#6366F1',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  locationRow: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: c.background, borderRadius: 12, padding: 12,
    gap: 10, borderWidth: 1, borderColor: c.border },
  locationTxt: { flex: 1, fontSize: 14, color: c.foreground, textAlign: 'right' },
  discountInput: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, color: c.foreground, fontSize: 14, textAlign: 'right' },

  fareCard:    { backgroundColor: c.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border, gap: 6 },
  fareRow:     { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  fareTotalRow:{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, marginTop: 4 },
  fareLabel:   { fontSize: 13, color: c.mutedForeground },
  fareVal:     { fontSize: 13, fontWeight: '600', color: c.foreground },
  actionRow:   { flexDirection: 'row-reverse', gap: 10 },
  estimateBtn: { flex: 1, backgroundColor: c.background, borderWidth: 1.5, borderColor: c.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  estimateTxt: { color: c.primary, fontSize: 14, fontWeight: '600' },
  requestBtn:  { flex: 2, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', elevation: 4 },
  requestTxt:  { color: c.primaryForeground, fontSize: 15, fontWeight: '800' },

  // ─── مودال البحث ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  modalHandle:  { width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: c.foreground, textAlign: 'right', marginBottom: 12 },

  searchBox:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: c.background,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border, marginBottom: 10 },
  searchInput:  { flex: 1, fontSize: 14, color: c.foreground },

  mapPickOption:{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#6366F110',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#6366F140', marginBottom: 8 },
  mapPickOptionTxt: { flex: 1, fontSize: 14, color: '#6366F1', fontWeight: '600', textAlign: 'right' },

  myLocBtn:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#22C55E10',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#22C55E40', marginBottom: 12 },
  myLocTxt:     { flex: 1, fontSize: 14, color: '#22C55E', fontWeight: '600', textAlign: 'right' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: c.mutedForeground, textAlign: 'right',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  areaItem:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.border },
  areaName:     { flex: 1, fontSize: 14, fontWeight: '500', color: c.foreground, textAlign: 'right' },

  noResults:    { alignItems: 'center', gap: 8, paddingVertical: 24 },
  noResultsTxt: { fontSize: 13, color: c.mutedForeground },

  cancelBtnFull:    { backgroundColor: c.destructive, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
  cancelBtnFullTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backLink:     { alignItems: 'center', paddingVertical: 8 },
  backLinkTxt:  { color: c.mutedForeground, fontSize: 14 },
  ratingSubtitle: { color: c.mutedForeground, textAlign: 'center', fontSize: 14, marginBottom: 16 },
  starsRow:     { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
} as any);
