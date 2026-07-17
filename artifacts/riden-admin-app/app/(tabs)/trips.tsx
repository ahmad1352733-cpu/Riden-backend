import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Platform, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminTrips } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

type StatusFilter = 'all' | 'pending' | 'accepted' | 'started' | 'completed' | 'cancelled';

const STATUS_AR: Record<string, string> = {
  all: 'الكل', pending: 'انتظار', accepted: 'مقبولة',
  started: 'جارية', completed: 'مكتملة', cancelled: 'ملغاة',
};

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data: trips, isLoading, refetch } = useGetAdminTrips({
    query: {
      enabled: !!token,
      queryKey: ['getAdminTrips', statusFilter],
    },
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 100,
  } as any);

  const s = styles(colors);

  const statusColor = (status: string) => {
    if (status === 'completed') return colors.success as string;
    if (status === 'cancelled') return colors.destructive;
    if (status === 'started') return colors.primary;
    if (status === 'accepted') return colors.warning as string;
    return colors.mutedForeground;
  };

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.headerTitle}>الرحلات</Text>
        <View style={s.filterScroll}>
          {(['all', 'pending', 'accepted', 'started', 'completed', 'cancelled'] as StatusFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, statusFilter === f && s.filterBtnActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[s.filterText, statusFilter === f && s.filterTextActive]}>
                {STATUS_AR[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={trips ?? []}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
        renderItem={({ item: trip }: { item: any }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <Text style={s.tripId}>رحلة #{trip.id}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColor(trip.status) + '25' }]}>
                <Text style={[s.statusText, { color: statusColor(trip.status) }]}>
                  {STATUS_AR[trip.status] ?? trip.status}
                </Text>
              </View>
            </View>

            <View style={s.routeRow}>
              <Feather name="circle" size={10} color={colors.primary} />
              <Text style={s.routeAddr} numberOfLines={1}>{trip.pickupAddress}</Text>
            </View>
            <View style={s.routeRow}>
              <Feather name="map-pin" size={12} color={colors.destructive} />
              <Text style={s.routeAddr} numberOfLines={1}>{trip.dropoffAddress}</Text>
            </View>

            <View style={s.meta}>
              {trip.passenger && (
                <Text style={s.metaText}>🧑 {trip.passenger.name}</Text>
              )}
              {trip.captain && (
                <Text style={s.metaText}>🚗 {trip.captain.name}</Text>
              )}
              {trip.finalFare != null && (
                <Text style={s.fare}>{trip.finalFare.toFixed(2)} د.أ</Text>
              )}
            </View>

            <Text style={s.date}>
              {new Date(trip.createdAt).toLocaleDateString('ar-JO', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="map" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>لا توجد رحلات</Text>
            </View>
          )
        )}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 6 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 10 },
  filterScroll: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 4 },
  filterBtn: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 16, backgroundColor: colors.secondary,
    borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
  filterTextActive: { color: colors.primaryForeground },
  card: {
    marginHorizontal: 16, marginVertical: 5,
    backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripId: { fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeAddr: { flex: 1, fontSize: 13, color: colors.foreground, textAlign: 'right' },
  meta: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' },
  metaText: { fontSize: 12, color: colors.mutedForeground },
  fare: { fontSize: 14, fontWeight: '700', color: colors.primary },
  date: { fontSize: 11, color: colors.mutedForeground, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.mutedForeground },
} as any);
