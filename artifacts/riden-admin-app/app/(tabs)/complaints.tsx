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
  app_issue: 'مشكلة تقنية',
  payment: 'الدفع',
  route: 'المسار',
  other: 'أخرى',
};

type FilterType = 'all' | 'open' | 'resolved';

export default function ComplaintsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterType>('open');
  const [resolveModal, setResolveModal] = useState<{ id: number; type: string } | null>(null);
  const [adminNote, setAdminNote] = useState('');

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
        Alert.alert('تم', 'تم حل الشكوى بنجاح');
      },
      onError: () => Alert.alert('خطأ', 'فشلت العملية'),
    },
  });

  const filtered = (complaints ?? []).filter((c: any) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const s = styles(colors);

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.headerTitle}>
          الشكاوى ({(complaints ?? []).filter((c: any) => c.status === 'open').length} مفتوحة)
        </Text>
        <View style={s.filterRow}>
          {(['all', 'open', 'resolved'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === 'all' ? 'الكل' : f === 'open' ? 'مفتوحة' : 'محلولة'}
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
        renderItem={({ item: complaint }: { item: any }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={[s.typeBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.typeText, { color: colors.primary }]}>
                  {TYPE_AR[complaint.type] ?? complaint.type}
                </Text>
              </View>
              <View style={[s.statusBadge, {
                backgroundColor: complaint.status === 'open' ? colors.destructive + '20' : colors.success + '20',
              }]}>
                <Text style={[s.statusText, {
                  color: complaint.status === 'open' ? colors.destructive : colors.success,
                }]}>{complaint.status === 'open' ? 'مفتوحة' : 'محلولة'}</Text>
              </View>
            </View>

            {complaint.user && (
              <Text style={s.user}>مقدّم الشكوى: {complaint.user.name}</Text>
            )}
            {complaint.tripId && (
              <Text style={s.tripRef}>الرحلة #{complaint.tripId}</Text>
            )}

            <Text style={s.description}>{complaint.description}</Text>

            {complaint.adminNote && (
              <View style={s.adminNoteWrap}>
                <Feather name="message-square" size={12} color={colors.success} />
                <Text style={s.adminNote}>{complaint.adminNote}</Text>
              </View>
            )}

            <View style={s.footer}>
              <Text style={s.date}>
                {new Date(complaint.createdAt).toLocaleDateString('ar-JO', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
              {complaint.status === 'open' && (
                <TouchableOpacity
                  style={s.resolveBtn}
                  onPress={() => { setResolveModal({ id: complaint.id, type: TYPE_AR[complaint.type] ?? complaint.type }); setAdminNote(''); }}
                >
                  <Feather name="check-circle" size={14} color={colors.success} />
                  <Text style={s.resolveBtnText}>حل الشكوى</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="check-circle" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>لا توجد شكاوى</Text>
            </View>
          )
        )}
      />

      {/* Resolve Modal */}
      <Modal visible={!!resolveModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={s.modalTitle}>حل شكوى "{resolveModal?.type}"</Text>
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>ملاحظة الإدارة</Text>
              <TextInput
                style={[s.fieldInput, { minHeight: 80, textAlignVertical: 'top' }]}
                value={adminNote}
                onChangeText={setAdminNote}
                placeholder="اكتب ردّ أو ملاحظة للمستخدم..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                textAlign="right"
              />
            </View>
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setResolveModal(null)}>
                <Text style={s.cancelBtnText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, s.confirmBtn]}
                onPress={() => {
                  if (!adminNote.trim()) { Alert.alert('مطلوب', 'اكتب ملاحظة أولاً'); return; }
                  if (resolveModal) resolveMutation.mutate({ id: resolveModal.id, data: { adminNote: adminNote.trim() } });
                }}
                disabled={resolveMutation.isPending}
              >
                {resolveMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <Text style={s.confirmBtnText}>تأكيد الحل</Text>}
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
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, color: colors.mutedForeground, fontWeight: '600' },
  filterTextActive: { color: colors.primaryForeground },
  card: {
    marginHorizontal: 16, marginVertical: 5,
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  user: { fontSize: 13, color: colors.mutedForeground, textAlign: 'right' },
  tripRef: { fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
  description: { fontSize: 14, color: colors.foreground, lineHeight: 20, textAlign: 'right' },
  adminNoteWrap: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    backgroundColor: colors.success + '15', borderRadius: 8, padding: 8,
  },
  adminNote: { flex: 1, fontSize: 12, color: colors.success, textAlign: 'right' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { fontSize: 11, color: colors.mutedForeground },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resolveBtnText: { fontSize: 13, fontWeight: '600', color: colors.success },
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
