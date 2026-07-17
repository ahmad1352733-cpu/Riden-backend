import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, RefreshControl,
  Platform, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminComplaints, useResolveComplaint } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

I18nManager.forceRTL(true);

const TYPE_AR: Record<string, string> = {
  driver_behavior: 'سلوك الكابتن',
  app_issue:       'مشكلة تقنية',
  payment:         'الدفع',
  route:           'المسار',
  other:           'أخرى',
};

const TYPE_ICON: Record<string, string> = {
  driver_behavior: 'user-x',
  app_issue:       'alert-triangle',
  payment:         'credit-card',
  route:           'map-pin',
  other:           'more-horizontal',
};

type FilterType = 'open' | 'resolved' | 'all';

export default function ComplaintsScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { token } = useAuth();
  const qc        = useQueryClient();

  const [filter,       setFilter]       = useState<FilterType>('open');
  const [expanded,     setExpanded]     = useState<number | null>(null);
  const [resolveModal, setResolveModal] = useState<{ id: number; type: string } | null>(null);
  const [adminNote,    setAdminNote]    = useState('');

  const { data: complaints, isLoading, refetch } = useGetAdminComplaints({
    query: { enabled: !!token },
  });

  const resolveMutation = useResolveComplaint({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getAdminComplaints'] });
        qc.invalidateQueries({ queryKey: ['getAdminDashboard'] });
        setResolveModal(null);
        setAdminNote('');
        Alert.alert('✓ تم', 'تم حل الشكوى بنجاح');
      },
      onError: () => Alert.alert('خطأ', 'فشلت العملية'),
    },
  });

  const all      = complaints ?? [];
  const openCnt  = all.filter((c: any) => c.status === 'open').length;
  const resCnt   = all.filter((c: any) => c.status === 'resolved').length;

  const filtered = all.filter((c: any) => {
    if (filter === 'all')      return true;
    return c.status === filter;
  });

  const s = styles(colors);

  return (
    <View style={s.root}>
      {/* ─── الهيدر ─── */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <View style={s.headerTop}>
          <Text style={s.title}>الشكاوى</Text>
          <View style={s.counters}>
            <View style={[s.counter, { backgroundColor: colors.destructive + '20' }]}>
              <Text style={[s.counterVal, { color: colors.destructive }]}>{openCnt}</Text>
              <Text style={[s.counterLbl, { color: colors.destructive }]}>مفتوحة</Text>
            </View>
            <View style={[s.counter, { backgroundColor: (colors.success as string) + '20' }]}>
              <Text style={[s.counterVal, { color: colors.success as string }]}>{resCnt}</Text>
              <Text style={[s.counterLbl, { color: colors.success as string }]}>محلولة</Text>
            </View>
          </View>
        </View>

        <View style={s.filterRow}>
          {(['open', 'resolved', 'all'] as FilterType[]).map(f => (
            <TouchableOpacity key={f} style={[s.fBtn, filter === f && s.fBtnActive]} onPress={() => setFilter(f)}>
              <Text style={[s.fTxt, filter === f && s.fTxtActive]}>
                {f === 'open' ? 'مفتوحة' : f === 'resolved' ? 'محلولة' : 'الكل'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingHorizontal: 14, paddingTop: 8,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90),
        }}
        renderItem={({ item: c }: { item: any }) => {
          const isOpen     = c.status === 'open';
          const typeLabel  = TYPE_AR[c.type] ?? c.type;
          const typeIcon   = TYPE_ICON[c.type] ?? 'alert-circle';
          const isExpanded = expanded === c.id;

          return (
            <TouchableOpacity
              style={[s.card, isOpen && s.cardOpen]}
              onPress={() => setExpanded(isExpanded ? null : c.id)}
              activeOpacity={0.85}
            >
              {/* الصف الرئيسي */}
              <View style={s.cardTop}>
                <View style={[s.typeIcon, { backgroundColor: isOpen ? colors.destructive + '20' : (colors.success as string) + '15' }]}>
                  <Feather name={typeIcon as any} size={16} color={isOpen ? colors.destructive : colors.success as string} />
                </View>
                <View style={s.cardInfo}>
                  <View style={s.cardInfoRow}>
                    <Text style={s.typeLabel}>{typeLabel}</Text>
                    {c.user && <Text style={s.userName}>{c.user.name}</Text>}
                  </View>
                  <Text style={s.desc} numberOfLines={isExpanded ? undefined : 2}>{c.description}</Text>
                </View>
                <View style={s.cardRight}>
                  <View style={[s.statusBadge, {
                    backgroundColor: isOpen ? colors.destructive + '20' : (colors.success as string) + '20',
                  }]}>
                    <Text style={[s.statusTxt, { color: isOpen ? colors.destructive : colors.success as string }]}>
                      {isOpen ? 'مفتوحة' : 'محلولة'}
                    </Text>
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
                </View>
              </View>

              {/* التفاصيل */}
              {isExpanded && (
                <View style={s.expanded}>
                  {c.tripId && (
                    <View style={s.metaRow}>
                      <Feather name="map" size={12} color={colors.mutedForeground} />
                      <Text style={s.metaTxt}>رحلة #{c.tripId}</Text>
                    </View>
                  )}
                  <View style={s.metaRow}>
                    <Feather name="calendar" size={12} color={colors.mutedForeground} />
                    <Text style={s.metaTxt}>
                      {new Date(c.createdAt).toLocaleString('ar-JO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {c.adminNote && (
                    <View style={s.adminNoteWrap}>
                      <Feather name="message-square" size={13} color={colors.success as string} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.adminNoteLabel}>رد الإدارة</Text>
                        <Text style={s.adminNote}>{c.adminNote}</Text>
                      </View>
                    </View>
                  )}

                  {isOpen && (
                    <TouchableOpacity
                      style={s.resolveBtn}
                      onPress={() => { setResolveModal({ id: c.id, type: typeLabel }); setAdminNote(''); }}
                    >
                      <Feather name="check-circle" size={15} color="#fff" />
                      <Text style={s.resolveBtnTxt}>حل الشكوى</Text>
                    </TouchableOpacity>
                  )}
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
              <Feather name="check-circle" size={44} color={colors.mutedForeground} />
              <Text style={s.emptyTxt}>{filter === 'open' ? 'لا توجد شكاوى مفتوحة 🎉' : 'لا توجد شكاوى'}</Text>
            </View>
          )
        )}
      />

      {/* ─── مودال الحل ─── */}
      <Modal visible={!!resolveModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>حل الشكوى</Text>
            <Text style={s.modalSub}>النوع: {resolveModal?.type}</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>رد الإدارة على المستخدم *</Text>
              <TextInput
                style={[s.fieldInput, { minHeight: 100, textAlignVertical: 'top' }]}
                value={adminNote}
                onChangeText={setAdminNote}
                placeholder="اكتب رداً واضحاً على الشكوى..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlign="right"
              />
            </View>
            <View style={s.mBtns}>
              <TouchableOpacity style={[s.mBtn, s.mBtnCancel]} onPress={() => setResolveModal(null)}>
                <Text style={s.mBtnCancelTxt}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnConfirm, resolveMutation.isPending && { opacity: 0.6 }]}
                onPress={() => {
                  if (!adminNote.trim()) { Alert.alert('مطلوب', 'اكتب رداً أولاً'); return; }
                  if (resolveModal) resolveMutation.mutate({ id: resolveModal.id, data: { adminNote: adminNote.trim() } });
                }}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                  : <Text style={s.mBtnConfirmTxt}>تأكيد الحل</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  filterRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginBottom: 4 },
  fBtn: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
  },
  fBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  fTxt: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600' },
  fTxtActive: { color: colors.primaryForeground },
  card: {
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 10, gap: 0,
  },
  cardOpen: { borderColor: colors.destructive + '40' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, gap: 4 },
  cardInfoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  typeLabel: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  userName: { fontSize: 12, color: colors.mutedForeground },
  desc: { fontSize: 13, color: colors.foreground, lineHeight: 19, textAlign: 'right' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  expanded: {
    marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 12, gap: 8,
  },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  metaTxt: { fontSize: 12, color: colors.mutedForeground },
  adminNoteWrap: {
    flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-start',
    backgroundColor: (colors.success as string) + '15',
    borderWidth: 1, borderColor: (colors.success as string) + '40',
    borderRadius: 10, padding: 10,
  },
  adminNoteLabel: { fontSize: 11, fontWeight: '700', color: colors.success as string, textAlign: 'right' },
  adminNote: { fontSize: 13, color: colors.success as string, textAlign: 'right' },
  resolveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.success as string, borderRadius: 12, paddingVertical: 11,
  },
  resolveBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTxt: { fontSize: 15, color: colors.mutedForeground, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 14,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center' },
  modalSub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: -6 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
  fieldInput: {
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.foreground,
  },
  mBtns: { flexDirection: 'row', gap: 12 },
  mBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  mBtnCancel: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  mBtnCancelTxt: { color: colors.mutedForeground, fontWeight: '600', fontSize: 15 },
  mBtnConfirm: { backgroundColor: colors.success as string },
  mBtnConfirmTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
} as any);
