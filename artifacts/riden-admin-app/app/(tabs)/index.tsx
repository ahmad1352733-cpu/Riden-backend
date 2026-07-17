import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, Platform, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminDashboard } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

const STATUS_AR: Record<string, string> = {
  pending: 'انتظار',
  accepted: 'مقبولة',
  started: 'جارية',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { data, isLoading, refetch } = useGetAdminDashboard({
    query: { enabled: !!token, refetchInterval: 30000 },
  });

  const s = styles(colors);

  const StatCard = ({
    label, value, icon, color,
  }: { label: string; value: string | number; icon: string; color?: string }) => (
    <View style={[s.statCard, { borderLeftColor: color ?? colors.primary, borderLeftWidth: 3 }]}>
      <View style={s.statTop}>
        <Feather name={icon as any} size={18} color={color ?? colors.primary} />
        <Text style={[s.statValue, { color: color ?? colors.foreground }]}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.headerTitle}>لوحة الإدارة</Text>
        <Text style={s.headerSub}>مرحبًا بك في مركز تحكم RIDEN</Text>
      </View>

      {/* Revenue Banner */}
      <View style={s.revenueBanner}>
        <View style={s.revenueLeft}>
          <Text style={s.revenueLabelBig}>إجمالي الإيرادات</Text>
          <Text style={s.revenueValueBig}>{(data?.totalRevenue ?? 0).toFixed(2)} د.أ</Text>
        </View>
        <View style={s.revenueDivider} />
        <View style={s.revenueRight}>
          <Text style={s.revenueLabel}>إيرادات اليوم</Text>
          <Text style={s.revenueValue}>{(data?.todayRevenue ?? 0).toFixed(2)} د.أ</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={s.statsGrid}>
        <StatCard label="إجمالي الركاب" value={data?.totalPassengers ?? 0} icon="users" />
        <StatCard label="إجمالي الكباتن" value={data?.totalCaptains ?? 0} icon="navigation" />
        <StatCard label="كباتن بانتظار الموافقة" value={data?.pendingCaptains ?? 0} icon="clock" color={colors.warning} />
        <StatCard label="رحلات نشطة الآن" value={data?.activeTrips ?? 0} icon="activity" color={colors.success} />
        <StatCard label="إجمالي الرحلات" value={data?.totalTrips ?? 0} icon="map" />
        <StatCard label="رحلات مكتملة" value={data?.completedTrips ?? 0} icon="check-circle" color={colors.success} />
        <StatCard label="رحلات ملغاة" value={data?.cancelledTrips ?? 0} icon="x-circle" color={colors.destructive} />
        <StatCard label="رحلات اليوم" value={data?.todayTrips ?? 0} icon="sun" color={colors.primary} />
        <StatCard label="شكاوى مفتوحة" value={data?.openComplaints ?? 0} icon="alert-circle" color={colors.destructive} />
      </View>

      {/* Recent Trips */}
      {(data?.recentTrips?.length ?? 0) > 0 && (
        <>
          <Text style={s.sectionTitle}>آخر الرحلات</Text>
          {data?.recentTrips?.map((trip: any) => (
            <View key={trip.id} style={s.tripRow}>
              <View style={s.tripLeft}>
                <Text style={s.tripId}>#{trip.id}</Text>
                <View style={[s.statusBadge, {
                  backgroundColor: trip.status === 'completed' ? colors.success + '25'
                    : trip.status === 'cancelled' ? colors.destructive + '25'
                    : trip.status === 'started' ? colors.primary + '25'
                    : colors.warning + '25',
                }]}>
                  <Text style={[s.statusText, {
                    color: trip.status === 'completed' ? colors.success
                      : trip.status === 'cancelled' ? colors.destructive
                      : trip.status === 'started' ? colors.primary
                      : colors.warning,
                  }]}>{STATUS_AR[trip.status] ?? trip.status}</Text>
                </View>
              </View>
              <View style={s.tripRight}>
                <Text style={s.tripAddr} numberOfLines={1}>{trip.pickupAddress}</Text>
                <Text style={s.tripAddr2} numberOfLines={1}>{trip.dropoffAddress}</Text>
              </View>
              {trip.finalFare != null && (
                <Text style={s.tripFare}>{trip.finalFare.toFixed(2)} د.أ</Text>
              )}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, textAlign: 'right' },
  headerSub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'right', marginTop: 2 },
  revenueBanner: {
    margin: 16, borderRadius: 20, padding: 20,
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center',
  },
  revenueLeft: { flex: 1, alignItems: 'flex-end' },
  revenueLabelBig: { fontSize: 12, color: colors.primaryForeground + 'BB' },
  revenueValueBig: { fontSize: 34, fontWeight: '800', color: colors.primaryForeground },
  revenueDivider: { width: 1, backgroundColor: colors.primaryForeground + '40', height: 50, marginHorizontal: 16 },
  revenueRight: { alignItems: 'flex-start' },
  revenueLabel: { fontSize: 11, color: colors.primaryForeground + 'BB' },
  revenueValue: { fontSize: 22, fontWeight: '700', color: colors.primaryForeground },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, marginBottom: 12,
  },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: colors.card,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.mutedForeground, textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, paddingHorizontal: 16, marginBottom: 8, textAlign: 'right' },
  tripRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tripLeft: { alignItems: 'center', gap: 4, minWidth: 60 },
  tripId: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  tripRight: { flex: 1, alignItems: 'flex-end' },
  tripAddr: { fontSize: 13, color: colors.foreground, fontWeight: '500' },
  tripAddr2: { fontSize: 11, color: colors.mutedForeground },
  tripFare: { fontSize: 13, fontWeight: '700', color: colors.primary },
  success: { color: colors.success ?? '#22C55E' },
  warning: { color: colors.warning ?? '#F59E0B' },
} as any);
