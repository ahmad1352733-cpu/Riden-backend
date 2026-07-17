import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Alert, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetCaptainProfile } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

I18nManager.forceRTL(true);

const APPROVAL_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد المراجعة', color: '#F59E0B' },
  approved: { label: 'معتمد', color: '#22C55E' },
  rejected: { label: 'مرفوض', color: '#EF4444' },
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const qc = useQueryClient();

  const { data: captain, isLoading } = useGetCaptainProfile({
    query: { enabled: !!token },
  });

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          qc.clear();
          await logout();
        },
      },
    ]);
  };

  const s = styles(colors);

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const approvalStatus = (captain as any)?.approvalStatus ?? ((captain as any)?.isApproved ? 'approved' : 'pending');
  const statusInfo = APPROVAL_STATUS_LABELS[approvalStatus] ?? APPROVAL_STATUS_LABELS.pending;

  const InfoRow = ({ icon, label, value }: { icon: string; label: string; value?: string | number | null }) => (
    value != null ? (
      <View style={s.infoRow}>
        <View style={s.infoRight}>
          <Text style={s.infoLabel}>{label}</Text>
          <Text style={s.infoValue}>{String(value)}</Text>
        </View>
        <View style={s.infoIconWrap}>
          <Feather name={icon as any} size={18} color={colors.mutedForeground} />
        </View>
      </View>
    ) : null
  );

  return (
    <ScrollView
      style={[s.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.headerTitle}>حسابي</Text>
      </View>

      {/* Avatar + Name */}
      <View style={s.avatarSection}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarInitial}>
            {captain?.name?.charAt(0) ?? 'K'}
          </Text>
        </View>
        <Text style={s.captainName}>{captain?.name ?? ''}</Text>

        {/* Status Badge */}
        <View style={[s.statusBadge, { backgroundColor: statusInfo.color + '25' }]}>
          <View style={[s.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>

        {/* Rating */}
        <View style={s.ratingRow}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Feather
              key={i}
              name="star"
              size={16}
              color={i <= Math.round(captain?.rating ?? 0) ? '#F59E0B' : colors.border}
            />
          ))}
          <Text style={s.ratingText}>{(captain?.rating ?? 0).toFixed(1)}</Text>
        </View>
      </View>

      {/* Personal Info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>المعلومات الشخصية</Text>
        <View style={s.card}>
          <InfoRow icon="user" label="الاسم" value={captain?.name} />
          <InfoRow icon="mail" label="البريد الإلكتروني" value={captain?.email} />
          <InfoRow icon="phone" label="رقم الهاتف" value={captain?.phone} />
          <InfoRow icon="credit-card" label="رقم الرخصة" value={(captain as any)?.licenseNumber} />
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>معلومات المركبة</Text>
        <View style={s.card}>
          <InfoRow icon="truck" label="الماركة" value={(captain as any)?.vehicleMake} />
          <InfoRow icon="settings" label="الموديل" value={(captain as any)?.vehicleModel} />
          <InfoRow icon="calendar" label="سنة الصنع" value={(captain as any)?.vehicleYear} />
          <InfoRow icon="droplet" label="اللون" value={(captain as any)?.vehicleColor} />
          <InfoRow icon="hash" label="رقم اللوحة" value={(captain as any)?.vehiclePlate} />
        </View>
      </View>

      {/* Stats */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>الإحصائيات</Text>
        <View style={s.statsRow}>
          <View style={s.statItem}>
            <Text style={s.statNum}>{captain?.totalTrips ?? 0}</Text>
            <Text style={s.statLbl}>رحلة</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{(captain?.balance ?? 0).toFixed(2)}</Text>
            <Text style={s.statLbl}>رصيد (د.أ)</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{(captain?.rating ?? 0).toFixed(1)}</Text>
            <Text style={s.statLbl}>تقييم</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={s.section}>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={s.logoutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { paddingHorizontal: 20, paddingBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, textAlign: 'right' },
    avatarSection: { alignItems: 'center', paddingVertical: 28, gap: 10 },
    avatarCircle: {
      width: 86, height: 86, borderRadius: 43,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 4,
    },
    avatarInitial: { fontSize: 36, fontWeight: '800', color: colors.primaryForeground },
    captainName: { fontSize: 20, fontWeight: '700', color: colors.foreground },
    statusBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 13, fontWeight: '600' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    ratingText: { fontSize: 14, color: colors.mutedForeground, marginLeft: 4 },
    section: { paddingHorizontal: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground, textAlign: 'right', marginBottom: 10, letterSpacing: 0.5 },
    card: {
      backgroundColor: colors.card, borderRadius: 18,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    infoRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
      paddingHorizontal: 16, paddingVertical: 13, gap: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    infoRight: { flex: 1, alignItems: 'flex-end' },
    infoLabel: { fontSize: 11, color: colors.mutedForeground },
    infoValue: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginTop: 1 },
    infoIconWrap: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: colors.secondary,
      alignItems: 'center', justifyContent: 'center',
    },
    statsRow: {
      backgroundColor: colors.card, borderRadius: 18, flexDirection: 'row',
      borderWidth: 1, borderColor: colors.border, padding: 16,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: colors.primary },
    statLbl: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
    logoutBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, padding: 16,
      backgroundColor: colors.destructive + '15',
      borderRadius: 16, borderWidth: 1, borderColor: colors.destructive + '40',
    },
    logoutText: { fontSize: 16, fontWeight: '700', color: colors.destructive },
  });
