import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, Platform, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminDashboard } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

const STATUS_AR: Record<string, string> = {
  pending: 'انتظار', accepted: 'مقبولة', started: 'جارية',
  completed: 'مكتملة', cancelled: 'ملغاة',
};

function statusColor(status: string, colors: any) {
  if (status === 'completed') return colors.success as string;
  if (status === 'cancelled') return colors.destructive as string;
  if (status === 'started')   return colors.primary;
  if (status === 'accepted')  return colors.warning as string;
  return colors.mutedForeground;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();

  const { data, isLoading, refetch, isFetching } = useGetAdminDashboard({
    query: { enabled: !!token, refetchInterval: 30000 },
  });

  const s = styles(colors);

  return (
    <ScrollView
      style={[s.root]}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
      refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* ─── الهيدر ─── */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <View>
          <Text style={s.welcomeTxt}>مرحباً، {user?.name?.split(' ')[0] ?? 'مسؤول'} 👋</Text>
          <Text style={s.dateTxt}>
            {new Date().toLocaleDateString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <View style={s.headerBadge}>
          <Feather name="shield" size={14} color={colors.primary} />
          <Text style={s.headerBadgeTxt}>مسؤول</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={s.loadingTxt}>جارٍ تحميل البيانات...</Text>
        </View>
      ) : (
        <>
          {/* ─── بانر الإيرادات ─── */}
          <View style={s.revBanner}>
            <View style={s.revLeft}>
              <Text style={s.revLblBig}>إجمالي الإيرادات</Text>
              <Text style={s.revValBig}>{(data?.totalRevenue ?? 0).toFixed(2)}</Text>
              <Text style={s.revCurrency}>دينار أردني</Text>
            </View>
            <View style={s.revDivider} />
            <View style={s.revRight}>
              <View style={s.revTodayBlock}>
                <Text style={s.revTodayLbl}>اليوم</Text>
                <Text style={s.revTodayVal}>{(data?.todayRevenue ?? 0).toFixed(2)} د.أ</Text>
              </View>
              <View style={[s.revTodayBlock, { marginTop: 12 }]}>
                <Text style={s.revTodayLbl}>رحلات اليوم</Text>
                <Text style={s.revTodayVal}>{data?.todayTrips ?? 0} رحلة</Text>
              </View>
            </View>
          </View>

          {/* ─── شبكة الإحصائيات ─── */}
          <View style={s.grid}>
            {[
              { label: 'الركاب',          value: data?.totalPassengers ?? 0, icon: 'users',       color: colors.primary },
              { label: 'الكباتن',         value: data?.totalCaptains ?? 0,   icon: 'truck',       color: '#8B5CF6' },
              { label: 'بانتظار الموافقة', value: data?.pendingCaptains ?? 0, icon: 'clock',       color: colors.warning as string },
              { label: 'رحلات نشطة الآن', value: data?.activeTrips ?? 0,     icon: 'activity',    color: colors.success as string },
              { label: 'إجمالي الرحلات',  value: data?.totalTrips ?? 0,      icon: 'map',         color: colors.foreground },
              { label: 'مكتملة',          value: data?.completedTrips ?? 0,  icon: 'check-circle', color: colors.success as string },
              { label: 'ملغاة',           value: data?.cancelledTrips ?? 0,  icon: 'x-circle',    color: colors.destructive },
              { label: 'شكاوى مفتوحة',   value: data?.openComplaints ?? 0,  icon: 'alert-circle', color: colors.destructive },
            ].map(({ label, value, icon, color }) => (
              <View key={label} style={s.statCard}>
                <View style={[s.statIconWrap, { backgroundColor: color + '18' }]}>
                  <Feather name={icon as any} size={18} color={color} />
                </View>
                <Text style={[s.statValue, { color }]}>{value}</Text>
                <Text style={s.statLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* ─── تنبيه انتظار الكباتن ─── */}
          {(data?.pendingCaptains ?? 0) > 0 && (
            <View style={s.alertCard}>
              <Feather name="bell" size={16} color={colors.warning as string} />
              <Text style={s.alertTxt}>
                {data?.pendingCaptains} كابتن بانتظار الموافقة — راجع تبويب الكباتن
              </Text>
            </View>
          )}

          {/* ─── آخر الرحلات ─── */}
          {(data?.recentTrips?.length ?? 0) > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>آخر الرحلات</Text>
              {(data?.recentTrips ?? []).map((trip: any) => (
                <View key={trip.id} style={s.tripRow}>
                  <View style={s.tripMeta}>
                    <Text style={s.tripId}>#{trip.id}</Text>
                    <View style={[s.statusBadge, { backgroundColor: statusColor(trip.status, colors) + '25' }]}>
                      <Text style={[s.statusTxt, { color: statusColor(trip.status, colors) }]}>
                        {STATUS_AR[trip.status] ?? trip.status}
                      </Text>
                    </View>
                  </View>
                  <View style={s.tripRoute}>
                    <Text style={s.tripAddr} numberOfLines={1}>{trip.pickupAddress}</Text>
                    <View style={s.tripArrow}>
                      <Feather name="arrow-left" size={10} color={colors.mutedForeground} />
                    </View>
                    <Text style={[s.tripAddr, s.tripAddrTo]} numberOfLines={1}>{trip.dropoffAddress}</Text>
                  </View>
                  {trip.finalFare != null && (
                    <Text style={s.tripFare}>{trip.finalFare.toFixed(2)} د.أ</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  welcomeTxt: { fontSize: 20, fontWeight: '800', color: colors.foreground },
  dateTxt: { fontSize: 12, color: colors.mutedForeground, marginTop: 3 },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary + '20', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  headerBadgeTxt: { fontSize: 12, fontWeight: '700', color: colors.primary },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  loadingTxt: { color: colors.mutedForeground, fontSize: 14 },
  // ─── بانر الإيرادات ───
  revBanner: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 22, padding: 22,
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12,
    elevation: 8,
  },
  revLeft: { flex: 1, alignItems: 'flex-end' },
  revLblBig: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 },
  revValBig: { fontSize: 38, fontWeight: '900', color: '#fff' },
  revCurrency: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  revDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', height: 60, marginHorizontal: 20 },
  revRight: { alignItems: 'flex-start' },
  revTodayBlock: {},
  revTodayLbl: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  revTodayVal: { fontSize: 18, fontWeight: '700', color: '#fff' },
  // ─── شبكة الإحصائيات ───
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    paddingHorizontal: 16, marginBottom: 12,
  },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: colors.card,
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border,
    gap: 6, alignItems: 'flex-end',
  },
  statIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.mutedForeground },
  // ─── تنبيه ───
  alertCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: (colors.warning as string) + '15',
    borderWidth: 1, borderColor: (colors.warning as string) + '40',
    borderRadius: 14, padding: 14,
    flexDirection: 'row-reverse', gap: 10, alignItems: 'center',
  },
  alertTxt: { flex: 1, color: colors.warning as string, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  // ─── آخر الرحلات ───
  section: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'right', marginBottom: 10 },
  tripRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  tripMeta: { alignItems: 'center', gap: 4, minWidth: 64 },
  tripId: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 10, fontWeight: '700' },
  tripRoute: { flex: 1, alignItems: 'flex-end', gap: 2 },
  tripAddr: { fontSize: 12, color: colors.foreground, fontWeight: '500', textAlign: 'right' },
  tripAddrTo: { color: colors.mutedForeground, fontWeight: '400' },
  tripArrow: { alignSelf: 'flex-end' },
  tripFare: { fontSize: 13, fontWeight: '800', color: colors.primary },
} as any);
