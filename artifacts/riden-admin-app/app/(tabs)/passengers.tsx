import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Platform, TextInput, I18nManager, Linking, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminPassengers } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

export default function PassengersScreen() {
  const colors    = useColors();
  const insets    = useSafeAreaInsets();
  const { token } = useAuth();

  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: passengers, isLoading, refetch } = useGetAdminPassengers({
    query: { enabled: !!token },
  });

  const filtered = (passengers ?? []).filter((p: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    );
  });

  const activeCount    = (passengers ?? []).filter((p: any) => p.status === 'active').length;
  const suspendedCount = (passengers ?? []).filter((p: any) => p.status !== 'active').length;

  const s = styles(colors);

  return (
    <View style={s.root}>
      {/* ─── الهيدر ─── */}
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <View style={s.headerTop}>
          <Text style={s.title}>الركاب</Text>
          <View style={s.counters}>
            <View style={[s.counter, { backgroundColor: (colors.success as string) + '20' }]}>
              <Text style={[s.counterVal, { color: colors.success as string }]}>{activeCount}</Text>
              <Text style={[s.counterLbl, { color: colors.success as string }]}>نشط</Text>
            </View>
            {suspendedCount > 0 && (
              <View style={[s.counter, { backgroundColor: colors.destructive + '20' }]}>
                <Text style={[s.counterVal, { color: colors.destructive }]}>{suspendedCount}</Text>
                <Text style={[s.counterLbl, { color: colors.destructive }]}>موقوف</Text>
              </View>
            )}
          </View>
        </View>

        {/* البحث */}
        <View style={s.searchRow}>
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث بالاسم أو البريد أو الهاتف..."
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{
          paddingHorizontal: 14, paddingTop: 8,
          paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90),
        }}
        renderItem={({ item: p }: { item: any }) => {
          const isActive   = p.status === 'active';
          const isExpanded = expanded === p.id;

          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => setExpanded(isExpanded ? null : p.id)}
              activeOpacity={0.85}
            >
              {/* الصف الرئيسي */}
              <View style={s.cardMain}>
                {/* الأفاتار */}
                <View style={[s.avatar, { backgroundColor: isActive ? colors.primary + '20' : colors.mutedForeground + '20' }]}>
                  <Text style={[s.avatarTxt, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                    {p.name?.charAt(0)?.toUpperCase() ?? 'R'}
                  </Text>
                </View>

                {/* المعلومات */}
                <View style={s.cardInfo}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.sub}>{p.phone}</Text>
                  <Text style={s.sub} numberOfLines={1}>{p.email}</Text>
                </View>

                {/* الحالة والسهم */}
                <View style={s.cardRight}>
                  <View style={[s.statusBadge, {
                    backgroundColor: isActive ? (colors.success as string) + '20' : colors.destructive + '20',
                  }]}>
                    <View style={[s.statusDot, {
                      backgroundColor: isActive ? colors.success as string : colors.destructive,
                    }]} />
                    <Text style={[s.statusTxt, {
                      color: isActive ? colors.success as string : colors.destructive,
                    }]}>{isActive ? 'نشط' : 'موقوف'}</Text>
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
                </View>
              </View>

              {/* التفاصيل الموسّعة */}
              {isExpanded && (
                <View style={s.expanded}>
                  <View style={s.detailRow}>
                    <View style={s.detailBlock}>
                      <Text style={s.detailLabel}>رقم المستخدم</Text>
                      <Text style={s.detailValue}>#{p.id}</Text>
                    </View>
                    <View style={s.detailBlock}>
                      <Text style={s.detailLabel}>تاريخ التسجيل</Text>
                      <Text style={s.detailValue}>
                        {new Date(p.createdAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    {p.role && (
                      <View style={s.detailBlock}>
                        <Text style={s.detailLabel}>الدور</Text>
                        <Text style={s.detailValue}>{p.role}</Text>
                      </View>
                    )}
                  </View>

                  {/* أزرار التواصل */}
                  <View style={s.contactRow}>
                    <TouchableOpacity
                      style={s.contactBtn}
                      onPress={() => Linking.openURL(`tel:${p.phone}`)}
                    >
                      <Feather name="phone" size={14} color="#fff" />
                      <Text style={s.contactBtnTxt}>اتصال</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.contactBtn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}
                      onPress={() => Linking.openURL(`mailto:${p.email}`)}
                    >
                      <Feather name="mail" size={14} color={colors.foreground} />
                      <Text style={[s.contactBtnTxt, { color: colors.foreground }]}>بريد</Text>
                    </TouchableOpacity>
                  </View>

                  {/* قبول الشروط */}
                  {p.termsAcceptedAt && (
                    <Text style={s.termsNote}>
                      ✓ وافق على الشروط: {new Date(p.termsAcceptedAt).toLocaleDateString('ar-JO', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="users" size={44} color={colors.mutedForeground} />
              <Text style={s.emptyTxt}>{search ? 'لا توجد نتائج' : 'لا يوجد ركاب'}</Text>
            </View>
          )
        )}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '800', color: colors.foreground },
  counters: { flexDirection: 'row', gap: 6 },
  counter: { alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  counterVal: { fontSize: 16, fontWeight: '800' },
  counterLbl: { fontSize: 9, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  card: {
    backgroundColor: colors.card, borderRadius: 18,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 10, gap: 0,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt: { fontSize: 20, fontWeight: '800' },
  cardInfo: { flex: 1, alignItems: 'flex-end', gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  sub: { fontSize: 12, color: colors.mutedForeground },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontSize: 12, fontWeight: '600' },
  expanded: {
    marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 12, gap: 10,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-around' },
  detailBlock: { alignItems: 'center', gap: 3 },
  detailLabel: { fontSize: 10, color: colors.mutedForeground },
  detailValue: { fontSize: 13, fontWeight: '700', color: colors.foreground },
  contactRow: { flexDirection: 'row', gap: 10 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.success as string,
    borderRadius: 12, paddingVertical: 10,
  },
  contactBtnTxt: { fontSize: 14, fontWeight: '600', color: '#fff' },
  termsNote: { fontSize: 12, color: colors.success as string, textAlign: 'right' },
  empty: { alignItems: 'center', paddingVertical: 80, gap: 12 },
  emptyTxt: { fontSize: 15, color: colors.mutedForeground },
} as any);
