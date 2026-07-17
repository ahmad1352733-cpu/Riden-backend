import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

const BG     = '#0F1B2D';
const CARD   = '#1A2D44';
const FIELD  = '#0F1B2D';
const BORDER = '#2A3F5A';
const ORANGE = '#F5A623';
const WHITE  = '#FFFFFF';
const GRAY   = '#9CA3AF';
const RED    = '#F87171';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || 'Invalid credentials');
      },
    },
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 60), paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Logo ── */}
          <View style={s.logoWrap}>
            <View style={s.circle}>
              <Text style={s.circleR}>R</Text>
            </View>
            <Text style={s.brand}>RIDEN</Text>
            <Text style={s.tagline}>YOUR RIDE, YOUR WAY</Text>
          </View>

          {/* ── Card ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>

            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}

            <View style={s.fieldWrap}>
              <Text style={s.label}>Email</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                placeholder="you@example.com"
                placeholderTextColor={GRAY}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Password</Text>
              <TextInput
                style={s.input}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
                placeholder="••••••••"
                placeholderTextColor={GRAY}
                secureTextEntry
              />
            </View>

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
                ? <ActivityIndicator color={BG} />
                : <Text style={s.btnTxt}>Sign In</Text>}
            </TouchableOpacity>

            <View style={s.footer}>
              <Text style={s.footerTxt}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={s.footerLink}>Register</Text>
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
  logoWrap:  { alignItems: 'center', marginBottom: 32 },
  circle:    {
    width: 80, height: 80, borderRadius: 40, backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  circleR:   { fontSize: 38, fontWeight: '900', color: BG },
  brand:     { fontSize: 38, fontWeight: '900', color: WHITE, letterSpacing: 8, marginBottom: 4 },
  tagline:   { fontSize: 12, color: ORANGE, letterSpacing: 3, fontWeight: '600' },
  card:      { backgroundColor: CARD, borderRadius: 20, padding: 28, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: WHITE, marginBottom: 4 },
  errorBox:  { backgroundColor: RED + '25', borderWidth: 1, borderColor: RED + '60', borderRadius: 12, padding: 12 },
  errorTxt:  { color: RED, fontSize: 13 },
  fieldWrap: { gap: 6 },
  label:     { fontSize: 13, color: GRAY },
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
