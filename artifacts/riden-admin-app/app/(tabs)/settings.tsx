import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Platform, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

I18nManager.forceRTL(true);

interface Settings {
  base_fare: string;
  per_km_rate: string;
  per_min_rate: string;
  free_km: string;
  commission_rate: string;
}

const SETTING_LABELS: Record<keyof Settings, { label: string; hint: string; suffix: string }> = {
  base_fare: { label: 'الأجرة الأساسية', hint: 'أجرة أول 2 كم', suffix: 'د.أ' },
  per_km_rate: { label: 'سعر الكيلومتر', hint: 'بعد المسافة المجانية', suffix: 'د.أ/كم' },
  per_min_rate: { label: 'سعر الدقيقة', hint: 'بعد المسافة المجانية', suffix: 'د.أ/دقيقة' },
  free_km: { label: 'المسافة المجانية', hint: 'كيلومترات مشمولة في الأجرة الأساسية', suffix: 'كم' },
  commission_rate: { label: 'نسبة العمولة', hint: 'نسبة عمولة الشركة من الأجرة (0-1)', suffix: '%' },
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [settings, setSettings] = useState<Settings>({
    base_fare: '1.00',
    per_km_rate: '0.25',
    per_min_rate: '0.05',
    free_km: '2.0',
    commission_rate: '0.10',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const t = await AsyncStorage.getItem('riden_admin_token');
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      // data might be { settings: [...] } or direct object
      const settingsData = data.settings ?? data;
      if (Array.isArray(settingsData)) {
        const parsed: Partial<Settings> = {};
        settingsData.forEach((s: any) => {
          if (s.key in settings) (parsed as any)[s.key] = String(s.value);
        });
        setSettings(prev => ({ ...prev, ...parsed }));
      } else if (typeof settingsData === 'object') {
        const parsed: Partial<Settings> = {};
        Object.entries(settingsData).forEach(([k, v]) => {
          if (k in settings) (parsed as any)[k] = String(v);
        });
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    const body: Record<string, number> = {};
    for (const [k, v] of Object.entries(settings)) {
      const n = parseFloat(v);
      if (isNaN(n) || n < 0) {
        Alert.alert('خطأ', `قيمة "${SETTING_LABELS[k as keyof Settings].label}" غير صحيحة`);
        return;
      }
      body[k] = n;
    }

    try {
      setIsSaving(true);
      const t = await AsyncStorage.getItem('riden_admin_token');
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      Alert.alert('تم', 'تم حفظ الإعدادات بنجاح ✓');
    } catch {
      Alert.alert('خطأ', 'فشل حفظ الإعدادات');
    } finally {
      setIsSaving(false);
    }
  };

  const s = styles(colors);

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.headerTitle}>إعدادات التسعير</Text>
        <Text style={s.headerSub}>تحكم في أسعار الرحلات والعمولات</Text>
      </View>

      {/* Fare Preview */}
      <View style={s.previewCard}>
        <Feather name="info" size={16} color={colors.primary} />
        <Text style={s.previewText}>
          مثال على الرحلة: أول {settings.free_km} كم = {settings.base_fare} د.أ، ثم {settings.per_km_rate} د.أ/كم + {settings.per_min_rate} د.أ/دقيقة. عمولة {(parseFloat(settings.commission_rate) * 100 || 10).toFixed(0)}%
        </Text>
      </View>

      <View style={s.form}>
        {(Object.keys(SETTING_LABELS) as (keyof Settings)[]).map(key => {
          const { label, hint, suffix } = SETTING_LABELS[key];
          const displayValue = key === 'commission_rate'
            ? String(Math.round(parseFloat(settings[key]) * 100) || '')
            : settings[key];

          return (
            <View key={key} style={s.fieldCard}>
              <View style={s.fieldHeader}>
                <Text style={s.fieldHint}>{hint}</Text>
                <Text style={s.fieldLabel}>{label}</Text>
              </View>
              <View style={s.inputRow}>
                <Text style={s.inputSuffix}>{key === 'commission_rate' ? '%' : suffix}</Text>
                <TextInput
                  style={s.input}
                  value={key === 'commission_rate' ? displayValue : settings[key]}
                  onChangeText={v => {
                    if (key === 'commission_rate') {
                      // Store as decimal (10% → 0.10)
                      const pct = parseFloat(v);
                      setSettings(prev => ({
                        ...prev,
                        commission_rate: isNaN(pct) ? '0' : String(pct / 100),
                      }));
                    } else {
                      setSettings(prev => ({ ...prev, [key]: v }));
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
              </View>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[s.saveBtn, isSaving && { opacity: 0.6 }]}
        onPress={saveSettings}
        disabled={isSaving}
      >
        {isSaving
          ? <ActivityIndicator color={colors.primaryForeground} />
          : <>
              <Feather name="save" size={18} color={colors.primaryForeground} />
              <Text style={s.saveBtnText}>حفظ الإعدادات</Text>
            </>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.foreground, textAlign: 'right' },
  headerSub: { fontSize: 13, color: colors.mutedForeground, textAlign: 'right', marginTop: 2 },
  previewCard: {
    margin: 16, padding: 14, borderRadius: 14,
    backgroundColor: colors.primary + '15',
    borderWidth: 1, borderColor: colors.primary + '40',
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
  },
  previewText: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 20, textAlign: 'right' },
  form: { paddingHorizontal: 16, gap: 12 },
  fieldCard: {
    backgroundColor: colors.card, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  fieldHeader: { alignItems: 'flex-end' },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  fieldHint: { fontSize: 11, color: colors.mutedForeground },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: colors.radius, paddingHorizontal: 12,
  },
  inputSuffix: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600', minWidth: 40, textAlign: 'center' },
  input: { flex: 1, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: colors.primary },
  saveBtn: {
    margin: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
});
