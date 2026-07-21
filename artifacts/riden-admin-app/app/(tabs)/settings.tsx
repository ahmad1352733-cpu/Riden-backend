import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Platform,
  Modal, FlatList, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useGetAdminRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute,
  useGetAdminDiscountCodes, useCreateDiscountCode, useDeleteDiscountCode,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

type Section = 'pricing' | 'routes' | 'discounts';

interface PricingSettings {
  base_fare: string; per_km_rate: string; per_min_rate: string;
  free_km: string; commission_rate: string;
}

const PRICING_FIELDS: { key: keyof PricingSettings; label: string; hint: string; suffix: string }[] = [
  { key: 'base_fare',       label: 'الأجرة الأساسية',   hint: `تشمل أول X كم مجاناً`, suffix: 'د.أ' },
  { key: 'free_km',         label: 'المسافة المجانية',   hint: 'كيلومترات مشمولة في الأجرة الأساسية', suffix: 'كم' },
  { key: 'per_km_rate',     label: 'سعر الكيلومتر',     hint: 'بعد المسافة المجانية', suffix: 'د.أ/كم' },
  { key: 'per_min_rate',    label: 'سعر الدقيقة',       hint: 'بعد المسافة المجانية', suffix: 'د.أ/د' },
  { key: 'commission_rate', label: 'عمولة الشركة',      hint: 'النسبة المئوية من الأجرة (مثال: 10)', suffix: '%' },
];

