import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

const BG    = '#0F1B2D';
const CARD  = '#1A2D44';
const BORD  = 'rgba(255,255,255,0.10)';
const GREEN = '#22C55E';
const WHITE = '#FFFFFF';
const GRAY  = '#9CA3AF';
const RED   = '#F87171';

export default function CaptainLoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        if (data.user.role !== 'captain') {
          setError('هذا الحساب ليس حساب كابتن');
          return;
        }
        await login(data.token, data.user as any);
        router.replace('/');
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
      },
    },
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 80), paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.brandWrap}>
            <Text style={s.brand}>RIDEN</Text>
            <Text style={s.sub}>كابتن</Text>
          </View>

          <View style={s.form}>
            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}

            <View style={s.fieldWrap}>
              <Text style={s.label}>البريد الإلكتروني</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                placeholder="captain@example.com"
                placeholderTextColor={GRAY}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>كلمة المرور</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                placeholder="••••••••"
                placeholderTextColor={GRAY}
                secureTextEntry
                textAlign="right"
              />
            </View>

            <TouchableOpacity
              style={[s.btn, loginMutation.isPending && { opacity: 0.6 }]}
              onPress={() => {
                if (!email.trim() || !password) { setError('أدخل البريد الإلكتروني وكلمة المرور'); return; }
                loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
              }}
              disabled={loginMutation.isPending}
              activeOpacity={0.85}
            >
              {loginMutation.isPending
                ? <ActivityIndicator color={WHITE} />
                : <Text style={s.btnTxt}>تسجيل الدخول</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerTxt}>كابتن جديد؟ </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={s.footerLink}>سجّل هنا</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: BG },
  scroll:   { paddingHorizontal: 24 },
  brandWrap:{ alignItems: 'center', marginBottom: 48 },
  brand:    { fontSize: 52, fontWeight: '900', color: WHITE, letterSpacing: 2, marginBottom: 4 },
  sub:      { fontSize: 18, fontWeight: '600', color: GREEN, letterSpacing: 6, textTransform: 'uppercase' },
  form:     { gap: 14 },
  errorBox: { backgroundColor: RED + '25', borderWidth: 1, borderColor: RED + '60', borderRadius: 12, padding: 12 },
  errorTxt: { color: RED, fontSize: 13, textAlign: 'right' },
  fieldWrap:{ gap: 6 },
  label:    { fontSize: 13, color: GRAY, textAlign: 'right' },
  input:    {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORD,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: WHITE,
  },
  btn:      {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 6,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnTxt:   { fontSize: 16, fontWeight: '700', color: WHITE },
  footer:   { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerTxt:{ fontSize: 14, color: GRAY },
  footerLink:{ fontSize: 14, color: GREEN, fontWeight: '500' },
});
