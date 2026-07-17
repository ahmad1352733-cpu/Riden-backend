import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, TextInput, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGetPassengerTrips, useRateTrip, useSubmitComplaint } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:   { label: 'قيد الانتظار', color: '#F59E0B' },
  accepted:  { label: 'تم القبول',    color: '#3B82F6' },
  started:   { label: 'جارية',         color: '#22C55E' },
  completed: { label: 'مكتملة',        color: '#22C55E' },
  cancelled: { label: 'ملغاة',         color: '#EF4444' },
};

const COMPLAINT_TYPES = [
  { value: 'driver_behavior', label: 'سلوك السائق' },
  { value: 'app_issue',       label: 'مشكلة في التطبيق' },
  { value: 'payment',         label: 'مشكلة في الدفع' },
  { value: 'route',           label: 'مشكلة في المسار' },
  { value: 'other',           label: 'أخرى' },
];

export default function TripsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [ratingFor, setRatingFor] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [complaintFor, setComplaintFor] = useState<number | null>(null);
  const [complaintType, setComplaintType] = useState('other');
  const [complaintDesc, setComplaintDesc] = useState('');

  const { data: trips, isLoading, refetch, isFetching } = useGetPassengerTrips({} as any);

  const rateMutation = useRateTrip({
    mutation: {
      onSuccess: () => {
        setRatingFor(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetch();
      },
    },
  } as any);

  const complaintMutation = useSubmitComplaint({
    mutation: {
      onSuccess: () => {
        setComplaintFor(null);
        setComplaintDesc('');
        setComplaintType('other');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('تم إرسال الشكوى', 'سيتم مراجعة شكواك من قِبل الإدارة');
      },
      onError: () => Alert.alert('خطأ', 'تعذّر إرسال الشكوى، حاول مجدداً'),
    },
  } as any);

  const tripList = (trips as any[]) ?? [];
  const s = styles(colors, insets);

  if (isLoading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.title}>رحلاتي</Text>
      </View>

      <FlatList
        data={tripList}
        keyExtractor={item => String((item as any).id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="navigation" size={48} color={colors.border} />
            <Text style={s.emptyTxt}>لا توجد رحلات سابقة</Text>
            <Text style={s.emptySubTxt}>رحلاتك ستظهر هنا</Text>
          </View>
        }
        renderItem={({ item }) => {
          const t = item as any;
          const status = STATUS_MAP[t.status] ?? { label: t.status, color: colors.mutedForeground };
          const canRate = t.status === 'completed' && !t.rating;
          const canComplain = t.status === 'completed';
          return (
            <View style={s.card}>
              {/* Status + fare */}
              <View style={s.cardHeader}>
                <View style={[s.statusBadge, { backgroundColor: status.color + '22', borderColor: status.color }]}>
                  <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
                </View>
                {t.finalFare != null && (
                  <Text style={s.fare}>{t.finalFare.toFixed(2)} د.أ</Text>
                )}
              </View>

              {/* Addresses */}
              <View style={s.addrRow}>
                <Feather name="map-pin" size={12} color="#F5A623" />
                <Text style={s.addr} numberOfLines={1}>{t.pickupAddress}</Text>
              </View>
              <View style={s.addrRow}>
                <Feather name="navigation" size={12} color="#22C55E" />
                <Text style={s.addr} numberOfLines={1}>{t.dropoffAddress}</Text>
              </View>

              {/* Captain */}
              {t.captain && (
                <View style={s.captainRow}>
                  <Text style={s.captainTxt}>الكابتن: {t.captain.name}</Text>
                  {t.captain.vehiclePlate && <Text style={s.plateTxt}>{t.captain.vehiclePlate}</Text>}
                </View>
              )}

              {/* Rating */}
              {t.rating && (
                <View style={s.ratingRow}>
                  {[1,2,3,4,5].map(i => (
                    <Feather key={i} name="star" size={14} color={i <= t.rating ? '#F5A623' : '#2A3F5A'} />
                  ))}
                </View>
              )}

              {/* Buttons row */}
              <View style={s.actionsRow}>
                {canRate && (
                  <TouchableOpacity style={s.rateBtn} onPress={() => { setRatingFor(t.id); setSelectedRating(5); }}>
                    <Feather name="star" size={13} color="#F5A623" />
                    <Text style={s.rateBtnTxt}>قيّم</Text>
                  </TouchableOpacity>
                )}
                {canComplain && (
                  <TouchableOpacity style={s.complaintBtn} onPress={() => { setComplaintFor(t.id); setComplaintDesc(''); setComplaintType('other'); }}>
                    <Feather name="alert-circle" size={13} color="#EF4444" />
                    <Text style={s.complaintBtnTxt}>شكوى</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Date */}
              <Text style={s.date}>{new Date(t.createdAt).toLocaleDateString('ar-JO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          );
        }}
      />

      {/* ── Rating Modal ── */}
      {ratingFor && (
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>قيّم الرحلة</Text>
            <Text style={s.modalSub}>كيف كانت تجربتك؟</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
              {[1,2,3,4,5].map(star => (
                <TouchableOpacity key={star} onPress={() => { setSelectedRating(star); Haptics.selectionAsync(); }}>
                  <Feather name="star" size={38} color={star <= selectedRating ? '#F5A623' : '#2A3F5A'} style={{ marginHorizontal: 6 }} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.submitBtn} onPress={() => rateMutation.mutate({ id: ratingFor, data: { rating: selectedRating } } as any)}>
              {rateMutation.isPending ? <ActivityIndicator color="#0F1B2D" /> : <Text style={s.submitTxt}>إرسال التقييم</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRatingFor(null)} style={{ marginTop: 10, alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground }}>تخطي</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Complaint Modal ── */}
      <Modal visible={complaintFor !== null} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <Text style={s.modalTitle}>تقديم شكوى</Text>
            <Text style={s.modalSub}>سيتم مراجعة شكواك من الإدارة</Text>

            {/* نوع الشكوى */}
            <Text style={s.fieldLabel}>نوع الشكوى</Text>
            <View style={s.typeGrid}>
              {COMPLAINT_TYPES.map(ct => (
                <TouchableOpacity
                  key={ct.value}
                  style={[s.typeBtn, complaintType === ct.value && s.typeBtnActive]}
                  onPress={() => setComplaintType(ct.value)}
                >
                  <Text style={[s.typeTxt, complaintType === ct.value && s.typeTxtActive]}>{ct.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* وصف الشكوى */}
            <Text style={s.fieldLabel}>وصف المشكلة</Text>
            <TextInput
              style={s.descInput}
              value={complaintDesc}
              onChangeText={setComplaintDesc}
              placeholder="اشرح المشكلة بالتفصيل (10 أحرف على الأقل)..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlign="right"
              textAlignVertical="top"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={[s.submitBtn, { flex: 1, backgroundColor: colors.secondary }]} onPress={() => setComplaintFor(null)}>
                <Text style={[s.submitTxt, { color: colors.foreground }]}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.submitBtn, { flex: 1, opacity: complaintDesc.trim().length < 10 ? 0.5 : 1 }]}
                disabled={complaintDesc.trim().length < 10 || complaintMutation.isPending}
                onPress={() => complaintMutation.mutate({ data: { tripId: complaintFor!, type: complaintType as any, description: complaintDesc } })}
              >
                {complaintMutation.isPending
                  ? <ActivityIndicator color="#0F1B2D" />
                  : <Text style={s.submitTxt}>إرسال</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root:          { flex: 1, backgroundColor: c.background },
  center:        { alignItems: 'center', justifyContent: 'center' },
  header:        { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
  title:         { fontSize: 22, fontFamily: 'Inter_700Bold', color: c.foreground, textAlign: 'right' },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTxt:      { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  emptySubTxt:   { fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  card:          { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  cardHeader:    { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusTxt:     { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  fare:          { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#F5A623' },
  addrRow:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  addr:          { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right' },
  captainRow:    { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border },
  captainTxt:    { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.foreground },
  plateTxt:      { fontSize: 13, fontFamily: 'Inter_700Bold', color: c.primary },
  ratingRow:     { flexDirection: 'row-reverse', gap: 2, marginTop: 8 },
  actionsRow:    { flexDirection: 'row-reverse', gap: 8, marginTop: 10 },
  rateBtn:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#1A2D44', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: '#F5A623' },
  rateBtnTxt:    { color: '#F5A623', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  complaintBtn:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#1A2D44', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: '#EF4444' },
  complaintBtnTxt:{ color: '#EF4444', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  date:          { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right', marginTop: 8 },
  overlay:       { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 },
  modalCard:     { backgroundColor: c.card, borderRadius: 20, padding: 24, width: '100%', gap: 12 },
  modalTitle:    { fontSize: 20, fontFamily: 'Inter_700Bold', color: c.foreground, textAlign: 'center' },
  modalSub:      { fontSize: 13, color: c.mutedForeground, textAlign: 'center', marginBottom: 4 },
  fieldLabel:    { fontSize: 13, fontWeight: '600', color: c.foreground, textAlign: 'right' },
  typeGrid:      { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8 },
  typeBtn:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: c.border, backgroundColor: c.secondary },
  typeBtnActive: { borderColor: c.primary, backgroundColor: c.primary + '20' },
  typeTxt:       { fontSize: 12, color: c.mutedForeground, fontWeight: '500' },
  typeTxtActive: { color: c.primary },
  descInput:     { backgroundColor: c.secondary, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 14, color: c.foreground, minHeight: 100 },
  submitBtn:     { backgroundColor: '#F5A623', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitTxt:     { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#0F1B2D' },
});
