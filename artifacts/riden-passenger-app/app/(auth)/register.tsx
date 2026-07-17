import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRegisterPassenger } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

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
  const [error, setError] = useState('');

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
              { field: 'name',     label: 'الاسم الكامل', placeholder: 'أحمد الرشيدي',    keyboard: 'default',       secure: false, cap: 'words'  },
              { field: 'phone',    label: 'رقم الهاتف',    placeholder: '+962791234567',  keyboard: 'phone-pad',     secure: false, cap: 'none'   },
              { field: 'email',    label: 'البريد الإلكتروني', placeholder: 'you@example.com', keyboard: 'email-address', secure: false, cap: 'none' },
              { field: 'password', label: 'كلمة المرور',   placeholder: '••••••••',        keyboard: 'default',       secure: true,  cap: 'none'   },
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

            <TouchableOpacity
              style={[s.btn, registerMutation.isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={registerMutation.isPending}
              activeOpacity={0.85}
            >
              {registerMutation.isPending
                ? <ActivityIndicator color={BG} />
                : <Text style={s.btnTxt}>إنشاء حساب</Text>}
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
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG },
  scroll:    { paddingHorizontal: 24 },
  logoWrap:  { alignItems: 'center', marginBottom: 24 },
  circle:    {
    width: 64, height: 64, borderRadius: 32, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  circleR:   { fontSize: 28, fontWeight: '900', color: BG },
  brand:     { fontSize: 30, fontWeight: '900', color: WHITE, letterSpacing: 8, marginBottom: 4 },
  tagline:   { fontSize: 11, color: ORANGE, letterSpacing: 2, fontWeight: '600' },
  card:      { backgroundColor: CARD, borderRadius: 20, padding: 28, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
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
  btn:       {
    backgroundColor: ORANGE, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  btnTxt:    { fontSize: 16, fontWeight: '700', color: BG },
  footer:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  footerTxt: { fontSize: 14, color: GRAY },
  footerLink:{ fontSize: 14, color: ORANGE, fontWeight: '600' },
});
