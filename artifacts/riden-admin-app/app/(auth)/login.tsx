import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  I18nManager, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

const C = {
  bg:      '#0D1117',
  surface: '#161B22',
  border:  '#21262D',
  accent:  '#1F6FEB',
  accentD: '#388BFD',
  white:   '#E6EDF3',
  gray:    '#8B949E',
  red:     '#F85149',
};

export default function AdminLogin() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        if (data.user.role !== 'admin') {
          setError('هذا الحساب ليس حساب مسؤول');
          return;
        }
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: () => setError('بيانات الدخول غير صحيحة'),
    },
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 60), paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── الشعار ─── */}
          <View style={s.logo}>
            <View style={s.shieldWrap}>
              <Feather name="shield" size={36} color={C.accentD} />
            </View>
            <Text style={s.brand}>RIDEN</Text>
            <View style={s.adminTag}>
              <Text style={s.adminTagTxt}>ADMIN PORTAL</Text>
            </View>
            <Text style={s.sub}>لوحة التحكم المركزية</Text>
          </View>

          {/* ─── الفورم ─── */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Feather name="lock" size={18} color={C.accent} />
              <Text style={s.cardTitle}>دخول آمن</Text>
            </View>

            {!!error && (
              <View style={s.errorBox}>
                <Feather name="alert-octagon" size={14} color={C.red} />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>البريد الإلكتروني</Text>
              <View style={[s.inputRow, email.length > 0 && s.inputFocused]}>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); }}
                  placeholder="admin@riden.jo"
                  placeholderTextColor={C.gray}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
                <Feather name="user" size={16} color={C.gray} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>كلمة المرور</Text>
              <View style={[s.inputRow, password.length > 0 && s.inputFocused]}>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  placeholder="••••••••"
                  placeholderTextColor={C.gray}
                  secureTextEntry={!showPass}
                  textAlign="right"
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)}>
                  <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color={C.gray} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[s.btn, loginMutation.isPending && { opacity: 0.7 }]}
              onPress={() => {
                setError('');
                if (!email.trim() || !password) { setError('أدخل جميع الحقول'); return; }
                loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
              }}
              disabled={loginMutation.isPending}
              activeOpacity={0.85}
            >
              {loginMutation.isPending
                ? <ActivityIndicator color="#fff" size="small" />
                : <View style={s.btnInner}>
                    <Text style={s.btnTxt}>دخول</Text>
                    <Feather name="arrow-left" size={18} color="#fff" />
                  </View>
              }
            </TouchableOpacity>
          </View>

          {/* ─── معلومات الأمان ─── */}
          <View style={s.secureNote}>
            <Feather name="lock" size={12} color={C.gray} />
            <Text style={s.secureText}>اتصال مشفّر · صلاحيات محدودة بالدور الوظيفي</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 28 },
  logo: { alignItems: 'center', marginBottom: 40 },
  shieldWrap: {
    width: 88, height: 88, borderRadius: 22,
    backgroundColor: C.accent + '20', borderWidth: 1.5, borderColor: C.accent + '50',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brand: { fontSize: 36, fontWeight: '900', color: C.white, letterSpacing: 6, marginBottom: 8 },
  adminTag: {
    backgroundColor: C.accent + '25', borderRadius: 6, borderWidth: 1, borderColor: C.accent + '50',
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10,
  },
  adminTagTxt: { fontSize: 11, fontWeight: '800', color: C.accentD, letterSpacing: 3 },
  sub: { fontSize: 14, color: C.gray },
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    padding: 24, gap: 16,
  },
  cardHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: C.white },
  errorBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: C.red + '18', borderWidth: 1, borderColor: C.red + '50',
    borderRadius: 10, padding: 12,
  },
  errorTxt: { flex: 1, color: C.red, fontSize: 13, textAlign: 'right' },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: C.gray, textAlign: 'right', letterSpacing: 0.5 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputFocused: { borderColor: C.accent + '80' },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: C.white, textAlign: 'right' },
  btn: {
    backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
    elevation: 6,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnTxt: { fontSize: 16, fontWeight: '800', color: '#fff' },
  secureNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 24,
  },
  secureText: { fontSize: 12, color: C.gray },
});
