import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, Modal, I18nManager, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useRegisterCaptain } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

const TERMS_TEXT = `شروط وأحكام استخدام تطبيق RIDEN للكباتن

١. المسؤولية: الكابتن مسؤول بالكامل عن سلامة الركاب خلال الرحلة وعن صيانة المركبة.

٢. العمولة: تحتجز الشركة عمولة 10% من قيمة كل رحلة تلقائياً.

٣. الموافقة على المراقبة: يوافق الكابتن على مشاركة موقعه الجغرافي خلال ساعات العمل. لا تتحمل الشركة مسؤولية أي حوادث أمنية ناجمة عن سوء استخدام البيانات.

٤. التعاون مع السلطات: تلتزم الشركة بالتعاون مع الجهات القانونية والأمنية في المملكة الأردنية الهاشمية عند الضرورة، وقد يُشارك سجل رحلاتك وبياناتك مع هذه الجهات.

٥. التحقق: يجب أن تكون جميع المعلومات المقدمة حقيقية وصحيحة. يحق للشركة إنهاء الحساب فوراً في حال اكتشاف أي معلومات مزيفة.

٦. القانون المطبق: تخضع هذه الاتفاقية لقوانين المملكة الأردنية الهاشمية.`;

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const registerMutation = useRegisterCaptain({
    mutation: {
      onSuccess: async (data) => {
        await login(data.token, data.user as any);
        router.replace('/(tabs)');
      },
      onError: (err: any) => {
        Alert.alert('خطأ', err?.message || 'فشل التسجيل. تأكد من البيانات.');
      },
    },
  });

  const handleRegister = () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password || !licenseNumber.trim()
      || !vehicleMake.trim() || !vehicleModel.trim() || !vehicleYear || !vehicleColor.trim() || !vehiclePlate.trim()) {
      Alert.alert('خطأ', 'يرجى تعبئة جميع الحقول');
      return;
    }
    const year = parseInt(vehicleYear);
    if (isNaN(year) || year < 1990 || year > new Date().getFullYear() + 1) {
      Alert.alert('خطأ', 'سنة المركبة غير صحيحة');
      return;
    }
    if (!termsAccepted) {
      Alert.alert('يجب الموافقة', 'يرجى قراءة والموافقة على الشروط والأحكام');
      return;
    }
    registerMutation.mutate({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password,
        licenseNumber: licenseNumber.trim(),
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: year,
        vehicleColor: vehicleColor.trim(),
        vehiclePlate: vehiclePlate.trim(),
      },
    });
  };

  const s = styles(colors);

  return (
    <>
      <ScrollView
        style={[s.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[s.container, {
          paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 24),
          paddingBottom: insets.bottom + 40,
        }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={s.title}>إنشاء حساب كابتن</Text>
        <Text style={s.subtitle}>انضم إلى أسطول RIDEN</Text>

        {/* Personal Info */}
        <Text style={s.sectionHeader}>المعلومات الشخصية</Text>
        <View style={s.form}>
          <Field label="الاسم الكامل" value={name} onChangeText={setName} placeholder="محمد أحمد" colors={colors} />
          <Field label="رقم الهاتف" value={phone} onChangeText={setPhone} placeholder="07xxxxxxxx" keyboardType="phone-pad" colors={colors} />
          <Field label="البريد الإلكتروني" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" colors={colors} />
          <View style={s.fieldWrap}>
            <Text style={s.label}>كلمة المرور</Text>
            <View style={s.passWrap}>
              <TextInput
                style={[s.input, { flex: 1, borderWidth: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="6 أحرف على الأقل"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPass}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
          <Field label="رقم رخصة القيادة" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="1234567" colors={colors} />
        </View>

        {/* Vehicle Info */}
        <Text style={s.sectionHeader}>معلومات المركبة</Text>
        <View style={s.form}>
          <Field label="الماركة" value={vehicleMake} onChangeText={setVehicleMake} placeholder="Toyota" autoCapitalize="words" colors={colors} />
          <Field label="الموديل" value={vehicleModel} onChangeText={setVehicleModel} placeholder="Camry" autoCapitalize="words" colors={colors} />
          <Field label="سنة الصنع" value={vehicleYear} onChangeText={setVehicleYear} placeholder="2020" keyboardType="number-pad" colors={colors} />
          <Field label="اللون" value={vehicleColor} onChangeText={setVehicleColor} placeholder="أبيض" colors={colors} />
          <Field label="رقم اللوحة" value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="أ ب ج 1234" autoCapitalize="characters" colors={colors} />
        </View>

        {/* Terms */}
        <TouchableOpacity style={s.termsRow} onPress={() => setTermsAccepted(!termsAccepted)}>
          <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
            {termsAccepted && <Feather name="check" size={14} color={colors.primaryForeground} />}
          </View>
          <Text style={s.termsText}>
            أوافق على{' '}
            <Text style={s.termsLink} onPress={() => setShowTerms(true)}>الشروط والأحكام</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.btn, registerMutation.isPending && s.btnDisabled]}
          onPress={handleRegister}
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending
            ? <ActivityIndicator color={colors.primaryForeground} />
            : <Text style={s.btnText}>تسجيل وإرسال طلب الانضمام</Text>}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>لديك حساب؟ </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>تسجيل الدخول</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Terms Modal */}
      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>الشروط والأحكام</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.termsScroll}>
              <Text style={s.termsContent}>{TERMS_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity style={s.btn} onPress={() => { setTermsAccepted(true); setShowTerms(false); }}>
              <Text style={s.btnText}>أوافق على الشروط</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, autoCapitalize, colors,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; autoCapitalize?: any;
  colors: ReturnType<typeof useColors>;
}) {
  const s = styles(colors);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        textAlign="right"
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    flex: { flex: 1 },
    container: { paddingHorizontal: 24 },
    backBtn: { marginBottom: 24, alignSelf: 'flex-end' },
    title: { fontSize: 26, fontWeight: '800', color: colors.foreground, textAlign: 'center', marginBottom: 6 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 28 },
    sectionHeader: {
      fontSize: 13, fontWeight: '700', color: colors.primary, textAlign: 'right',
      marginTop: 24, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1,
    },
    form: { gap: 14 },
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
    termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 4, justifyContent: 'flex-end' },
    checkbox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
    termsText: { color: colors.foreground, fontSize: 14, textAlign: 'right' },
    termsLink: { color: colors.primary, fontWeight: '600' },
    btn: {
      backgroundColor: colors.primary, borderRadius: colors.radius,
      paddingVertical: 15, alignItems: 'center', marginTop: 20,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
    footerText: { color: colors.mutedForeground, fontSize: 14 },
    link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalBox: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      maxHeight: '80%', padding: 24, gap: 16,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
    termsScroll: { maxHeight: 360 },
    termsContent: { fontSize: 14, color: colors.mutedForeground, lineHeight: 24, textAlign: 'right' },
  });
