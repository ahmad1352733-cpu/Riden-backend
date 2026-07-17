import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetPassengerTrips, useRateTrip } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'قيد الانتظار', color: '#F59E0B' },
  accepted:  { label: 'تم القبول',    color: '#3B82F6' },
  started:   { label: 'جارية',         color: '#22C55E' },
  completed: { label: 'مكتملة',        color: '#22C55E' },
  cancelled: { label: 'ملغاة',         color: '#EF4444' },
};

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [ratingFor, setRatingFor] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);

  const { data: trips, isLoading, refetch, isFetching } = useGetPassengerTrips({} as any);

  const rateMutation = useRateTrip({
    mutation: {
      onSuccess: () => {
        setRatingFor(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
      },
    },
  } as any);

  const tripList = (trips as any[]) ?? [];
  const s = styles(colors, insets);

  if (isLoading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.title}>رحلاتي</Text>
      </View>

      <FlatList
        data={tripList}
        keyExtractor={item => String((item as any).id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 80, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="navigation" size={48} color={colors.border} />
            <Text style={s.emptyTxt}>لا توجد رحلات سابقة</Text>
            <Text style={s.emptySubTxt}>رحلاتك ستظهر هنا</Text>
          </View>
        }
        renderItem={({ item }) => {
          const t = item as any;
          const status = STATUS_MAP[t.status] ?? { label: t.status, color: colors.mutedForeground };
          const canRate = t.status === 'completed' && !t.rating;
          return (
            <View style={s.card}>
              {/* Status + fare */}
              <View style={s.cardHeader}>
                <View style={[s.statusBadge, { backgroundColor: status.color + '22', borderColor: status.color }]}>
                  <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
                </View>
                {t.finalFare && (
                  <Text style={s.fare}>{t.finalFare.toFixed(2)} د.أ</Text>
                )}
              </View>

              {/* Addresses */}
              <View style={s.addrRow}>
                <Feather name="map-pin" size={12} color="#F5A623" />
                <Text style={s.addr} numberOfLines={1}>{t.pickupAddress}</Text>
              </View>
              <View style={s.addrRow}>
                <Feather name="navigation" size={12} color="#22C55E" />
                <Text style={s.addr} numberOfLines={1}>{t.dropoffAddress}</Text>
              </View>

              {/* Captain if any */}
              {t.captain && (
                <View style={s.captainRow}>
                  <Text style={s.captainTxt}>الكابتن: {t.captain.name}</Text>
                  {t.captain.vehiclePlate && <Text style={s.plateTxt}>{t.captain.vehiclePlate}</Text>}
                </View>
              )}

              {/* Rating */}
              {t.rating && (
                <View style={s.ratingRow}>
                  {[1,2,3,4,5].map(i => (
                    <Feather key={i} name="star" size={14} color={i <= t.rating ? '#F5A623' : '#2A3F5A'} />
                  ))}
                </View>
              )}

              {/* Rate button */}
              {canRate && (
                <TouchableOpacity style={s.rateBtn} onPress={() => { setRatingFor(t.id); setSelectedRating(5); }}>
                  <Feather name="star" size={14} color="#F5A623" />
                  <Text style={s.rateBtnTxt}>قيّم الرحلة</Text>
                </TouchableOpacity>
              )}

              {/* Date */}
              <Text style={s.date}>{new Date(t.createdAt).toLocaleDateString('ar-JO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          );
        }}
      />

      {/* Rating modal */}
      {ratingFor && (
        <View style={s.ratingOverlay}>
          <View style={s.ratingCard}>
            <Text style={s.ratingTitle}>قيّم الرحلة</Text>
            <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 20 }}>
              كيف كانت تجربتك؟
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => { setSelectedRating(star); Haptics.selectionAsync(); }}>
                  <Feather name="star" size={38} color={star <= selectedRating ? '#F5A623' : '#2A3F5A'} style={{ marginHorizontal: 6 }} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.submitRateBtn} onPress={() => rateMutation.mutate({ id: ratingFor, data: { rating: selectedRating } } as any)}>
              {rateMutation.isPending ? <ActivityIndicator color="#0F1B2D" /> : <Text style={s.submitRateTxt}>إرسال التقييم</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRatingFor(null)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', color: c.foreground, textAlign: 'right' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTxt: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  emptySubTxt: { fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  fare: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#F5A623' },
  addrRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  addr: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right' },
  captainRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border },
  captainTxt: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.foreground },
  plateTxt: { fontSize: 13, fontFamily: 'Inter_700Bold', color: c.primary },
  ratingRow: { flexDirection: 'row-reverse', gap: 2, marginTop: 8 },
  rateBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#1A2D44', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-end', borderWidth: 1, borderColor: '#F5A623' },
  rateBtnTxt: { color: '#F5A623', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  date: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right', marginTop: 8 },
  ratingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  ratingCard: { backgroundColor: c.card, borderRadius: 20, padding: 28, marginHorizontal: 24, width: '90%' },
  ratingTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', color: c.foreground, textAlign: 'center', marginBottom: 8 },
  submitRateBtn: { backgroundColor: '#F5A623', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitRateTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#0F1B2D' },
});
