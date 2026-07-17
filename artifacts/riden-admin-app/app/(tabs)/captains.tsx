import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, RefreshControl, Platform, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminCaptains, useApproveCaptain, useCreditCaptain } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

I18nManager.forceRTL(true);

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

export default function CaptainsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterType>('all');
  const [creditModal, setCreditModal] = useState<{ captainId: number; name: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');

  const { data: captains, isLoading, refetch } = useGetAdminCaptains({
    query: { enabled: !!token },
  });

  const approveMutation = useApproveCaptain({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getAdminCaptains'] });
        qc.invalidateQueries({ queryKey: ['getAdminDashboard'] });
      },
      onError: () => Alert.alert('خطأ', 'فشلت العملية'),
    },
  });

  const creditMutation = useCreditCaptain({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getAdminCaptains'] });
        setCreditModal(null);
        setCreditAmount('');
        setCreditNote('');
        Alert.alert('تم', 'تم شحن الرصيد بنجاح');
      },
      onError: () => Alert.alert('خطأ', 'فشل شحن الرصيد'),
    },
  });

  const filtered = (captains ?? []).filter((c: any) => {
    if (filter === 'all') return true;
    const status = c.approvalStatus ?? (c.isApproved ? 'approved' : 'pending');
    return status === filter;
  });

  const handleApprove = (id: number, name: string, approved: boolean) => {
    Alert.alert(
      approved ? 'قبول الكابتن' : 'رفض الكابتن',
      `هل تريد ${approved ? 'قبول' : 'رفض'} الكابتن ${name}؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: approved ? 'قبول' : 'رفض',
          style: approved ? 'default' : 'destructive',
          onPress: () => approveMutation.mutate({ id, data: { approved } }),
        },
      ],
    );
  };

  const handleCredit = () => {
    if (!creditModal) return;
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('خطأ', 'أدخل مبلغًا صحيحًا');
      return;
    }
    creditMutation.mutate({
      id: creditModal.captainId,
      data: { amount, note: creditNote.trim() || undefined },
    });
  };

  const s = styles(colors);

  const getStatus = (c: any) => c.approvalStatus ?? (c.isApproved ? 'approved' : 'pending');
  const STATUS_COLORS: Record<string, string> = {
    pending: colors.warning as string,
    approved: colors.success as string,
    rejected: colors.destructive,
  };
  const STATUS_AR: Record<string, string> = { pending: 'انتظار', approved: 'معتمد', rejected: 'مرفوض' };

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.headerTitle}>الكباتن ({captains?.length ?? 0})</Text>
        {/* Filter */}
        <View style={s.filterRow}>
          {(['all', 'pending', 'approved', 'rejected'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === 'all' ? 'الكل' : STATUS_AR[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
        renderItem={({ item: captain }: { item: any }) => {
          const status = getStatus(captain);
          const statusColor = STATUS_COLORS[status] ?? colors.mutedForeground;

          return (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.avatarCircle}>
                  <Text style={s.avatarText}>{captain.name?.charAt(0) ?? 'K'}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.captainName}>{captain.name}</Text>
                  <Text style={s.captainEmail}>{captain.email}</Text>
                  <Text style={s.captainPhone}>{captain.phone}</Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: statusColor + '25' }]}>
                  <Text style={[s.statusPillText, { color: statusColor }]}>{STATUS_AR[status]}</Text>
                </View>
              </View>

              {/* Vehicle */}
              {captain.vehicleMake && (
                <View style={s.vehicleRow}>
                  <Feather name="truck" size={12} color={colors.mutedForeground} />
                  <Text style={s.vehicleText}>
                    {captain.vehicleMake} {captain.vehicleModel} {captain.vehicleYear} - {captain.vehiclePlate}
                  </Text>
                </View>
              )}

              {/* Stats */}
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statVal}>{captain.totalTrips ?? 0}</Text>
                  <Text style={s.statLbl}>رحلة</Text>
                </View>
                <View style={s.statItem}>
                  <Text style={[s.statVal, { color: colors.primary }]}>{(captain.balance ?? 0).toFixed(2)}</Text>
                  <Text style={s.statLbl}>رصيد (د.أ)</Text>
                </View>
                <View style={s.statItem}>
                  <Text style={s.statVal}>{(captain.rating ?? 0).toFixed(1)} ★</Text>
                  <Text style={s.statLbl}>تقييم</Text>
                </View>
                <View style={s.statItem}>
                  <View style={[s.onlineDot, { backgroundColor: captain.isOnline ? colors.success : colors.mutedForeground }]} />
                  <Text style={s.statLbl}>{captain.isOnline ? 'متاح' : 'غير متاح'}</Text>
                </View>
              </View>

              {/* Actions */}
              <View style={s.actions}>
                {status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.success + '20', borderColor: colors.success }]}
                      onPress={() => handleApprove(captain.id, captain.name, true)}
                      disabled={approveMutation.isPending}
                    >
                      <Feather name="check" size={14} color={colors.success} />
                      <Text style={[s.actionText, { color: colors.success }]}>قبول</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: colors.destructive + '20', borderColor: colors.destructive }]}
                      onPress={() => handleApprove(captain.id, captain.name, false)}
                      disabled={approveMutation.isPending}
                    >
                      <Feather name="x" size={14} color={colors.destructive} />
                      <Text style={[s.actionText, { color: colors.destructive }]}>رفض</Text>
                    </TouchableOpacity>
                  </>
                )}
                {status === 'approved' && (
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                    onPress={() => { setCreditModal({ captainId: captain.id, name: captain.name }); setCreditAmount(''); setCreditNote(''); }}
                  >
                    <Feather name="plus-circle" size={14} color={colors.primary} />
                    <Text style={[s.actionText, { color: colors.primary }]}>شحن رصيد</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="navigation" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>لا يوجد كباتن</Text>
            </View>
          )
        )}
      />

      {/* Credit Modal */}
      <Modal visible={!!creditModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.modalTitle}>شحن رصيد - {creditModal?.name}</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>المبلغ (د.أ)</Text>
              <TextInput
                style={s.fieldInput}
                value={creditAmount}
                onChangeText={setCreditAmount}
                keyboardType="decimal-pad"
                placeholder="مثال: 10.00"
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>ملاحظة (اختياري)</Text>
              <TextInput
                style={s.fieldInput}
                value={creditNote}
                onChangeText={setCreditNote}
                placeholder="سبب الشحن..."
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setCreditModal(null)}>
                <Text style={s.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.confirmBtn]}
                onPress={handleCredit}
                disabled={creditMutation.isPending}
              >
                {creditMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.confirmBtnText}>شحن</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 10 },
  filterRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginBottom: 4 },
  filterBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
  filterTextActive: { color: colors.primaryForeground },
  card: {
    marginHorizontal: 16, marginVertical: 6,
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: colors.primary },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  captainName: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  captainEmail: { fontSize: 12, color: colors.mutedForeground },
  captainPhone: { fontSize: 12, color: colors.mutedForeground },
  statusPill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  vehicleText: { fontSize: 12, color: colors.mutedForeground },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },
  statItem: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  statLbl: { fontSize: 10, color: colors.mutedForeground },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.mutedForeground },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 14,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
  fieldInput: {
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.foreground,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelBtn: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.mutedForeground, fontWeight: '600', fontSize: 15 },
  confirmBtn: { backgroundColor: colors.primary },
  confirmBtnText: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
} as any);
