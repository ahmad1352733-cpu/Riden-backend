import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Platform, Modal,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRegisterPassenger } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TERMS_TEXT = `شروط الاستخدام وسياسة الخصوصية

باستخدامك لتطبيق RIDEN، فإنك توافق على الشروط التالية:

١. مسؤولية المستخدم
يتحمل المستخدم (راكب أو كابتن) المسؤولية الكاملة عن تصرفاته أثناء استخدام الخدمة.

٢. إخلاء المسؤولية الأمنية
شركة RIDEN غير مسؤولة عن أي حوادث جنائية أو أمنية تقع بين أطراف الرحلة. تلتزم الشركة فقط بتقديم المعلومات والبيانات المتاحة للجهات الأمنية والمعنية عند الطلب الرسمي.

٣. خصوصية البيانات
يتم جمع بياناتك (الاسم، الهاتف، الموقع) لتقديم الخدمة فقط، ولا تُشارك إلا مع الطرف الآخر في الرحلة والجهات الأمنية عند الحاجة.

٤. جودة الخدمة
تسعى RIDEN لضمان جودة الخدمة لكنها لا تضمن توفر كابتن في جميع الأوقات.

٥. الدفع
الأسعار محددة وفق تعريفة الشركة وقد تتغير. يُصدر الكابتن الفاتورة النهائية عند انتهاء الرحلة.

بالضغط على "موافق"، تؤكد قراءتك وموافقتك على هذه الشروط.`;

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState('');

  const registerMutation = useRegisterPassenger({
    mutation: {
      onSuccess: async (data) => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await login(data.token, data.user as any);
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const msg = err?.response?.data?.error;
        setError(msg === 'Email already registered' ? 'البريد الإلكتروني مسجل مسبقاً' : 'حدث خطأ، حاول مجدداً');
      },
    },
  });

  const handleRegister = () => {
    setError('');
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول'); return;
    }
    if (!termsAccepted) {
      setError('يجب الموافقة على الشروط والأحكام'); return;
    }
    registerMutation.mutate({ data: { name: name.trim(), phone: phone.trim(), email: email.trim(), password } });
  };

  const s = styles(colors, insets);

  return (
    <View style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <View style={s.logoCircle}><Text style={s.logoR}>R</Text></View>
            <Text style={s.brand}>RIDEN</Text>
            <Text style={s.tagline}>إنشاء حساب جديد</Text>
          </View>

          <View style={s.card}>
            <Text style={s.heading}>بياناتك الشخصية</Text>
            {!!error && <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View>}

            {[
              { label: 'الاسم الكامل', value: name, set: setName, placeholder: 'أحمد محمد', keyboard: 'default' as const },
              { label: 'رقم الهاتف', value: phone, set: setPhone, placeholder: '07xxxxxxxx', keyboard: 'phone-pad' as const },
              { label: 'البريد الإلكتروني', value: email, set: setEmail, placeholder: 'example@email.com', keyboard: 'email-address' as const },
              { label: 'كلمة المرور', value: password, set: setPassword, placeholder: '••••••••', keyboard: 'default' as const, secure: true },
            ].map(({ label, value, set, placeholder, keyboard, secure }) => (
              <View key={label}>
                <Text style={s.label}>{label}</Text>
                <TextInput style={s.input} value={value} onChangeText={set}
                  placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
                  keyboardType={keyboard} secureTextEntry={secure} autoCapitalize="none" textAlign="right" />
              </View>
            ))}

            {/* Terms */}
            <TouchableOpacity style={s.termsRow} onPress={() => setTermsAccepted(v => !v)}>
              <View style={[s.checkbox, termsAccepted && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {termsAccepted && <Feather name="check" size={12} color="#000" />}
              </View>
              <Text style={s.termsTxt}>
                أوافق على{' '}
                <Text style={s.termsLink} onPress={() => setShowTerms(true)}>الشروط والأحكام وسياسة الخصوصية</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.btn, registerMutation.isPending && { opacity: 0.6 }]}
              onPress={handleRegister} disabled={registerMutation.isPending} activeOpacity={0.85}>
              {registerMutation.isPending
                ? <ActivityIndicator color={colors.primaryForeground} />
                : <Text style={s.btnTxt}>إنشاء الحساب</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.switchTxt}>لديك حساب؟ <Text style={s.switchLink}>تسجيل الدخول</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms Modal */}
      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>الشروط والأحكام</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              <Text style={s.termsFull}>{TERMS_TEXT}</Text>
            </ScrollView>
            <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={() => { setTermsAccepted(true); setShowTerms(false); }}>
              <Text style={s.btnTxt}>موافق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c: ReturnType<typeof useColors>, insets: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  logoR: { fontSize: 30, fontFamily: 'Inter_700Bold', color: c.primaryForeground },
  brand: { fontSize: 26, fontFamily: 'Inter_700Bold', color: c.foreground, letterSpacing: 5 },
  tagline: { fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginTop: 4 },
  card: { backgroundColor: c.card, borderRadius: c.radius, padding: 24, borderWidth: 1, borderColor: c.border },
  heading: { fontSize: 20, fontFamily: 'Inter_700Bold', color: c.foreground, marginBottom: 20, textAlign: 'right' },
  errorBox: { backgroundColor: '#3D1515', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: c.destructive },
  errorTxt: { color: c.destructive, fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.mutedForeground, marginBottom: 6, textAlign: 'right' },
  input: { backgroundColor: c.input, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, color: c.foreground, fontSize: 15, fontFamily: 'Inter_400Regular', marginBottom: 14 },
  termsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  termsTxt: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'right' },
  termsLink: { color: c.primary, fontFamily: 'Inter_600SemiBold' },
  btn: { backgroundColor: c.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16, shadowColor: c.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnTxt: { fontSize: 16, fontFamily: 'Inter_700Bold', color: c.primaryForeground },
  switchTxt: { textAlign: 'center', fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  switchLink: { color: c.primary, fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', color: c.foreground },
  termsFull: { fontSize: 14, fontFamily: 'Inter_400Regular', color: c.mutedForeground, lineHeight: 24, textAlign: 'right' },
});
