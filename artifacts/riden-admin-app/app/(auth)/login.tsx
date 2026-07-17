import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

// ─── Matches the web admin login exactly ───
const BG_SCREEN = '#F3F4F6'; // bg-gray-100
const CARD_BG   = '#FFFFFF';
const NAVY      = '#0F1B2D';
const GOLD      = '#D4A017';
const GRAY_LBL  = '#374151'; // text-gray-700
const GRAY_PH   = '#9CA3AF';
const GRAY_BD   = '#D1D5DB'; // border-gray-300
const RED       = '#DC2626';

export default function AdminLoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        if (data.user.role !== 'admin') {
          setError('This account does not have admin access');
          return;
        }
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || 'Login failed. Check credentials.');
      },
    },
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={BG_SCREEN} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + (Platform.OS === 'web' ? 120 : 80), paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.card}>
            {/* ── Branding ── */}
            <View style={s.brandWrap}>
              <Text style={s.brand}>RIDEN</Text>
              <Text style={s.adminLabel}>Admin Panel</Text>
              <Text style={s.subtitle}>Sign in to your account</Text>
            </View>

            {/* ── Error ── */}
            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}

            {/* ── Email ── */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                placeholder="admin@riden.jo"
                placeholderTextColor={GRAY_PH}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* ── Password ── */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                placeholder="••••••••"
                placeholderTextColor={GRAY_PH}
                secureTextEntry
              />
            </View>

            {/* ── Button ── */}
            <TouchableOpacity
              style={[s.btn, loginMutation.isPending && { opacity: 0.6 }]}
              onPress={() => {
                if (!email.trim() || !password) { setError('Enter email and password'); return; }
                loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
              }}
              disabled={loginMutation.isPending}
              activeOpacity={0.85}
            >
              {loginMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnTxt}>Sign In</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: BG_SCREEN },
  scroll:     { paddingHorizontal: 24 },
  card:       {
    backgroundColor: CARD_BG, borderRadius: 20, padding: 28, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  brandWrap:  { alignItems: 'center', marginBottom: 4, gap: 4 },
  brand:      { fontSize: 38, fontWeight: '800', color: NAVY, letterSpacing: 1 },
  adminLabel: { fontSize: 14, fontWeight: '600', color: GOLD },
  subtitle:   { fontSize: 13, color: GRAY_PH, marginTop: 2 },
  errorBox:   {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  },
  errorTxt:   { color: RED, fontSize: 13 },
  fieldWrap:  { gap: 6 },
  label:      { fontSize: 13, fontWeight: '500', color: GRAY_LBL },
  input:      {
    borderWidth: 1, borderColor: GRAY_BD, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    fontSize: 14, color: NAVY, backgroundColor: CARD_BG,
  },
  btn:        {
    backgroundColor: NAVY, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  btnTxt:     { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
