import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, RefreshControl, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminCaptains, useApproveCaptain, useCreditCaptain } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_AR:     Record<string, string> = { pending: 'انتظار', approved: 'معتمد', rejected: 'مرفوض' };
const STATUS_ICON:   Record<string, string> = { pending: 'clock', approved: 'check-circle', rejected: 'x-circle' };

export default function CaptainsScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { token } = useAuth();
  const qc        = useQueryClient();

  const [filter, setFilter]       = useState<FilterType>('pending');
  const [search, setSearch]       = useState('');
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [creditModal, setCreditModal] = useState<{ captainId: number; name: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote]     = useState('');

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
        setCreditModal(null); setCreditAmount(''); setCreditNote('');
        Alert.alert('✓ تم', 'تم شحن الرصيد بنجاح');
      },
      onError: () => Alert.alert('خطأ', 'فشل شحن الرصيد'),
    },
  });

  const getStatus = (c: any): string => c.approvalStatus ?? (c.isApproved ? 'approved' : 'pending');

  const statusColor = (status: string) => {
    if (status === 'approved') return colors.success as string;
    if (status === 'rejected') return colors.destructive;
    return colors.warning as string;
  };

  const filtered = (captains ?? []).filter((c: any) => {
    const st  = getStatus(c);
    const byF = filter === 'all' || st === filter;
    const q   = search.toLowerCase();
    const byS = !q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q) || c.vehiclePlate?.toLowerCase().includes(q);
    return byF && byS;
  });

  const handleApprove = (id: number, name: string, approved: boolean) => {
    Alert.alert(
      approved ? `✓ قبول الكابتن` : `✗ رفض الكابتن`,
      `هل تريد ${approved ? 'قبول' : 'رفض'} الكابتن "${name}"؟`,
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

  const s = styles(colors);

  // إحصائيات سريعة
  const pending  = (captains ?? []).filter((c: any) => getStatus(c) === 'pending').length;
  const approved = (captains ?? []).filter((c: any) => getStatus(c) === 'approved').length;
  const rejected = (captains ?? []).filter((c: any) => getStatus(c) === 'rejected').length;

  return (
    <View style={[s.root]}>
      {/* ─── الهيدر ─── */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <View style={s.headerTop}>
          <Text style={s.title}>الكباتن</Text>
          <View style={s.counters}>
            <View style={[s.counter, { backgroundColor: (colors.warning as string) + '25' }]}>
              <Text style={[s.counterVal, { color: colors.warning as string }]}>{pending}</Text>
              <Text style={[s.counterLbl, { color: colors.warning as string }]}>انتظار</Text>
            </View>
            <View style={[s.counter, { backgroundColor: (colors.success as string) + '25' }]}>
              <Text style={[s.counterVal, { color: colors.success as string }]}>{approved}</Text>
              <Text style={[s.counterLbl, { color: colors.success as string }]}>معتمد</Text>
            </View>
            <View style={[s.counter, { backgroundColor: colors.destructive + '25' }]}>
              <Text style={[s.counterVal, { color: colors.destructive }]}>{rejected}</Text>
              <Text style={[s.counterLbl, { color: colors.destructive }]}>مرفوض</Text>
            </View>
          </View>
        </View>

        {/* البحث */}
        <View style={s.searchRow}>
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث بالاسم أو الهاتف أو اللوحة..."
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* الفلتر */}
        <View style={s.filterRow}>
          {(['pending', 'approved', 'rejected', 'all'] as FilterType[]).map(f => (
            <TouchableOpacity key={f} style={[s.fBtn, filter === f && s.fBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[s.fTxt, filter === f && s.fTxtActive]}>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90), paddingHorizontal: 14, paddingTop: 8 }}
        renderItem={({ item: c }: { item: any }) => {
          const status     = getStatus(c);
          const sColor     = statusColor(status);
          const isExpanded = expanded === c.id;

          return (
            <TouchableOpacity
              style={[s.card, status === 'pending' && s.cardUrgent]}
              onPress={() => setExpanded(isExpanded ? null : c.id)}
              activeOpacity={0.85}
            >
              {/* الصف الرئيسي */}
              <View style={s.cardMain}>
                <View style={[s.avatar, { backgroundColor: sColor + '25', borderColor: sColor + '60' }]}>
                  <Text style={[s.avatarTxt, { color: sColor }]}>{c.name?.charAt(0) ?? 'K'}</Text>
                </View>

                <View style={s.cardInfo}>
                  <Text style={s.captainName}>{c.name}</Text>
                  <Text style={s.captainPhone}>{c.phone}</Text>
                  <Text style={s.captainEmail} numberOfLines={1}>{c.email}</Text>
                </View>

                <View style={s.cardRight}>
                  <View style={[s.statusPill, { backgroundColor: sColor + '20' }]}>
                    <Feather name={STATUS_ICON[status] as any} size={11} color={sColor} />
                    <Text style={[s.statusPillTxt, { color: sColor }]}>{STATUS_AR[status]}</Text>
                  </View>
                  <View style={s.miniStats}>
                    <Feather name={c.isOnline ? 'wifi' : 'wifi-off'} size={12} color={c.isOnline ? colors.success : colors.mutedForeground} />
                    <Text style={s.miniStat}>⭐ {(c.rating ?? 0).toFixed(1)}</Text>
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
                </View>
              </View>

              {/* التفاصيل الموسّعة */}
              {isExpanded && (
                <View style={s.expanded}>
                  {/* السيارة */}
                  <View style={s.detailSection}>
                    <Text style={s.detailSectionTitle}>🚗 معلومات المركبة</Text>
                    <View style={s.detailGrid}>
                      <Detail label="الماركة"     value={`${c.vehicleMake} ${c.vehicleModel}`} />
                      <Detail label="السنة"       value={String(c.vehicleYear ?? '—')} />
                      <Detail label="اللون"       value={c.vehicleColor ?? '—'} />
                      <Detail label="اللوحة"      value={c.vehiclePlate ?? '—'} bold />
                      <Detail label="رخصة القيادة" value={c.licenseNumber ?? '—'} />
                    </View>
                  </View>

                  {/* الإحصائيات */}
                  <View style={s.statsRow}>
                    <StatBox label="الرحلات" value={String(c.totalTrips ?? 0)} colors={colors} />
                    <StatBox label="الرصيد"  value={`${(c.balance ?? 0).toFixed(2)} د.أ`} colors={colors} accent />
                    <StatBox label="التقييم" value={`${(c.rating ?? 0).toFixed(1)} ★`} colors={colors} />
                  </View>

                  {/* تاريخ التسجيل */}
                  {c.createdAt && (
                    <Text style={s.regDate}>
                      تاريخ التسجيل: {new Date(c.createdAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  )}

                  {/* الإجراءات */}
                  <View style={s.actions}>
                    {status === 'pending' && (
                      <>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: (colors.success as string) + '20', borderColor: colors.success as string }]}
                          onPress={() => handleApprove(c.id, c.name, true)}
                          disabled={approveMutation.isPending}
                        >
                          <Feather name="check" size={14} color={colors.success as string} />
                          <Text style={[s.actionTxt, { color: colors.success as string }]}>قبول</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: colors.destructive + '20', borderColor: colors.destructive }]}
                          onPress={() => handleApprove(c.id, c.name, false)}
                          disabled={approveMutation.isPending}
                        >
                          <Feather name="x" size={14} color={colors.destructive} />
                          <Text style={[s.actionTxt, { color: colors.destructive }]}>رفض</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {status === 'approved' && (
                      <>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
                          onPress={() => { setCreditModal({ captainId: c.id, name: c.name }); setCreditAmount(''); setCreditNote(''); }}
                        >
                          <Feather name="plus-circle" size={14} color={colors.primary} />
                          <Text style={[s.actionTxt, { color: colors.primary }]}>شحن رصيد</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive }]}
                          onPress={() => handleApprove(c.id, c.name, false)}
                        >
                          <Feather name="slash" size={14} color={colors.destructive} />
                          <Text style={[s.actionTxt, { color: colors.destructive }]}>تعليق</Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {status === 'rejected' && (
                      <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: (colors.success as string) + '20', borderColor: colors.success as string, flex: 1 }]}
                        onPress={() => handleApprove(c.id, c.name, true)}
                      >
                        <Feather name="refresh-cw" size={14} color={colors.success as string} />
                        <Text style={[s.actionTxt, { color: colors.success as string }]}>إعادة قبول</Text>
                      </TouchableOpacity>
                    )}
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
              <Feather name="truck" size={44} color={colors.mutedForeground} />
              <Text style={s.emptyTxt}>لا يوجد كباتن</Text>
            </View>
          )
        )}
      />

      {/* ─── مودال شحن الرصيد ─── */}
      <Modal visible={!!creditModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>شحن رصيد الكابتن</Text>
            <Text style={s.modalSub}>{creditModal?.name}</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>المبلغ (دينار أردني)</Text>
              <TextInput
                style={s.fieldInput}
                value={creditAmount}
                onChangeText={setCreditAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
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
              <TouchableOpacity style={[s.mBtn, s.mBtnCancel]} onPress={() => setCreditModal(null)}>
                <Text style={s.mBtnCancelTxt}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnConfirm, creditMutation.isPending && { opacity: 0.6 }]}
                onPress={() => {
                  const amt = parseFloat(creditAmount);
                  if (isNaN(amt) || amt <= 0) { Alert.alert('خطأ', 'أدخل مبلغاً صحيحاً'); return; }
                  creditMutation.mutate({ id: creditModal!.captainId, data: { amount: amt, note: creditNote.trim() || undefined } });
                }}
                disabled={creditMutation.isPending}
              >
                {creditMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                  : <Text style={s.mBtnConfirmTxt}>شحن</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Detail({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ fontSize: 13, fontWeight: bold ? '700' : '400', color: bold ? colors.primary : colors.foreground }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

function StatBox({ label, value, colors, accent }: { label: string; value: string; colors: any; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 12, padding: 10, gap: 2 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color: accent ? colors.primary : colors.foreground }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.mutedForeground }}>{label}</Text>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  counters: { flexDirection: 'row', gap: 6 },
  counter: { alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  counterVal: { fontSize: 16, fontWeight: '800' },
  counterLbl: { fontSize: 9, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginBottom: 4 },
  fBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
  },
  fBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  fTxt: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
  fTxtActive: { color: colors.primaryForeground },
  card: {
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10, gap: 0,
  },
  cardUrgent: { borderColor: (colors.warning as string) + '60', borderWidth: 1.5 },
  cardMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt: { fontSize: 20, fontWeight: '800' },
  cardInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  captainName: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  captainPhone: { fontSize: 13, color: colors.mutedForeground },
  captainEmail: { fontSize: 11, color: colors.mutedForeground },
  cardRight: { alignItems: 'flex-end', gap: 5 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusPillTxt: { fontSize: 11, fontWeight: '700' },
  miniStats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniStat: { fontSize: 11, color: colors.mutedForeground },
  expanded: { marginTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  detailSection: { gap: 6 },
  detailSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.mutedForeground, textAlign: 'right' },
  detailGrid: { backgroundColor: colors.secondary, borderRadius: 12, padding: 10, gap: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  regDate: { fontSize: 11, color: colors.mutedForeground, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 12, borderWidth: 1,
  },
  actionTxt: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTxt: { fontSize: 15, color: colors.mutedForeground },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 14,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center' },
  modalSub: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginTop: -6 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
  fieldInput: {
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.foreground,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  mBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  mBtnCancel: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  mBtnCancelTxt: { color: colors.mutedForeground, fontWeight: '600', fontSize: 15 },
  mBtnConfirm: { backgroundColor: colors.primary },
  mBtnConfirmTxt: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
} as any);
