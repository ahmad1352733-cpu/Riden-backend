import React from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetCaptainTrips } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'قيد الانتظار', color: '#F59E0B' },
  accepted:  { label: 'تم القبول',   color: '#3B82F6' },
  started:   { label: 'جارية',        color: '#22C55E' },
  completed: { label: 'مكتملة',       color: '#22C55E' },
  cancelled: { label: 'ملغاة',        color: '#EF4444' },
};

export default function CaptainTripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { data: trips, isLoading, refetch, isFetching } = useGetCaptainTrips({
    query: { enabled: !!token },
  } as any);

  const tripList = (trips as any[]) ?? [];
  const s = styles(colors, insets);

  if (isLoading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.title}>سجل رحلاتي</Text>
        <Text style={s.sub}>{tripList.length} رحلة</Text>
      </View>

      <FlatList
        data={tripList}
        keyExtractor={item => String((item as any).id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, paddingTop: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="navigation" size={48} color={colors.border} />
            <Text style={s.emptyTxt}>لا توجد رحلات بعد</Text>
            <Text style={s.emptySubTxt}>رحلاتك المكتملة ستظهر هنا</Text>
          </View>
        }
        renderItem={({ item }) => {
          const t = item as any;
          const status = STATUS_MAP[t.status] ?? { label: t.status, color: colors.mutedForeground };
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: status.color + '22', borderColor: status.color }]}>
                  <Text style={[s.badgeTxt, { color: status.color }]}>{status.label}</Text>
                </View>
                <Text style={s.tripId}>#{t.id}</Text>
              </View>

              {/* المسار */}
              <View style={s.routeBlock}>
                <View style={s.routeRow}>
                  <View style={[s.dot, { backgroundColor: '#F5A623' }]} />
                  <Text style={s.routeTxt} numberOfLines={1}>{t.pickupAddress ?? 'موقع الانطلاق'}</Text>
                </View>
                <View style={[s.routeLine, { backgroundColor: colors.border }]} />
                <View style={s.routeRow}>
                  <View style={[s.dot, { backgroundColor: '#22C55E' }]} />
                  <Text style={s.routeTxt} numberOfLines={1}>{t.dropoffAddress ?? 'موقع الوصول'}</Text>
                </View>
              </View>

              {/* التفاصيل */}
              <View style={s.details}>
                {t.finalFare != null && (
                  <View style={s.detailItem}>
                    <Feather name="dollar-sign" size={14} color={colors.primary} />
                    <Text style={s.detailTxt}>{t.finalFare.toFixed(2)} د.أ</Text>
                  </View>
                )}
                {t.distanceKm != null && (
                  <View style={s.detailItem}>
                    <Feather name="map" size={14} color={colors.mutedForeground} />
                    <Text style={s.detailTxt}>{t.distanceKm.toFixed(1)} كم</Text>
                  </View>
                )}
                {t.durationMin != null && (
                  <View style={s.detailItem}>
                    <Feather name="clock" size={14} color={colors.mutedForeground} />
                    <Text style={s.detailTxt}>{t.durationMin} دقيقة</Text>
                  </View>
                )}
              </View>

              {/* الراكب */}
              {t.passenger && (
                <View style={s.passengerRow}>
                  <Feather name="user" size={13} color={colors.mutedForeground} />
                  <Text style={s.passengerTxt}>{t.passenger.name}</Text>
                </View>
              )}

              <Text style={s.date}>
                {new Date(t.createdAt).toLocaleDateString('ar-JO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root:       { flex: 1, backgroundColor: c.background },
  center:     { alignItems: 'center', justifyContent: 'center' },
  header:     { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
  title:      { fontSize: 22, fontWeight: '800', color: c.foreground, textAlign: 'right' },
  sub:        { fontSize: 13, color: c.mutedForeground, textAlign: 'right', marginTop: 2 },
  empty:      { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTxt:   { fontSize: 18, fontWeight: '600', color: c.foreground },
  emptySubTxt:{ fontSize: 14, color: c.mutedForeground },
  card:       { backgroundColor: c.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border, gap: 10 },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  badge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeTxt:   { fontSize: 12, fontWeight: '600' },
  tripId:     { fontSize: 13, color: c.mutedForeground },
  routeBlock: { gap: 4 },
  routeRow:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dot:        { width: 10, height: 10, borderRadius: 5 },
  routeLine:  { height: 1, marginRight: 9 },
  routeTxt:   { flex: 1, fontSize: 13, color: c.foreground, textAlign: 'right' },
  details:    { flexDirection: 'row-reverse', gap: 16, flexWrap: 'wrap' },
  detailItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  detailTxt:  { fontSize: 13, color: c.foreground, fontWeight: '500' },
  passengerRow:{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border },
  passengerTxt:{ fontSize: 13, color: c.foreground },
  date:       { fontSize: 11, color: c.mutedForeground, textAlign: 'right' },
});
