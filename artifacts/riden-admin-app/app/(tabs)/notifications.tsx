import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

const getToken = async () => AsyncStorage.getItem('riden_admin_token');

const TARGET_OPTIONS = [
  { value: 'all',        label: 'الكل',           icon: 'globe',  color: '#6366F1' },
  { value: 'captains',   label: 'الكباتن فقط',    icon: 'truck',  color: '#22C55E' },
  { value: 'passengers', label: 'الركاب فقط',     icon: 'users',  color: '#F5A623' },
] as const;

type Target = typeof TARGET_OPTIONS[number]['value'];

export default function NotificationsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const qc      = useQueryClient();

  const [title,  setTitle]  = useState('');
  const [body,   setBody]   = useState('');
  const [target, setTarget] = useState<Target>('all');

  const { data: sent = [], isLoading, refetch, isFetching } = useQuery<any[]>({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const t = await getToken();
      const r = await fetch(`${baseUrl}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      return r.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const t = await getToken();
      const r = await fetch(`${baseUrl}/api/admin/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ title, body, target }),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      Alert.alert('✅ تم الإرسال', 'تم إرسال الإشعار بنجاح');
      setTitle('');
      setBody('');
      setTarget('all');
      qc.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
    onError: (e: any) => Alert.alert('خطأ', 'فشل الإرسال: ' + e.message),
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('تنبيه', 'العنوان والمحتوى مطلوبان');
      return;
    }
    Alert.alert(
      'تأكيد الإرسال',
      `سيتم إرسال الإشعار إلى: ${TARGET_OPTIONS.find(t => t.value === target)?.label}`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'إرسال', onPress: () => sendMutation.mutate() },
      ],
    );
  };

  const s = styles(colors);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.title}>إرسال إشعار</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, paddingTop: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── اختيار الجمهور ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>الجمهور المستهدف</Text>
          <View style={s.targetRow}>
            {TARGET_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.targetBtn, target === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '18' }]}
                onPress={() => setTarget(opt.value)}
                activeOpacity={0.8}
              >
                <Feather name={opt.icon as any} size={18} color={target === opt.value ? opt.color : colors.mutedForeground} />
                <Text style={[s.targetTxt, target === opt.value && { color: opt.color, fontWeight: '700' }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── نموذج الإشعار ── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>محتوى الإشعار</Text>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>العنوان</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="عنوان الإشعار..."
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              maxLength={80}
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>النص</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder="نص الإشعار..."
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              textAlignVertical="top"
              multiline
              numberOfLines={3}
              maxLength={200}
            />
          </View>

          <TouchableOpacity
            style={[s.sendBtn, (sendMutation.isPending) && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={sendMutation.isPending}
            activeOpacity={0.85}
          >
            {sendMutation.isPending
              ? <ActivityIndicator color={colors.primaryForeground} />
              : <><Feather name="send" size={17} color={colors.primaryForeground} /><Text style={s.sendTxt}>إرسال الإشعار</Text></>
            }
          </TouchableOpacity>
        </View>

        {/* ── سجل الإشعارات المرسلة ── */}
        <Text style={s.historyTitle}>الإشعارات المرسلة</Text>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (sent as any[]).length === 0 ? (
          <View style={s.empty}>
            <Feather name="bell-off" size={40} color={colors.border} />
            <Text style={s.emptyTxt}>لم يتم إرسال إشعارات بعد</Text>
          </View>
        ) : (
          (sent as any[]).map((n: any) => {
            const tOpt = TARGET_OPTIONS.find(t => t.value === n.target);
            return (
              <View key={n.id} style={s.notifCard}>
                <View style={s.notifHeader}>
                  <View style={[s.badge, { backgroundColor: (tOpt?.color ?? colors.primary) + '20' }]}>
                    <Feather name={(tOpt?.icon ?? 'bell') as any} size={12} color={tOpt?.color ?? colors.primary} />
                    <Text style={[s.badgeTxt, { color: tOpt?.color ?? colors.primary }]}>{tOpt?.label ?? n.target}</Text>
                  </View>
                  <Text style={s.notifDate}>
                    {new Date(n.createdAt).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={s.notifTitle}>{n.title}</Text>
                <Text style={s.notifBody}>{n.body}</Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  root:        { flex: 1, backgroundColor: c.background },
  header:      { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
  title:       { fontSize: 22, fontWeight: '800', color: c.foreground, textAlign: 'right' },
  card:        { backgroundColor: c.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 14, gap: 12 },
  sectionLabel:{ fontSize: 13, fontWeight: '700', color: c.mutedForeground, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 1 },
  targetRow:   { flexDirection: 'row-reverse', gap: 8 },
  targetBtn:   { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: c.border, backgroundColor: c.secondary },
  targetTxt:   { fontSize: 11, fontWeight: '600', color: c.mutedForeground, textAlign: 'center' },
  fieldWrap:   { gap: 6 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: c.foreground, textAlign: 'right' },
  input:       { backgroundColor: c.secondary, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.foreground },
  textArea:    { minHeight: 80, paddingTop: 12 },
  sendBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: c.primary, borderRadius: 14, paddingVertical: 14 },
  sendTxt:     { fontSize: 16, fontWeight: '700', color: c.primaryForeground },
  historyTitle:{ fontSize: 16, fontWeight: '700', color: c.foreground, textAlign: 'right', marginBottom: 10 },
  empty:       { alignItems: 'center', gap: 10, paddingVertical: 30 },
  emptyTxt:    { fontSize: 14, color: c.mutedForeground },
  notifCard:   { backgroundColor: c.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border, marginBottom: 10, gap: 6 },
  notifHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  badge:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeTxt:    { fontSize: 11, fontWeight: '700' },
  notifDate:   { fontSize: 11, color: c.mutedForeground },
  notifTitle:  { fontSize: 14, fontWeight: '700', color: c.foreground, textAlign: 'right' },
  notifBody:   { fontSize: 13, color: c.mutedForeground, textAlign: 'right', lineHeight: 20 },
});
