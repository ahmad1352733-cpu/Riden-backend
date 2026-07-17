import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Platform, I18nManager, Linking,
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

function statusColor(status: string, colors: any): string {
  if (status === 'completed') return colors.success as string;
  if (status === 'cancelled') return colors.destructive;
  if (status === 'started')   return colors.primary;
  if (status === 'accepted')  return colors.warning as string;
  return colors.mutedForeground;
}

export default function TripsScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { token } = useAuth();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded, setExpanded]         = useState<number | null>(null);

  const { data: trips, isLoading, refetch } = useGetAdminTrips({
    query: { enabled: !!token, queryKey: ['getAdminTrips', statusFilter] },
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 200,
  } as any);

  const s = styles(colors);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <View style={s.headerTop}>
          <Text style={s.title}>الرحلات</Text>
          <Text style={s.count}>{(trips ?? []).length} رحلة</Text>
        </View>
        <View style={s.filterRow}>
          {(['all', 'pending', 'accepted', 'started', 'completed', 'cancelled'] as StatusFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.fBtn, statusFilter === f && { backgroundColor: statusColor(f === 'all' ? 'all' : f, colors), borderColor: statusColor(f === 'all' ? 'all' : f, colors) }]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[s.fTxt, statusFilter === f && { color: f === 'all' ? colors.primaryForeground : '#fff' }]}>
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
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
        renderItem={({ item: trip }: { item: any }) => {
          const sColor     = statusColor(trip.status, colors);
          const isExpanded = expanded === trip.id;

          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => setExpanded(isExpanded ? null : trip.id)}
              activeOpacity={0.85}
            >
              {/* الصف الرئيسي */}
              <View style={s.cardTop}>
                <Text style={s.tripId}># {trip.id}</Text>
                <View style={[s.statusBadge, { backgroundColor: sColor + '20' }]}>
                  <Text style={[s.statusTxt, { color: sColor }]}>{STATUS_AR[trip.status] ?? trip.status}</Text>
                </View>
                {trip.finalFare != null && (
                  <Text style={s.fare}>{trip.finalFare.toFixed(2)} د.أ</Text>
                )}
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
              </View>

              {/* المسار */}
              <View style={s.route}>
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: colors.primary }]} />
                  <Text style={s.routeAddr} numberOfLines={1}>{trip.pickupAddress}</Text>
                </View>
                <View style={s.routeLine} />
                <View style={s.routeRow}>
                  <View style={[s.routeDot, { backgroundColor: colors.destructive }]} />
                  <Text style={s.routeAddr} numberOfLines={1}>{trip.dropoffAddress}</Text>
                </View>
              </View>

              {/* الراكب والكابتن (سريع) */}
              <View style={s.quickMeta}>
                {trip.passenger && (
                  <View style={s.metaChip}>
                    <Feather name="user" size={11} color={colors.mutedForeground} />
                    <Text style={s.metaChipTxt}>{trip.passenger.name}</Text>
                  </View>
                )}
                {trip.captain && (
                  <View style={s.metaChip}>
                    <Feather name="truck" size={11} color={colors.mutedForeground} />
                    <Text style={s.metaChipTxt}>{trip.captain.name}</Text>
                  </View>
                )}
                <Text style={s.dateSmall}>
                  {new Date(trip.createdAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'short' })}
                </Text>
              </View>

              {/* التفاصيل الكاملة */}
              {isExpanded && (
                <View style={s.expanded}>
                  {/* بطاقة الراكب */}
                  {trip.passenger && (
                    <PersonCard
                      icon="user" label="الراكب"
                      name={trip.passenger.name}
                      phone={trip.passenger.phone}
                      email={trip.passenger.email}
                      colors={colors}
                    />
                  )}

                  {/* بطاقة الكابتن */}
                  {trip.captain && (
                    <PersonCard
                      icon="truck" label="الكابتن"
                      name={trip.captain.name}
                      phone={trip.captain.phone}
                      email={trip.captain.email}
                      extra={trip.captain.vehiclePlate ? `${trip.captain.vehicleMake ?? ''} ${trip.captain.vehicleModel ?? ''} · ${trip.captain.vehiclePlate}` : undefined}
                      colors={colors}
                    />
                  )}

                  {/* تفاصيل الرحلة */}
                  <View style={s.detailCard}>
                    <Text style={s.detailCardTitle}>تفاصيل الرحلة</Text>
                    <View style={s.detailGrid}>
                      {trip.distanceKm != null && <DetailRow label="المسافة" value={`${trip.distanceKm.toFixed(1)} كم`} colors={colors} />}
                      {trip.durationMin != null && <DetailRow label="المدة" value={`${Math.round(trip.durationMin)} دقيقة`} colors={colors} />}
                      {trip.fare != null && <DetailRow label="الأجرة الأولية" value={`${trip.fare.toFixed(2)} د.أ`} colors={colors} />}
                      {trip.discountPercent != null && trip.discountPercent > 0 && (
                        <DetailRow label="الخصم" value={`${trip.discountPercent}%`} colors={colors} highlight />
                      )}
                      {trip.finalFare != null && <DetailRow label="الأجرة النهائية" value={`${trip.finalFare.toFixed(2)} د.أ`} colors={colors} bold />}
                      {trip.rating != null && <DetailRow label="التقييم" value={`${trip.rating} / 5 ★`} colors={colors} />}
                      {trip.discountCodeUsed && <DetailRow label="كود الخصم" value={trip.discountCodeUsed} colors={colors} />}
                    </View>
                    {trip.cancellationReason && (
                      <View style={s.cancelNote}>
                        <Feather name="alert-circle" size={13} color={colors.destructive} />
                        <Text style={s.cancelNoteTxt}>سبب الإلغاء: {trip.cancellationReason}</Text>
                      </View>
                    )}
                    <Text style={s.fullDate}>
                      {new Date(trip.createdAt).toLocaleString('ar-JO', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="map" size={44} color={colors.mutedForeground} />
              <Text style={s.emptyTxt}>لا توجد رحلات</Text>
            </View>
          )
        )}
      />
    </View>
  );
}

