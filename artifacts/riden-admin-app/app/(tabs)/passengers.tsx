import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, Platform, TextInput, I18nManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGetAdminPassengers } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

I18nManager.forceRTL(true);

export default function PassengersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [search, setSearch] = useState('');

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

  const s = styles(colors);

  return (
    <View style={[s.flex, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.headerTitle}>الركاب ({passengers?.length ?? 0})</Text>
        <View style={s.searchWrap}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="بحث بالاسم أو البريد أو الهاتف..."
            placeholderTextColor={colors.mutedForeground}
            textAlign="right"
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 90) }}
        renderItem={({ item: passenger }: { item: any }) => (
          <View style={s.card}>
            <View style={s.cardLeft}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{passenger.name?.charAt(0) ?? 'P'}</Text>
              </View>
            </View>
            <View style={s.cardInfo}>
              <Text style={s.name}>{passenger.name}</Text>
              <Text style={s.sub}>{passenger.email}</Text>
              <Text style={s.sub}>{passenger.phone}</Text>
            </View>
            <View style={[s.statusBadge, {
              backgroundColor: passenger.status === 'active' ? colors.success + '25' : colors.destructive + '25',
            }]}>
              <Text style={[s.statusText, {
                color: passenger.status === 'active' ? colors.success : colors.destructive,
              }]}>{passenger.status === 'active' ? 'نشط' : 'موقوف'}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={s.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={s.emptyText}>لا يوجد ركاب</Text>
            </View>
          )
        )}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.foreground, textAlign: 'right', marginBottom: 10 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: colors.radius, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 4,
  },
  searchInput: { flex: 1, color: colors.foreground, fontSize: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cardLeft: {},
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  cardInfo: { flex: 1, alignItems: 'flex-end' },
  name: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  sub: { fontSize: 12, color: colors.mutedForeground },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: colors.mutedForeground },
} as any);
