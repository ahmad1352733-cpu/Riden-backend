import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRegisterCaptain } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';

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
  fontSize: 14, color: WHITE,
};
const LBL: any = {
  fontSize: 10, color: GRAY, fontWeight: '600',
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
};

export default function CaptainRegisterScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '',
    licenseNumber: '', vehicleMake: '', vehicleModel: '',
    vehiclePlate: '', vehicleYear: '', vehicleColor: '',
  });
  const [error, setError] = useState('');

  const set = (field: keyof typeof form) => (v: string) => {
    setForm(p => ({ ...p, [field]: v }));
    setError('');
  };

  const registerMutation = useRegisterCaptain({
    mutation: {
      onSuccess: async (data) => {
        // Save token + user (isApproved will be false → _layout routes to /pending)
        await login(data.token, data.user as any);
        router.replace('/');
      },
      onError: (err: any) => {
        setError(err?.response?.data?.error || 'Registration failed');
      },
    },
  });

  const handleSubmit = () => {
    const required = ['name','phone','email','password','licenseNumber','vehicleMake','vehicleModel','vehiclePlate','vehicleYear','vehicleColor'];
    if (required.some(k => !(form as any)[k]?.trim())) {
      setError('All fields are required'); return;
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
          {/* ── Branding ── */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <Text style={s.brand}>RIDEN</Text>
            <Text style={s.sub}>Captain Registration</Text>
          </View>

          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorTxt}>{error}</Text>
            </View>
          )}

          {/* ── Personal Info ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Personal Information</Text>
            <View style={{ gap: 10 }}>
              <View><Text style={LBL}>Full Name</Text><TextInput style={INP} value={form.name} onChangeText={set('name')} placeholder="Ahmad Al-Rashidi" placeholderTextColor={GRAY} autoCapitalize="words" /></View>
              <View><Text style={LBL}>Phone</Text><TextInput style={INP} value={form.phone} onChangeText={set('phone')} placeholder="+962791234567" placeholderTextColor={GRAY} keyboardType="phone-pad" /></View>
              <View><Text style={LBL}>Email</Text><TextInput style={INP} value={form.email} onChangeText={set('email')} placeholder="captain@example.com" placeholderTextColor={GRAY} keyboardType="email-address" autoCapitalize="none" /></View>
              <View><Text style={LBL}>Password</Text><TextInput style={INP} value={form.password} onChangeText={set('password')} placeholder="••••••••" placeholderTextColor={GRAY} secureTextEntry /></View>
            </View>
          </View>

          {/* ── Vehicle & License ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Vehicle & License</Text>
            <View style={{ gap: 10 }}>
              <View><Text style={LBL}>License Number</Text><TextInput style={INP} value={form.licenseNumber} onChangeText={set('licenseNumber')} placeholder="JO-1234567" placeholderTextColor={GRAY} autoCapitalize="characters" /></View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Text style={LBL}>Make</Text><TextInput style={INP} value={form.vehicleMake} onChangeText={set('vehicleMake')} placeholder="Toyota" placeholderTextColor={GRAY} autoCapitalize="words" /></View>
                <View style={{ flex: 1 }}><Text style={LBL}>Model</Text><TextInput style={INP} value={form.vehicleModel} onChangeText={set('vehicleModel')} placeholder="Camry" placeholderTextColor={GRAY} autoCapitalize="words" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Text style={LBL}>Plate</Text><TextInput style={INP} value={form.vehiclePlate} onChangeText={set('vehiclePlate')} placeholder="ABC-1234" placeholderTextColor={GRAY} autoCapitalize="characters" /></View>
                <View style={{ flex: 1 }}><Text style={LBL}>Year</Text><TextInput style={INP} value={form.vehicleYear} onChangeText={set('vehicleYear')} placeholder="2020" placeholderTextColor={GRAY} keyboardType="number-pad" /></View>
              </View>
              <View><Text style={LBL}>Color</Text><TextInput style={INP} value={form.vehicleColor} onChangeText={set('vehicleColor')} placeholder="White" placeholderTextColor={GRAY} autoCapitalize="words" /></View>
            </View>
          </View>

          <TouchableOpacity
            style={[s.btn, registerMutation.isPending && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={registerMutation.isPending}
            activeOpacity={0.85}
          >
            {registerMutation.isPending
              ? <ActivityIndicator color={WHITE} />
              : <Text style={s.btnTxt}>Register as Captain</Text>}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
            <Text style={{ color: GRAY, fontSize: 14 }}>Already registered? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={{ color: GREEN, fontSize: 14, fontWeight: '500' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: BG },
  scroll:       { paddingHorizontal: 20 },
  brand:        { fontSize: 40, fontWeight: '900', color: WHITE, letterSpacing: 2 },
  sub:          { fontSize: 13, fontWeight: '600', color: GREEN, letterSpacing: 4, textTransform: 'uppercase', marginTop: 4 },
  errorBox:     { backgroundColor: RED + '25', borderWidth: 1, borderColor: RED + '60', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorTxt:     { color: RED, fontSize: 13 },
  section:      { backgroundColor: 'rgba(26,45,68,0.6)', borderRadius: 20, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: WHITE, marginBottom: 12 },
  btn:          {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnTxt:       { fontSize: 16, fontWeight: '700', color: WHITE },
});
