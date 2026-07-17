import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, I18nManager,
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
        if (data.user.role !== 'admin') {
          Alert.alert('خطأ', 'هذا الحساب ليس حساب مسؤول');
          return;
        }
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: () => Alert.alert('خطأ', 'البريد الإلكتروني أو كلمة المرور غير صحيحة'),
    },
  });

  const s = styles(colors);

  return (
    <KeyboardAvoidingView
      style={[s.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[s.container, {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 60),
          paddingBottom: insets.bottom + 24,
        }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Feather name="shield" size={36} color={colors.primary} />
          </View>
          <Text style={s.logoText}>RIDEN</Text>
          <Text style={s.logoSub}>لوحة الإدارة</Text>
        </View>

        <Text style={s.title}>دخول المسؤول</Text>

        <View style={s.form}>
          <View style={s.fieldWrap}>
            <Text style={s.label}>البريد الإلكتروني</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@riden.jo"
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
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 8 }}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[s.btn, loginMutation.isPending && { opacity: 0.6 }]}
            onPress={() => {
              if (!email.trim() || !password) { Alert.alert('خطأ', 'أدخل جميع الحقول'); return; }
              loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
            }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending
              ? <ActivityIndicator color={colors.primaryForeground} />
              : <Text style={s.btnText}>دخول</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 28, alignItems: 'stretch' },
  logoWrap: { alignItems: 'center', marginBottom: 44 },
  logoCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 30, fontWeight: '800', color: colors.primary, letterSpacing: 3 },
  logoSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
  title: { fontSize: 22, fontWeight: '700', color: colors.foreground, textAlign: 'center', marginBottom: 28 },
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
  btn: {
    backgroundColor: colors.primary, borderRadius: colors.radius,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
});
