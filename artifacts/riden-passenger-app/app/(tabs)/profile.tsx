import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useGetMyComplaints, useSubmitComplaint } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

const COMPLAINT_TYPES = [
  { value: 'driver_behavior', label: 'سلوك السائق' },
  { value: 'app_issue',       label: 'مشكلة في التطبيق' },
  { value: 'payment',         label: 'مشكلة في الدفع' },
  { value: 'route',           label: 'مشكلة في المسار' },
  { value: 'other',           label: 'أخرى' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [showComplaint, setShowComplaint] = useState(false);
  const [complaintType, setComplaintType] = useState('other');
  const [complaintText, setComplaintText] = useState('');

  const { data: complaints, refetch: refetchComplaints } = useGetMyComplaints({} as any);

  const submitMutation = useSubmitComplaint({
    mutation: {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setComplaintText('');
        setShowComplaint(false);
        refetchComplaints();
      },
    },
  } as any);

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: logout },
    ]);
  };

  const s = styles(colors, insets);
  const complaintList = (complaints as any[]) ?? [];

  return (
    <ScrollView style={s.root} showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.pageTitle}>حسابي</Text>
      </View>

      {/* User info */}
      <View style={s.section}>
        <View style={s.avatar}>
          <Feather name="user" size={32} color="#F5A623" />
        </View>
        <Text style={s.userName}>{user?.name}</Text>
        <Text style={s.userEmail}>{user?.email}</Text>
        <Text style={s.userPhone}>{user?.phone}</Text>
      </View>

      {/* Info cards */}
      <View style={s.card}>
        <InfoRow icon="mail"  label="البريد الإلكتروني" value={user?.email ?? '-'} />
        <InfoRow icon="phone" label="رقم الهاتف"         value={user?.phone ?? '-'} />
        <InfoRow icon="shield" label="نوع الحساب"        value="راكب" />
      </View>

      {/* Complaints */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>الشكاوى</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowComplaint(v => !v)}>
          <Feather name={showComplaint ? 'x' : 'plus'} size={16} color="#F5A623" />
          <Text style={s.addBtnTxt}>{showComplaint ? 'إغلاق' : 'شكوى جديدة'}</Text>
        </TouchableOpacity>
      </View>

      {showComplaint && (
        <View style={s.card}>
          <Text style={s.label}>نوع الشكوى</Text>
          <View style={s.typeGrid}>
            {COMPLAINT_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[s.typeChip, complaintType === t.value && s.typeChipActive]}
                onPress={() => setComplaintType(t.value)}
              >
                <Text style={[s.typeChipTxt, complaintType === t.value && { color: '#0F1B2D' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.label}>تفاصيل الشكوى</Text>
          <TextInput
            style={s.textarea}
            value={complaintText}
            onChangeText={setComplaintText}
            placeholder="اكتب شكواك بالتفصيل..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlign="right"
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[s.submitBtn, (!complaintText.trim() || complaintText.length < 10) && { opacity: 0.5 }]}
            onPress={() => submitMutation.mutate({ data: { type: complaintType as any, description: complaintText } } as any)}
            disabled={!complaintText.trim() || complaintText.length < 10 || submitMutation.isPending}
          >
            {submitMutation.isPending
              ? <ActivityIndicator color="#0F1B2D" size="small" />
              : <Text style={s.submitBtnTxt}>إرسال الشكوى</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Complaint history */}
      {complaintList.length > 0 && (
        <View>
          {complaintList.slice(0, 5).map((c: any) => (
            <View key={c.id} style={[s.card, { marginTop: 8 }]}>
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={s.complaintType}>{COMPLAINT_TYPES.find(t => t.value === c.type)?.label ?? c.type}</Text>
                <View style={[s.statusChip, { backgroundColor: c.status === 'resolved' ? '#22C55E22' : '#F59E0B22', borderColor: c.status === 'resolved' ? '#22C55E' : '#F59E0B' }]}>
                  <Text style={{ fontSize: 11, fontFamily: 'Inter_600SemiBold', color: c.status === 'resolved' ? '#22C55E' : '#F59E0B' }}>
                    {c.status === 'resolved' ? 'محلولة' : 'مفتوحة'}
                  </Text>
                </View>
              </View>
              <Text style={s.complaintDesc}>{c.description}</Text>
              {c.adminNote && <Text style={s.adminNote}>رد الإدارة: {c.adminNote}</Text>}
            </View>
          ))}
        </View>
      )}

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={18} color="#EF4444" />
        <Text style={s.logoutTxt}>تسجيل الخروج</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Feather name={icon} size={16} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, textAlign: 'right' }}>{label}</Text>
        <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: colors.foreground, textAlign: 'right' }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
  pageTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', color: c.foreground, textAlign: 'right' },
  section: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.primary, marginBottom: 12 },
  userName: { fontSize: 20, fontFamily: 'Inter_700Bold', color: c.foreground, marginBottom: 4 },
  userEmail: { fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginBottom: 2 },
  userPhone: { fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  card: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderColor: c.border },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 24, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', color: c.foreground },
  addBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  addBtnTxt: { color: c.primary, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.mutedForeground, textAlign: 'right', marginBottom: 8, marginTop: 12 },
  typeGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.background, borderWidth: 1, borderColor: c.border },
  typeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
  typeChipTxt: { fontSize: 12, fontFamily: 'Inter_500Medium', color: c.mutedForeground },
  textarea: { backgroundColor: c.background, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, color: c.foreground, fontSize: 14, fontFamily: 'Inter_400Regular', height: 100, marginBottom: 12 },
  submitBtn: { backgroundColor: c.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  submitBtnTxt: { color: c.primaryForeground, fontSize: 14, fontFamily: 'Inter_700Bold' },
  complaintType: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  complaintDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right', lineHeight: 20 },
  adminNote: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#22C55E', textAlign: 'right', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: c.border },
  logoutBtn: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginTop: 24, paddingVertical: 14, backgroundColor: '#3D1515', borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' },
  logoutTxt: { color: '#EF4444', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