export default function SettingsScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { token } = useAuth();
  const qc        = useQueryClient();

  const [section, setSection] = useState<Section>('pricing');

  // ──── التسعير ────────────────────────────────────────────────────────────
  const [pricing, setPricing] = useState<PricingSettings>({
    base_fare: '1.00', per_km_rate: '0.25', per_min_rate: '0.05',
    free_km: '2.0', commission_rate: '10',
  });
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSaving,  setPricingSaving]  = useState(false);

  const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? 'riden-api-production.up.railway.app'}`;

  useEffect(() => {
    (async () => {
      try {
        setPricingLoading(true);
        const t   = await AsyncStorage.getItem('riden_admin_token');
        const res = await fetch(`${baseUrl}/api/admin/settings`, { headers: { Authorization: `Bearer ${t}` } });
        if (!res.ok) return;
        const data = await res.json();
        const src  = Array.isArray(data.settings ?? data) ? (data.settings ?? data) : null;
        if (src) {
          const parsed: Partial<PricingSettings> = {};
          src.forEach((s: any) => {
            if (s.key === 'commission_rate') (parsed as any)[s.key] = String(Math.round(parseFloat(s.value) * 100));
            else if (s.key in pricing)       (parsed as any)[s.key] = String(s.value);
          });
          setPricing(p => ({ ...p, ...parsed }));
        } else {
          const obj = typeof (data.settings ?? data) === 'object' ? (data.settings ?? data) : null;
          if (obj) {
            const parsed: Partial<PricingSettings> = {};
            Object.entries(obj).forEach(([k, v]) => {
              if (k === 'commission_rate') (parsed as any)[k] = String(Math.round(parseFloat(String(v)) * 100));
              else if (k in pricing)       (parsed as any)[k] = String(v);
            });
            setPricing(p => ({ ...p, ...parsed }));
          }
        }
      } catch { /* use defaults */ } finally { setPricingLoading(false); }
    })();
  }, []);

  const savePricing = async () => {
    const body: Record<string, number> = {};
    for (const [k, v] of Object.entries(pricing)) {
      const n = parseFloat(v);
      if (isNaN(n) || n < 0) { Alert.alert('خطأ', `قيمة غير صحيحة في الحقل`); return; }
      body[k] = k === 'commission_rate' ? n / 100 : n;
    }
    try {
      setPricingSaving(true);
      const t   = await AsyncStorage.getItem('riden_admin_token');
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      Alert.alert('✓ تم', 'تم حفظ إعدادات التسعير');
    } catch { Alert.alert('خطأ', 'فشل حفظ الإعدادات'); }
    finally { setPricingSaving(false); }
  };

  // ──── المسارات ────────────────────────────────────────────────────────────
  const { data: routes, isLoading: routesLoading, refetch: refetchRoutes } = useGetAdminRoutes({
    query: { enabled: !!token && section === 'routes' },
  });

  const createRouteMutation = useCreateRoute({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['getAdminRoutes'] }); setRouteModal(false); resetRouteForm(); Alert.alert('✓ تم', 'تم إنشاء المسار'); },
      onError:   () => Alert.alert('خطأ', 'فشل إنشاء المسار'),
    },
  });
  const updateRouteMutation = useUpdateRoute({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['getAdminRoutes'] }); },
      onError:   () => Alert.alert('خطأ', 'فشل التحديث'),
    },
  });
  const deleteRouteMutation = useDeleteRoute({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['getAdminRoutes'] }); Alert.alert('✓ تم', 'تم حذف المسار'); },
      onError:   () => Alert.alert('خطأ', 'فشل الحذف'),
    },
  });

  const [routeModal,   setRouteModal]   = useState(false);
  const [routeName,    setRouteName]    = useState('');
  const [routePickup,  setRoutePickup]  = useState('');
  const [routeDropoff, setRouteDropoff] = useState('');
  const [routeDesc,    setRouteDesc]    = useState('');
  const resetRouteForm = () => { setRouteName(''); setRoutePickup(''); setRouteDropoff(''); setRouteDesc(''); };

  const handleSaveRoute = () => {
    if (!routeName.trim() || !routePickup.trim() || !routeDropoff.trim()) {
      Alert.alert('خطأ', 'الاسم ومنطقة الانطلاق والوجهة مطلوبة'); return;
    }
    createRouteMutation.mutate({ data: { name: routeName.trim(), pickupArea: routePickup.trim(), dropoffArea: routeDropoff.trim(), description: routeDesc.trim() || undefined } });
  };

  const handleDeleteRoute = (id: number, name: string) => {
    Alert.alert('حذف المسار', `هل تريد حذف "${name}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteRouteMutation.mutate({ id }) },
    ]);
  };

  // ──── كودات الخصم ─────────────────────────────────────────────────────────
  const { data: discounts, isLoading: discountsLoading, refetch: refetchDiscounts } = useGetAdminDiscountCodes({
    query: { enabled: !!token && section === 'discounts' },
  });

  const createDiscountMutation = useCreateDiscountCode({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['getAdminDiscountCodes'] }); setDiscountModal(false); resetDiscountForm(); Alert.alert('✓ تم', 'تم إنشاء كود الخصم'); },
      onError:   () => Alert.alert('خطأ', 'فشل إنشاء الكود، ربما الكود مكرر'),
    },
  });
  const deleteDiscountMutation = useDeleteDiscountCode({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['getAdminDiscountCodes'] }); Alert.alert('✓ تم', 'تم حذف الكود'); },
      onError:   () => Alert.alert('خطأ', 'فشل الحذف'),
    },
  });

  const [discountModal,    setDiscountModal]    = useState(false);
  const [discCode,         setDiscCode]         = useState('');
  const [discPercent,      setDiscPercent]       = useState('');
  const [discMaxUses,      setDiscMaxUses]       = useState('');
  const [discExpiry,       setDiscExpiry]        = useState('');
  const resetDiscountForm = () => { setDiscCode(''); setDiscPercent(''); setDiscMaxUses(''); setDiscExpiry(''); };

  const handleSaveDiscount = () => {
    const pct  = parseFloat(discPercent);
    const uses = parseInt(discMaxUses);
    if (!discCode.trim() || isNaN(pct) || pct < 1 || pct > 100 || isNaN(uses) || uses < 1) {
      Alert.alert('خطأ', 'تأكد من الكود ونسبة الخصم وعدد الاستخدامات'); return;
    }
    createDiscountMutation.mutate({
      data: {
        code: discCode.trim().toUpperCase(),
        discountPercent: pct,
        maxUses: uses,
        expiresAt: discExpiry.trim() || undefined,
      },
    });
  };

  const handleDeleteDiscount = (id: number, code: string) => {
    Alert.alert('حذف الكود', `هل تريد حذف "${code}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => deleteDiscountMutation.mutate({ id }) },
    ]);
  };

  const s = styles(colors);

  // ──── مثال الأجرة ─────────────────────────────────────────────────────────
  const base    = parseFloat(pricing.base_fare)    || 1;
  const freeKm  = parseFloat(pricing.free_km)      || 2;
  const perKm   = parseFloat(pricing.per_km_rate)  || 0.25;
  const perMin  = parseFloat(pricing.per_min_rate) || 0.05;
  const comm    = parseFloat(pricing.commission_rate) || 10;
  const ex5km   = (base + (5 - freeKm) * perKm + 12 * perMin).toFixed(2);

  return (
    <View style={s.root}>
      {/* ─── الهيدر مع التبويبات الداخلية ─── */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.title}>الإعدادات</Text>
        <View style={s.segmented}>
          {([
            { id: 'pricing',   label: 'التسعير', icon: 'dollar-sign' },
            { id: 'routes',    label: 'المسارات', icon: 'compass' },
            { id: 'discounts', label: 'الخصومات', icon: 'tag' },
          ] as { id: Section; label: string; icon: string }[]).map(({ id, label, icon }) => (
            <TouchableOpacity
              key={id}
              style={[s.seg, section === id && s.segActive]}
              onPress={() => setSection(id)}
            >
              <Feather name={icon as any} size={13} color={section === id ? colors.primaryForeground : colors.mutedForeground} />
              <Text style={[s.segTxt, section === id && s.segTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90), paddingHorizontal: 16, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          section === 'routes' ? <RefreshControl refreshing={routesLoading} onRefresh={refetchRoutes} tintColor={colors.primary} />
          : section === 'discounts' ? <RefreshControl refreshing={discountsLoading} onRefresh={refetchDiscounts} tintColor={colors.primary} />
          : undefined
        }
      >

        {/* ══════════════ التسعير ══════════════ */}
        {section === 'pricing' && (
          pricingLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          : <>
              {/* معادلة الأجرة */}
              <View style={s.formulaCard}>
                <Text style={s.formulaTitle}>📐 معادلة الأجرة</Text>
                <Text style={s.formulaText}>
                  الأجرة = <Text style={s.formulaBold}>{base} د.أ</Text> (أول {freeKm} كم){'\n'}
                  + <Text style={s.formulaBold}>{perKm} د.أ</Text> × الكيلومترات الإضافية{'\n'}
                  + <Text style={s.formulaBold}>{perMin} د.أ</Text> × الدقائق
                </Text>
                <View style={s.formulaExample}>
                  <Feather name="info" size={13} color={colors.primary} />
                  <Text style={s.formulaExTxt}>مثال: رحلة 5 كم / 12 دقيقة = <Text style={{ fontWeight: '800', color: colors.primary }}>{ex5km} د.أ</Text></Text>
                </View>
                <Text style={s.commNote}>عمولة الشركة: {comm}% · الكابتن يحصل على {100 - comm}%</Text>
              </View>

              {/* الحقول */}
              <View style={s.form}>
                {PRICING_FIELDS.map(({ key, label, hint, suffix }) => (
                  <View key={key} style={s.fieldCard}>
                    <View style={s.fieldHeader}>
                      <Text style={s.fieldLabel}>{label}</Text>
                      <Text style={s.fieldHint}>{hint}</Text>
                    </View>
                    <View style={s.inputRow}>
                      <Text style={s.inputSuffix}>{suffix}</Text>
                      <TextInput
                        style={s.input}
                        value={pricing[key]}
                        onChangeText={v => setPricing(p => ({ ...p, [key]: v }))}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.mutedForeground}
                        textAlign="right"
                      />
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[s.saveBtn, pricingSaving && { opacity: 0.6 }]} onPress={savePricing} disabled={pricingSaving}>
                {pricingSaving
                  ? <ActivityIndicator color={colors.primaryForeground} />
                  : <><Feather name="save" size={17} color={colors.primaryForeground} /><Text style={s.saveBtnTxt}>حفظ الإعدادات</Text></>
                }
              </TouchableOpacity>
            </>
        )}

        {/* ══════════════ المسارات ══════════════ */}
        {section === 'routes' && (
          <>
            <TouchableOpacity style={s.addBtn} onPress={() => { resetRouteForm(); setRouteModal(true); }}>
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={s.addBtnTxt}>إضافة مسار جديد</Text>
            </TouchableOpacity>

            {routesLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

            {(routes ?? []).map((route: any) => (
              <View key={route.id} style={s.routeCard}>
                <View style={s.routeTop}>
                  <View style={[s.activeDot, { backgroundColor: route.isActive ? colors.success as string : colors.mutedForeground }]} />
                  <Text style={s.routeName}>{route.name}</Text>
                  <View style={s.routeActions}>
                    <TouchableOpacity
                      style={s.iconBtn}
                      onPress={() => updateRouteMutation.mutate({ id: route.id, data: { isActive: !route.isActive } })}
                    >
                      <Feather name={route.isActive ? 'toggle-right' : 'toggle-left'} size={20} color={route.isActive ? colors.success as string : colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.iconBtn} onPress={() => handleDeleteRoute(route.id, route.name)}>
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={s.routeFlow}>
                  <Text style={s.routeArea}>{route.pickupArea}</Text>
                  <Feather name="arrow-left" size={14} color={colors.mutedForeground} />
                  <Text style={s.routeArea}>{route.dropoffArea}</Text>
                </View>
                {route.description && <Text style={s.routeDesc}>{route.description}</Text>}
                <Text style={s.routeDate}>
                  {new Date(route.createdAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            ))}

            {!routesLoading && (routes ?? []).length === 0 && (
              <View style={s.empty}>
                <Feather name="compass" size={44} color={colors.mutedForeground} />
                <Text style={s.emptyTxt}>لا توجد مسارات</Text>
              </View>
            )}
          </>
        )}

        {/* ══════════════ الخصومات ══════════════ */}
        {section === 'discounts' && (
          <>
            <TouchableOpacity style={s.addBtn} onPress={() => { resetDiscountForm(); setDiscountModal(true); }}>
              <Feather name="plus" size={16} color={colors.primaryForeground} />
              <Text style={s.addBtnTxt}>إضافة كود خصم</Text>
            </TouchableOpacity>

            {discountsLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

            {(discounts ?? []).map((d: any) => {
              const usagePct = d.maxUses > 0 ? Math.round((d.currentUses / d.maxUses) * 100) : 0;
              const isExpired = d.expiresAt && new Date(d.expiresAt) < new Date();
              return (
                <View key={d.id} style={[s.discCard, isExpired && { opacity: 0.6 }]}>
                  <View style={s.discTop}>
                    <View style={s.codeWrap}>
                      <Text style={s.code}>{d.code}</Text>
                      {isExpired && <View style={s.expiredBadge}><Text style={s.expiredTxt}>منتهي</Text></View>}
                      {!d.isActive && !isExpired && <View style={s.inactiveBadge}><Text style={s.inactiveTxt}>معطّل</Text></View>}
                    </View>
                    <View style={s.discRight}>
                      <Text style={s.discPct}>{d.discountPercent}% خصم</Text>
                      <TouchableOpacity style={s.trashBtn} onPress={() => handleDeleteDiscount(d.id, d.code)}>
                        <Feather name="trash-2" size={15} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* شريط الاستخدام */}
                  <View style={s.usageRow}>
                    <Text style={s.usageTxt}>{d.currentUses} / {d.maxUses} استخدام</Text>
                    <View style={s.usageBar}>
                      <View style={[s.usageFill, {
                        width: `${Math.min(usagePct, 100)}%` as any,
                        backgroundColor: usagePct >= 100 ? colors.destructive : colors.success as string,
                      }]} />
                    </View>
                    <Text style={s.usagePct}>{usagePct}%</Text>
                  </View>

                  {d.expiresAt && (
                    <Text style={[s.expiry, isExpired && { color: colors.destructive }]}>
                      {isExpired ? 'انتهت' : 'تنتهي'}: {new Date(d.expiresAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              );
            })}

            {!discountsLoading && (discounts ?? []).length === 0 && (
              <View style={s.empty}>
                <Feather name="tag" size={44} color={colors.mutedForeground} />
                <Text style={s.emptyTxt}>لا توجد كودات خصم</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ─── مودال إضافة مسار ─── */}
      <Modal visible={routeModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>مسار جديد</Text>
            {([
              { label: 'اسم المسار',      value: routeName,    set: setRouteName,    placeholder: 'مثال: مطار - وسط البلد' },
              { label: 'منطقة الانطلاق',  value: routePickup,  set: setRoutePickup,  placeholder: 'مثال: مطار الملكة علياء' },
              { label: 'الوجهة',          value: routeDropoff, set: setRouteDropoff, placeholder: 'مثال: وسط عمّان' },
              { label: 'وصف (اختياري)',   value: routeDesc,    set: setRouteDesc,    placeholder: 'تفاصيل إضافية...' },
            ]).map(({ label, value, set, placeholder }) => (
              <View key={label} style={s.mField}>
                <Text style={s.mLabel}>{label}</Text>
                <TextInput
                  style={s.mInput}
                  value={value}
                  onChangeText={set}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
              </View>
            ))}
            <View style={s.mBtns}>
              <TouchableOpacity style={[s.mBtn, s.mBtnCancel]} onPress={() => setRouteModal(false)}>
                <Text style={s.mBtnCancelTxt}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnConfirm, createRouteMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSaveRoute} disabled={createRouteMutation.isPending}
              >
                {createRouteMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                  : <Text style={s.mBtnConfirmTxt}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── مودال إضافة كود خصم ─── */}
      <Modal visible={discountModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>كود خصم جديد</Text>
            {([
              { label: 'كود الخصم',           value: discCode,    set: (v: string) => setDiscCode(v.toUpperCase()),  placeholder: 'RIDEN20',  keyboard: 'default' },
              { label: 'نسبة الخصم (%)',      value: discPercent, set: setDiscPercent,  placeholder: '10',          keyboard: 'decimal-pad' },
              { label: 'الحد الأقصى للاستخدام', value: discMaxUses, set: setDiscMaxUses, placeholder: '100',         keyboard: 'number-pad' },
              { label: 'تاريخ الانتهاء (اختياري)', value: discExpiry, set: setDiscExpiry, placeholder: 'YYYY-MM-DD', keyboard: 'default' },
            ] as any[]).map(({ label, value, set, placeholder, keyboard }) => (
              <View key={label} style={s.mField}>
                <Text style={s.mLabel}>{label}</Text>
                <TextInput
                  style={s.mInput}
                  value={value}
                  onChangeText={set}
                  placeholder={placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType={keyboard}
                  autoCapitalize="characters"
                  textAlign="right"
                />
              </View>
            ))}
            <View style={s.mBtns}>
              <TouchableOpacity style={[s.mBtn, s.mBtnCancel]} onPress={() => setDiscountModal(false)}>
                <Text style={s.mBtnCancelTxt}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.mBtn, s.mBtnConfirm, createDiscountMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSaveDiscount} disabled={createDiscountMutation.isPending}
              >
                {createDiscountMutation.isPending
                  ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                  : <Text style={s.mBtnConfirmTxt}>إنشاء</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground, marginBottom: 12 },
  segmented: {
    flexDirection: 'row', backgroundColor: colors.secondary,
    borderRadius: 14, padding: 4, borderWidth: 1, borderColor: colors.border,
    marginBottom: 4,
  },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 11 },
  segActive: { backgroundColor: colors.primary },
  segTxt: { fontSize: 12, fontWeight: '600', color: colors.mutedForeground },
  segTxtActive: { color: colors.primaryForeground },
  // ─── التسعير ───
  formulaCard: {
    backgroundColor: colors.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 8, marginBottom: 14,
  },
  formulaTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
  formulaText: { fontSize: 14, color: colors.foreground, lineHeight: 22, textAlign: 'right' },
  formulaBold: { fontWeight: '800', color: colors.primary },
  formulaExample: {
    flexDirection: 'row-reverse', gap: 6, alignItems: 'center',
    backgroundColor: colors.primary + '15', borderRadius: 10, padding: 10,
  },
  formulaExTxt: { flex: 1, fontSize: 13, color: colors.foreground, textAlign: 'right' },
  commNote: { fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
  form: { gap: 12, marginBottom: 16 },
  fieldCard: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  fieldHeader: { alignItems: 'flex-end', gap: 2 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  fieldHint: { fontSize: 11, color: colors.mutedForeground },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14,
  },
  inputSuffix: { fontSize: 13, color: colors.mutedForeground, fontWeight: '600', minWidth: 48, textAlign: 'center' },
  input: { flex: 1, paddingVertical: 12, fontSize: 20, fontWeight: '800', color: colors.primary },
  saveBtn: {
    flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, marginBottom: 4,
  },
  saveBtnTxt: { fontSize: 16, fontWeight: '700', color: colors.primaryForeground },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 13, marginBottom: 14,
  },
  addBtnTxt: { fontSize: 15, fontWeight: '700', color: colors.primaryForeground },
  // ─── المسارات ───
  routeCard: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 10, gap: 6,
  },
  routeTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  routeName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
  routeActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 4 },
  routeFlow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, backgroundColor: colors.secondary, borderRadius: 10, padding: 10 },
  routeArea: { flex: 1, fontSize: 13, color: colors.foreground, textAlign: 'center', fontWeight: '500' },
  routeDesc: { fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
  routeDate: { fontSize: 11, color: colors.mutedForeground, textAlign: 'right' },
  // ─── الخصومات ───
  discCard: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 10, gap: 8,
  },
  discTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  code: { fontSize: 18, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  expiredBadge: { backgroundColor: colors.destructive + '25', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  expiredTxt: { fontSize: 10, fontWeight: '700', color: colors.destructive },
  inactiveBadge: { backgroundColor: colors.mutedForeground + '25', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inactiveTxt: { fontSize: 10, fontWeight: '700', color: colors.mutedForeground },
  discRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  discPct: { fontSize: 14, fontWeight: '700', color: colors.success as string },
  trashBtn: { padding: 4 },
  usageRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  usageTxt: { fontSize: 11, color: colors.mutedForeground },
  usageBar: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 3 },
  usagePct: { fontSize: 11, fontWeight: '700', color: colors.foreground, minWidth: 28, textAlign: 'right' },
  expiry: { fontSize: 12, color: colors.mutedForeground, textAlign: 'right' },
  // ─── Empty ───
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTxt: { fontSize: 15, color: colors.mutedForeground },
  // ─── Modal ───
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 12,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.foreground, textAlign: 'center', marginBottom: 4 },
  mField: { gap: 6 },
  mLabel: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground, textAlign: 'right' },
  mInput: {
    backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.foreground,
  },
  mBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  mBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  mBtnCancel: { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border },
  mBtnCancelTxt: { color: colors.mutedForeground, fontWeight: '600', fontSize: 15 },
  mBtnConfirm: { backgroundColor: colors.primary },
  mBtnConfirmTxt: { color: colors.primaryForeground, fontWeight: '700', fontSize: 15 },
} as any);
