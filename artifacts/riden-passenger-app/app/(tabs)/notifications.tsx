import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? 'riden-api-production.up.railway.app'}/api`;

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const qc = useQueryClient();

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const r = await fetch(`${API}/notifications`, { headers });
      return r.json();
    },
    enabled: !!token,
    refetchInterval: 30000,
  });

  const readAllMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markRead = useCallback(async (id: number) => {
    await fetch(`${API}/notifications/${id}/read`, { method: 'PATCH', headers });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }, [token]);

  const notifications: any[] = Array.isArray(data) ? data : [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const ORANGE = '#F5A623';
  const s = styles(ORANGE);

  if (isLoading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={ORANGE} size="large" /></View>;
  }

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 16) }]}>
        <Text style={s.title}>الإشعارات</Text>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.readAllBtn} onPress={() => readAllMutation.mutate()}>
            <Text style={s.readAllTxt}>قراءة الكل</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={ORANGE} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 90, paddingTop: 12 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Feather name="bell-off" size={48} color="#2A3F5A" />
            <Text style={s.emptyTxt}>لا توجد إشعارات</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, !item.isRead && s.cardUnread]}
            onPress={() => !item.isRead && markRead(item.id)}
            activeOpacity={0.8}
          >
            <View style={s.cardLeft}>
              <View style={s.iconWrap}>
                <Feather name="bell" size={18} color={ORANGE} />
              </View>
            </View>
            <View style={s.cardBody}>
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{item.title}</Text>
                {!item.isRead && <View style={s.unreadDot} />}
              </View>
              <Text style={s.cardMsg}>{item.body}</Text>
              <Text style={s.cardDate}>
                {new Date(item.createdAt).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = (orange: string) => StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0F1B2D' },
  center:     { alignItems: 'center', justifyContent: 'center' },
  header:     { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#2A3F5A', backgroundColor: '#1A2D44', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-end' },
  title:      { fontSize: 22, fontWeight: '800', color: '#fff' },
  readAllBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: orange + '20', borderRadius: 8 },
  readAllTxt: { fontSize: 13, color: orange, fontWeight: '600' },
  empty:      { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTxt:   { fontSize: 16, color: '#9CA3AF' },
  card:       { flexDirection: 'row-reverse', backgroundColor: '#1A2D44', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A3F5A', gap: 12 },
  cardUnread: { borderColor: orange + '80', backgroundColor: orange + '10' },
  cardLeft:   { alignItems: 'center' },
  iconWrap:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: orange + '20' },
  cardBody:   { flex: 1, gap: 4 },
  cardTop:    { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'right', flex: 1 },
  unreadDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: orange, marginLeft: 6 },
  cardMsg:    { fontSize: 13, color: '#9CA3AF', textAlign: 'right', lineHeight: 20 },
  cardDate:   { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
});
