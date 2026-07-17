import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(data.token, data.user as any);
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      },
    },
  });

  const handleLogin = () => {
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    loginMutation.mutate({ data: { email: email.trim(), password } });
  };

  const s = styles(colors, insets);

  return (
    <View style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoCircle}>
              <Text style={s.logoR}>R</Text>
            </View>
            <Text style={s.brand}>RIDEN</Text>
            <Text style={s.tagline}>رحلتك، طريقك</Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            <Text style={s.heading}>مرحباً بعودتك</Text>
            {!!error && <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View>}

            <Text style={s.label}>البريد الإلكتروني</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail}
              placeholder="example@email.com" placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address" autoCapitalize="none" textAlign="right" />

            <Text style={s.label}>كلمة المرور</Text>
            <TextInput style={s.input} value={password} onChangeText={setPassword}
              placeholder="••••••••" placeholderTextColor={colors.mutedForeground}
              secureTextEntry textAlign="right" />

            <TouchableOpacity style={[s.btn, loginMutation.isPending && { opacity: 0.6 }]}
              onPress={handleLogin} disabled={loginMutation.isPending} activeOpacity={0.85}>
              {loginMutation.isPending
                ? <ActivityIndicator color={colors.primaryForeground} />
                : <Text style={s.btnTxt}>تسجيل الدخول</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={s.switchTxt}>ليس لديك حساب؟ <Text style={s.switchLink}>إنشاء حساب</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: c.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
  logoR: { fontSize: 38, fontFamily: 'Inter_700Bold', color: c.primaryForeground },
  brand: { fontSize: 32, fontFamily: 'Inter_700Bold', color: c.foreground, letterSpacing: 6 },
  tagline: { fontSize: 14, fontFamily: 'Inter_500Medium', color: c.primary, marginTop: 4 },
  card: { backgroundColor: c.card, borderRadius: c.radius, padding: 24, borderWidth: 1, borderColor: c.border },
  heading: { fontSize: 22, fontFamily: 'Inter_700Bold', color: c.foreground, marginBottom: 20, textAlign: 'right' },
  errorBox: { backgroundColor: '#3D1515', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: c.destructive },
  errorTxt: { color: c.destructive, fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.mutedForeground, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: c.input, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 14, color: c.foreground, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 16 },
  btn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 20, shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: c.primaryForeground },
  switchTxt: { textAlign: 'center', fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  switchLink: { color: c.primary, fontFamily: 'Inter_600SemiBold' },
});
