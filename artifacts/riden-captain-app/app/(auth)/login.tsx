import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, I18nManager,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        if (data.user.role !== 'captain') {
          Alert.alert('خطأ', 'هذا الحساب ليس حساب كابتن');
          return;
        }
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: () => Alert.alert('خطأ', 'البريد الإلكتروني أو كلمة المرور غير صحيحة'),
    },
  });

  const handleLogin = () => {
    if (!email.trim() || !password) {
      Alert.alert('خطأ', 'يرجى إدخال جميع الحقول');
      return;
    }
    loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={[s.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Feather name="navigation" size={36} color={colors.primary} />
          </View>
          <Text style={s.logoText}>RIDEN</Text>
          <Text style={s.logoSub}>بوابة الكباتن</Text>
        </View>

        <Text style={s.title}>تسجيل الدخول</Text>
        <Text style={s.subtitle}>مرحبًا بك مجددًا، الكابتن!</Text>

        <View style={s.form}>
          <View style={s.fieldWrap}>
            <Text style={s.label}>البريد الإلكتروني</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign="right"
            />
          </View>

          <View style={s.fieldWrap}>
            <Text style={s.label}>كلمة المرور</Text>
            <View style={s.passWrap}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, loginMutation.isPending && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending
              ? <ActivityIndicator color={colors.primaryForeground} />
              : <Text style={s.btnText}>دخول</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>ليس لديك حساب؟ </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={s.link}>سجّل كابتن</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { paddingHorizontal: 24, alignItems: 'stretch' },
    logoWrap: { alignItems: 'center', marginBottom: 40 },
    logoCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.card,
      borderWidth: 2, borderColor: colors.primary,
      alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    },
    logoText: { fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: 3 },
    logoSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
    title: { fontSize: 24, fontWeight: '700', color: colors.foreground, textAlign: 'center', marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 32 },
    form: { gap: 16 },
    fieldWrap: { gap: 6 },
    label: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 13,
      fontSize: 15, color: colors.foreground,
    },
    passWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: colors.radius, paddingRight: 8,
    },
    eyeBtn: { padding: 8 },
    btn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      paddingVertical: 15, alignItems: 'center', marginTop: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
    footerText: { color: colors.mutedForeground, fontSize: 14 },
    link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  });