function PersonCard({ icon, label, name, phone, email, extra, colors }: any) {
  return (
    <View style={{
      backgroundColor: colors.secondary, borderRadius: 14, padding: 12,
      borderWidth: 1, borderColor: colors.border, gap: 4,
    }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Feather name={icon} size={13} color={colors.primary} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: 'right' }}>{name}</Text>
      {phone && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${phone}`)} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Feather name="phone" size={12} color={colors.success} />
          <Text style={{ fontSize: 13, color: colors.success, fontWeight: '600' }}>{phone}</Text>
        </TouchableOpacity>
      )}
      {email && <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'right' }}>{email}</Text>}
      {extra && <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'right' }}>{extra}</Text>}
    </View>
  );
}

function DetailRow({ label, value, colors, bold, highlight }: any) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ fontSize: 14, fontWeight: bold ? '800' : '500', color: highlight ? '#22C55E' : bold ? colors.primary : colors.foreground }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  count: { fontSize: 14, color: colors.mutedForeground, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginBottom: 4 },
  fBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
  },
  fTxt: { fontSize: 11, color: colors.mutedForeground, fontWeight: '600' },
  card: {
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 10, gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripId: { fontSize: 14, fontWeight: '700', color: colors.mutedForeground },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt: { fontSize: 12, fontWeight: '700' },
  fare: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.primary, textAlign: 'left' },
  route: { gap: 4, paddingHorizontal: 4 },
  routeRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { height: 1, backgroundColor: colors.border, marginRight: 4 },
  routeAddr: { flex: 1, fontSize: 13, color: colors.foreground, textAlign: 'right' },
  quickMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  metaChipTxt: { fontSize: 11, color: colors.mutedForeground },
  dateSmall: { fontSize: 11, color: colors.mutedForeground, marginLeft: 'auto' as any },
  expanded: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 10 },
  detailCard: {
    backgroundColor: colors.secondary, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  detailCardTitle: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground, textAlign: 'right', marginBottom: 4 },
  detailGrid: { gap: 2 },
  cancelNote: {
    flexDirection: 'row-reverse', gap: 6, alignItems: 'flex-start',
    backgroundColor: colors.destructive + '15', borderRadius: 8, padding: 8, marginTop: 4,
  },
  cancelNoteTxt: { flex: 1, color: colors.destructive, fontSize: 12, textAlign: 'right' },
  fullDate: { fontSize: 11, color: colors.mutedForeground, textAlign: 'right', marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTxt: { fontSize: 15, color: colors.mutedForeground },
} as any);
