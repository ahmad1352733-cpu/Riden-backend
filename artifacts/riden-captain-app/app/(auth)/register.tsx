import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRegisterCaptain } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import { TERMS_CONTENT } from '@/constants/terms';

const BG    = '#0F1B2D';
const CARD  = '#1A2D44';
const BORD  = 'rgba(255,255,255,0.10)';
const GREEN = '#22C55E';
const WHITE = '#FFFFFF';
const GRAY  = '#9CA3AF';
const RED   = '#F87171';

const INP: any = {
  backgroundColor: CARD, borderWidth: 1, borderColor: BORD,
  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  fontSize: 14, color: WHITE, textAlign: 'right',
};
const LBL: any = {
  fontSize: 12, color: GRAY, fontWeight: '600', textAlign: 'right', marginBottom: 4,
};

export default function CaptainRegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
    licenseNumber: '', vehicleMake: '', vehicleModel: '',
    vehiclePlate: '', vehicleYear: '', vehicleColor: '',
  });
  const [error,         setError]         = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms,     setShowTerms]     = useState(false);

  const set = (field: keyof typeof form) => (v: string) => {
    setForm(p => ({ ...p, [field]: v }));
    setError('');
  };

  const registerMutation = useRegisterCaptain({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user as any);
        router.replace('/');
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || 'فشل التسجيل، حاول مجدداً');
      },
    },
  });

  const handleSubmit = () => {
    const required = ['name','phone','email','password','licenseNumber','vehicleMake','vehicleModel','vehiclePlate','vehicleYear','vehicleColor'];
    if (required.some(k => !(form as any)[k]?.trim())) {
      setError('جميع الحقول مطلوبة'); return;
    }
    if (!termsAccepted) {
      setError('يجب الموافقة على الشروط والأحكام وسياسة الخصوصية'); return;
    }
    registerMutation.mutate({ data: { ...form, vehicleYear: parseInt(form.vehicleYear, 10) } });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 40), paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text style={s.brand}>RIDEN</Text>
            <Text style={s.sub}>تسجيل كابتن جديد</Text>
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* ── البيانات الشخصية ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>البيانات الشخصية</Text>
            <View style={{ gap: 10 }}>
              <View><Text style={LBL}>الاسم الكامل</Text><TextInput style={INP} value={form.name} onChangeText={set('name')} placeholder="أحمد الرشيدي" placeholderTextColor={GRAY} autoCapitalize="words" /></View>
              <View><Text style={LBL}>رقم الهاتف</Text><TextInput style={INP} value={form.phone} onChangeText={set('phone')} placeholder="+962791234567" placeholderTextColor={GRAY} keyboardType="phone-pad" /></View>
              <View><Text style={LBL}>البريد الإلكتروني</Text><TextInput style={INP} value={form.email} onChangeText={set('email')} placeholder="captain@example.com" placeholderTextColor={GRAY} keyboardType="email-address" autoCapitalize="none" /></View>
              <View><Text style={LBL}>كلمة المرور</Text><TextInput style={INP} value={form.password} onChangeText={set('password')} placeholder="••••••••" placeholderTextColor={GRAY} secureTextEntry /></View>
            </View>
          </View>

          {/* ── بيانات المركبة والرخصة ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>المركبة والرخصة</Text>
            <View style={{ gap: 10 }}>
              <View><Text style={LBL}>رقم رخصة القيادة</Text><TextInput style={INP} value={form.licenseNumber} onChangeText={set('licenseNumber')} placeholder="JO-1234567" placeholderTextColor={GRAY} autoCapitalize="characters" /></View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Text style={LBL}>الماركة</Text><TextInput style={INP} value={form.vehicleMake} onChangeText={set('vehicleMake')} placeholder="تويوتا" placeholderTextColor={GRAY} /></View>
                <View style={{ flex: 1 }}><Text style={LBL}>الموديل</Text><TextInput style={INP} value={form.vehicleModel} onChangeText={set('vehicleModel')} placeholder="كامري" placeholderTextColor={GRAY} /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Text style={LBL}>رقم اللوحة</Text><TextInput style={INP} value={form.vehiclePlate} onChangeText={set('vehiclePlate')} placeholder="أ ب ج 1234" placeholderTextColor={GRAY} autoCapitalize="characters" /></View>
                <View style={{ flex: 1 }}><Text style={LBL}>سنة الصنع</Text><TextInput style={INP} value={form.vehicleYear} onChangeText={set('vehicleYear')} placeholder="2020" placeholderTextColor={GRAY} keyboardType="number-pad" /></View>
              </View>
              <View><Text style={LBL}>اللون</Text><TextInput style={INP} value={form.vehicleColor} onChangeText={set('vehicleColor')} placeholder="أبيض" placeholderTextColor={GRAY} /></View>
            </View>
          </View>

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
              ? <ActivityIndicator color={WHITE} />
              : <Text style={s.btnTxt}>أوافق وأسجّل</Text>}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
            <Text style={{ color: GRAY, fontSize: 14 }}>لديك حساب؟ </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={{ color: GREEN, fontSize: 14, fontWeight: '500' }}>سجّل دخولك</Text>
            </TouchableOpacity>
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
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { paddingHorizontal: 20 },
  brand:        { fontSize: 40, fontWeight: '900', color: WHITE, letterSpacing: 2 },
  sub:          { fontSize: 13, fontWeight: '600', color: GREEN, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  errorBox:     { backgroundColor: RED + '25', borderWidth: 1, borderColor: RED + '60', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorTxt:     { color: RED, fontSize: 13, textAlign: 'right' },
  section:      { backgroundColor: 'rgba(26,45,68,0.6)', borderRadius: 20, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: WHITE, marginBottom: 12, textAlign: 'right' },

  // ── الشروط ──
  termsRow: {
    flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.25)', borderRadius: 14,
    padding: 14, marginBottom: 16,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: GRAY, alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: GREEN, borderColor: GREEN },
  termsTxt:  { fontSize: 13, color: WHITE, textAlign: 'right', lineHeight: 20 },
  termsLink: { color: GREEN, fontWeight: '700', textDecorationLine: 'underline' },
  termsSub:  { fontSize: 11, color: GRAY, textAlign: 'right', marginTop: 2 },

  btn: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnTxt: { fontSize: 16, fontWeight: '700', color: WHITE },

  // ── مودال الشروط ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:  { fontSize: 16, fontWeight: '700', color: WHITE, flex: 1, textAlign: 'right' },
  closeBtn:    { padding: 4 },
  termsScroll: { maxHeight: 440 },
  termsContent:{ fontSize: 13, color: '#CBD5E1', lineHeight: 22, textAlign: 'right' },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, marginTop: 16,
  },
  acceptBtnTxt: { fontSize: 15, fontWeight: '700', color: BG },
});
