import React from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
  Platform, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetCaptainEarnings, useGetCaptainTransactions } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

I18nManager.forceRTL(true);

const TYPE_LABELS: Record<string, string> = {
  trip_earning: 'أرباح رحلة',
  trip_commission: 'عمولة الشركة',
  admin_credit: 'شحن رصيد',
};

export default function EarningsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const { data: earnings, isLoading: earningsLoading, refetch: refetchEarnings } =
    useGetCaptainEarnings({ query: { enabled: !!token } });

  const { data: transactions, isLoading: txLoading, refetch: refetchTx } =
    useGetCaptainTransactions({ query: { enabled: !!token } });

  const isRefreshing = false;
  const handleRefresh = () => { refetchEarnings(); refetchTx(); };

  const s = styles(colors);

  const StatCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
    <View style={s.statCard}>
      <Feather name={icon as any} size={20} color={colors.primary} style={{ marginBottom: 6 }} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );

  if (earningsLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={transactions ?? []}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={() => (
          <>
            {/* Header */}
            <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
              <Text style={s.headerTitle}>أرباحي</Text>
            </View>

            {/* Balance Banner */}
            <View style={s.balanceBanner}>
              <Text style={s.balanceLabelBig}>الرصيد الحالي</Text>
              <Text style={s.balanceValueBig}>{(earnings?.balance ?? 0).toFixed(2)} د.أ</Text>
            </View>

            {/* Stats Grid */}
            <View style={s.statsGrid}>
              <StatCard
                label="اليوم"
                value={`${(earnings?.todayEarnings ?? 0).toFixed(2)} د.أ`}
                icon="sun"
              />
              <StatCard
                label="هذا الأسبوع"
                value={`${(earnings?.weekEarnings ?? 0).toFixed(2)} د.أ`}
                icon="calendar"
              />
              <StatCard
                label="هذا الشهر"
                value={`${(earnings?.monthEarnings ?? 0).toFixed(2)} د.أ`}
                icon="trending-up"
              />
              <StatCard
                label="إجمالي الرحلات"
                value={String(earnings?.totalTrips ?? 0)}
                icon="navigation"
              />
            </View>

            {/* Commission note */}
            <View style={s.commissionNote}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={s.commissionText}>
                عمولة الشركة: {Math.round((earnings?.commissionRate ?? 0.1) * 100)}% من كل رحلة
              </Text>
            </View>

            <Text style={s.sectionTitle}>سجل المعاملات</Text>
          </>
        )}
        renderItem={({ item }: { item: any }) => (
          <View style={s.txItem}>
            <View style={s.txIconWrap}>
              <Feather
                name={item.type === 'admin_credit' ? 'plus-circle' : item.amount > 0 ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={20}
                color={item.amount > 0 ? colors.primary : colors.destructive}
              />
            </View>
            <View style={s.txInfo}>
              <Text style={s.txType}>{TYPE_LABELS[item.type] ?? item.type}</Text>
              {item.note ? <Text style={s.txNote}>{item.note}</Text> : null}
              <Text style={s.txDate}>
                {new Date(item.createdAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={[s.txAmount, { color: item.amount > 0 ? colors.primary : colors.destructive }]}>
              {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)} د.أ
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          txLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>لا توجد معاملات بعد</Text>
            </View>
          )
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, textAlign: 'right' },
    balanceBanner: {
      margin: 16, borderRadius: 20, padding: 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    balanceLabelBig: { fontSize: 14, color: colors.primaryForeground + 'BB', marginBottom: 4 },
    balanceValueBig: { fontSize: 40, fontWeight: '800', color: colors.primaryForeground },
    statsGrid: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 12,
      paddingHorizontal: 16, marginBottom: 8,
    },
    statCard: {
      flex: 1, minWidth: '44%', backgroundColor: colors.card,
      borderRadius: 16, padding: 16, alignItems: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    statValue: { fontSize: 18, fontWeight: '800', color: colors.foreground, marginBottom: 2 },
    statLabel: { fontSize: 12, color: colors.mutedForeground, textAlign: 'center' },
    commissionNote: {
      flexDirection: 'row', gap: 6, alignItems: 'center',
      paddingHorizontal: 16, marginBottom: 20, justifyContent: 'flex-end',
    },
    commissionText: { fontSize: 12, color: colors.mutedForeground },
    sectionTitle: {
      fontSize: 16, fontWeight: '700', color: colors.foreground,
      paddingHorizontal: 16, marginBottom: 8, textAlign: 'right',
    },
    txItem: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    txIconWrap: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: 'center', justifyContent: 'center',
    },
    txInfo: { flex: 1, alignItems: 'flex-end' },
    txType: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    txNote: { fontSize: 12, color: colors.mutedForeground },
    txDate: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: '700' },
    empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
