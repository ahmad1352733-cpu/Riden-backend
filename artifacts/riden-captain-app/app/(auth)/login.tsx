import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, I18nManager, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

// ─── ألوان ثابتة لتطبيق الكابتن (داكن ذهبي) ────────────────────────────────
const C = {
  bg: '#0A0F1E',          // خلفية سوداء زرقاء
  card: '#111827',        // كارد داكن
  border: '#1F2937',
  gold: '#F59E0B',        // ذهبي
  goldDim: '#92400E',
  white: '#F9FAFB',
  gray: '#6B7280',
  gray2: '#374151',
  red: '#EF4444',
};

export default function CaptainLoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        if (data.user.role !== 'captain') {
          setError('هذا الحساب غير مسجّل ككابتن');
          return;
        }
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: () => setError('البريد الإلكتروني أو كلمة المرور غير صحيحة'),
    },
  });

  const handleLogin = () => {
    setError('');
    if (!email.trim() || !password) {
      setError('يرجى إدخال جميع الحقول');
      return;
    }
    loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero ─── */}
          <View style={s.hero}>
            {/* أيقونة كبيرة */}
            <View style={s.heroIcon}>
              <Feather name="truck" size={48} color={C.gold} />
            </View>

            <View style={s.brandRow}>
              <Text style={s.brandRiden}>RIDEN</Text>
              <View style={s.captainBadge}>
                <Text style={s.captainBadgeTxt}>CAPTAIN</Text>
              </View>
            </View>

            <Text style={s.heroTitle}>بوابة الكباتن المحترفين</Text>
            <Text style={s.heroSub}>اقود باحترافية، اكسب بجدارة</Text>
          </View>

          {/* ─── الفورم ─── */}
          <View style={s.form}>
            <Text style={s.formTitle}>تسجيل الدخول</Text>

            {!!error && (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color={C.red} />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            )}

            <View style={s.field}>
              <Text style={s.label}>البريد الإلكتروني</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={t => { setEmail(t); setError(''); }}
                  placeholder="captain@example.com"
                  placeholderTextColor={C.gray}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textAlign="right"
                />
                <Feather name="mail" size={16} color={C.gray} style={s.inputIcon} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>كلمة المرور</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  placeholder="••••••••"
                  placeholderTextColor={C.gray}
                  secureTextEntry={!showPass}
                  textAlign="right"
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                  <Feather name={showPass ? 'eye-off' : 'eye'} size={16} color={C.gray} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[s.btn, loginMutation.isPending && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loginMutation.isPending}
              activeOpacity={0.8}
            >
              {loginMutation.isPending
                ? <ActivityIndicator color="#0A0F1E" size="small" />
                : (
                  <View style={s.btnInner}>
                    <Text style={s.btnTxt}>دخول</Text>
                    <Feather name="arrow-left" size={18} color="#0A0F1E" />
                  </View>
                )}
            </TouchableOpacity>

            {/* فاصل */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>أو</Text>
              <View style={s.divLine} />
            </View>

            <TouchableOpacity
              style={s.registerBtn}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.8}
            >
              <Feather name="user-plus" size={16} color={C.gold} />
              <Text style={s.registerBtnTxt}>التسجيل كقائد جديد</Text>
            </TouchableOpacity>
          </View>

          {/* ─── ميزات سريعة ─── */}
          <View style={s.features}>
            {[
              { icon: 'dollar-sign', text: '90% من قيمة الرحلة لك' },
              { icon: 'clock', text: 'اختر ساعات عملك بحرية' },
              { icon: 'shield', text: 'دفع آمن ومضمون' },
            ].map((f) => (
              <View key={f.text} style={s.featureItem}>
                <View style={s.featureIcon}>
                  <Feather name={f.icon as any} size={14} color={C.gold} />
                </View>
                <Text style={s.featureTxt}>{f.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24 },
  // ─── Hero ───
  hero: { alignItems: 'center', marginBottom: 36 },
  heroIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: C.gold + '18',
    borderWidth: 2, borderColor: C.gold + '40',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  brandRiden: { fontSize: 38, fontWeight: '900', color: C.white, letterSpacing: 6 },
  captainBadge: {
    backgroundColor: C.gold, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  captainBadgeTxt: { fontSize: 11, fontWeight: '800', color: '#0A0F1E', letterSpacing: 2 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: C.white, marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: 14, color: C.gray, textAlign: 'center' },
  // ─── الفورم ───
  form: {
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 24, gap: 16, marginBottom: 24,
  },
  formTitle: { fontSize: 20, fontWeight: '800', color: C.white, textAlign: 'right', marginBottom: 4 },
  errorBox: {
    backgroundColor: '#7F1D1D30', borderWidth: 1, borderColor: C.red + '60',
    borderRadius: 10, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  errorTxt: { flex: 1, color: C.red, fontSize: 13, textAlign: 'right' },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: C.gray, textAlign: 'right' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingRight: 14,
  },
  input: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: C.white,
  },
  inputIcon: { marginLeft: 4 },
  eyeBtn: { padding: 4 },
  btn: {
    backgroundColor: C.gold, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: C.gold, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10,
    elevation: 8,
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnTxt: { fontSize: 17, fontWeight: '800', color: '#0A0F1E' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divTxt: { fontSize: 13, color: C.gray },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.gold + '60', borderRadius: 14,
    paddingVertical: 14, backgroundColor: C.gold + '08',
  },
  registerBtnTxt: { fontSize: 15, fontWeight: '600', color: C.gold },
  // ─── الميزات ───
  features: { gap: 12 },
  featureItem: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  featureIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.gold + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  featureTxt: { flex: 1, fontSize: 14, color: C.white, textAlign: 'right', fontWeight: '500' },
});
