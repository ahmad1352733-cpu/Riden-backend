import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRegisterPassenger } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { TERMS_CONTENT } from '@/constants/terms';

const BG     = '#0F1B2D';
const CARD   = '#1A2D44';
const FIELD  = '#0F1B2D';
const BORDER = '#2A3F5A';
const ORANGE = '#F5A623';
const WHITE  = '#FFFFFF';
const GRAY   = '#9CA3AF';
const RED    = '#F87171';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '' });
  const [error,         setError]         = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms,     setShowTerms]     = useState(false);

  const set = (field: keyof typeof form) => (v: string) => {
    setForm(p => ({ ...p, [field]: v }));
    setError('');
  };

  const registerMutation = useRegisterPassenger({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || 'فشل التسجيل، حاول مجدداً');
      },
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim() || !form.password) {
      setError('جميع الحقول مطلوبة'); return;
    }
    if (!termsAccepted) {
      setError('يجب الموافقة على الشروط والأحكام وسياسة الخصوصية'); return;
    }
    registerMutation.mutate({ data: form });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 40), paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.logoWrap}>
            <View style={s.circle}>
              <Text style={s.circleR}>R</Text>
            </View>
            <Text style={s.brand}>RIDEN</Text>
            <Text style={s.tagline}>رحلتك، بطريقتك</Text>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>إنشاء حساب</Text>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}

            {([
              { field: 'name',     label: 'الاسم الكامل',       placeholder: 'أحمد الرشيدي',    keyboard: 'default',       secure: false, cap: 'words'  },
              { field: 'phone',    label: 'رقم الهاتف',          placeholder: '+962791234567',   keyboard: 'phone-pad',     secure: false, cap: 'none'   },
              { field: 'email',    label: 'البريد الإلكتروني',   placeholder: 'you@example.com', keyboard: 'email-address', secure: false, cap: 'none'   },
              { field: 'password', label: 'كلمة المرور',         placeholder: '••••••••',        keyboard: 'default',       secure: true,  cap: 'none'   },
            ] as any[]).map(({ field, label, placeholder, keyboard, secure, cap }) => (
              <View key={field} style={s.fieldWrap}>
                <Text style={s.label}>{label}</Text>
                <TextInput
                  style={s.input}
                  value={(form as any)[field]}
                  onChangeText={set(field as keyof typeof form)}
                  placeholder={placeholder}
                  placeholderTextColor={GRAY}
                  keyboardType={keyboard}
                  secureTextEntry={secure}
                  autoCapitalize={cap}
                  textAlign="right"
                />
              </View>
            ))}

            {/* ── الشروط والأحكام ── */}
            <TouchableOpacity
              style={s.termsRow}
              onPress={() => setTermsAccepted(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
                {termsAccepted && <Feather name="check" size={13} color={BG} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.termsTxt}>
                  أوافق على{' '}
                  <Text style={s.termsLink} onPress={(e) => { e.stopPropagation?.(); setShowTerms(true); }}>
                    الشروط والأحكام وسياسة الخصوصية
                  </Text>
                </Text>
                <Text style={s.termsSub}>يجب القراءة والموافقة قبل التسجيل</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.btn, (registerMutation.isPending || !termsAccepted) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={registerMutation.isPending || !termsAccepted}
              activeOpacity={0.85}
            >
              {registerMutation.isPending
                ? <ActivityIndicator color={BG} />
                : <Text style={s.btnTxt}>أوافق وأسجّل</Text>}
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerTxt}>لديك حساب؟ </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={s.footerLink}>سجّل دخولك</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── مودال الشروط والأحكام ── */}
      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>الشروط والأحكام وسياسة الخصوصية</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)} style={s.closeBtn}>
                <Feather name="x" size={20} color={WHITE} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.termsScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.termsContent}>{TERMS_CONTENT}</Text>
            </ScrollView>
            <TouchableOpacity
              style={s.acceptBtn}
              onPress={() => { setTermsAccepted(true); setShowTerms(false); }}
            >
              <Feather name="check-circle" size={18} color={BG} />
              <Text style={s.acceptBtnTxt}>قرأت وأوافق على الشروط</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: BG },
  scroll:   { paddingHorizontal: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  circle:   {
    width: 64, height: 64, borderRadius: 32, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  circleR:   { fontSize: 28, fontWeight: '900', color: BG },
  brand:     { fontSize: 30, fontWeight: '900', color: WHITE, letterSpacing: 8, marginBottom: 4 },
  tagline:   { fontSize: 11, color: ORANGE, letterSpacing: 2, fontWeight: '600' },
  card:      {
    backgroundColor: CARD, borderRadius: 20, padding: 28, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: WHITE, marginBottom: 4, textAlign: 'right' },
  errorBox:  { backgroundColor: RED + '25', borderWidth: 1, borderColor: RED + '60', borderRadius: 12, padding: 12 },
  errorTxt:  { color: RED, fontSize: 13, textAlign: 'right' },
  fieldWrap: { gap: 6 },
  label:     { fontSize: 13, color: GRAY, textAlign: 'right' },
  input:     {
    backgroundColor: FIELD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: WHITE,
  },

  // ── الشروط ──
  termsRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(245,166,35,0.08)', borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)', borderRadius: 14, padding: 14,
  },
  checkbox:        {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: GRAY, alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: ORANGE, borderColor: ORANGE },
  termsTxt:  { fontSize: 13, color: WHITE, textAlign: 'right', lineHeight: 20 },
  termsLink: { color: ORANGE, fontWeight: '700', textDecorationLine: 'underline' },
  termsSub:  { fontSize: 11, color: GRAY, textAlign: 'right', marginTop: 2 },

  btn: {
    backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  btnTxt:     { fontSize: 16, fontWeight: '700', color: BG },
  footer:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  footerTxt:  { fontSize: 14, color: GRAY },
  footerLink: { fontSize: 14, color: ORANGE, fontWeight: '600' },

  // ── مودال الشروط ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '90%',
  },
  modalHeader:  { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 15, fontWeight: '700', color: WHITE, flex: 1, textAlign: 'right' },
  closeBtn:     { padding: 4 },
  termsScroll:  { maxHeight: 440 },
  termsContent: { fontSize: 13, color: '#CBD5E1', lineHeight: 22, textAlign: 'right' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: ORANGE, borderRadius: 14, paddingVertical: 14, marginTop: 16,
  },
  acceptBtnTxt: { fontSize: 15, fontWeight: '700', color: BG },
});
