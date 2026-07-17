import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCaptainProfile } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';

const BG    = '#0F1B2D';
const CARD  = '#1A2D44';
const GREEN = '#22C55E';
const GOLD  = '#F59E0B';
const WHITE = '#FFFFFF';
const GRAY  = '#9CA3AF';

export default function PendingApprovalScreen() {
  const insets  = useSafeAreaInsets();
  const { token, user, logout, updateUser } = useAuth();
  const [checking, setChecking] = useState(false);

  // Poll every 30s automatically
  const { data: profile, refetch } = useGetCaptainProfile({
    query: {
      enabled: !!token,
      refetchInterval: 30_000,
    },
  });

  // When profile comes back approved → update context and go to tabs
  useEffect(() => {
    if (profile?.isApproved) {
      updateUser(profile as any);
      router.replace('/(tabs)');
    }
  }, [profile?.isApproved]);

  const handleRefresh = async () => {
    setChecking(true);
    await refetch();
    setChecking(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + (Platform.OS === 'web' ? 80 : 40), paddingBottom: insets.bottom + 24 }]}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>RIDEN</Text>
        <Text style={s.sub}>Captain</Text>
      </View>

      {/* Card */}
      <View style={s.card}>
        {/* Icon */}
        <View style={s.iconWrap}>
          <View style={s.outerRing}>
            <View style={s.innerRing}>
              <Feather name="clock" size={40} color={GOLD} />
            </View>
          </View>
        </View>

        <Text style={s.title}>Application Under Review</Text>
        <Text style={s.desc}>
          Your captain registration has been submitted. Our team is reviewing your information and vehicle details.
        </Text>

        {/* Status steps */}
        <View style={s.steps}>
          <Step icon="check-circle" label="Application submitted" color={GREEN} done />
          <View style={s.stepLine} />
          <Step icon="clock" label="Admin review in progress" color={GOLD} active />
          <View style={s.stepLine} />
          <Step icon="unlock" label="Account activation" color={GRAY} />
        </View>

        {/* Notification note */}
        <View style={s.note}>
          <Feather name="info" size={14} color={GOLD} />
          <Text style={s.noteTxt}>
            You'll be able to start driving once your account is approved. This usually takes 24–48 hours.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          style={[s.refreshBtn, checking && { opacity: 0.6 }]}
          onPress={handleRefresh}
          disabled={checking}
          activeOpacity={0.85}
        >
          {checking
            ? <ActivityIndicator color={WHITE} size="small" />
            : <>
                <Feather name="refresh-cw" size={16} color={WHITE} />
                <Text style={s.refreshTxt}>Check Status</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={s.logoutTxt}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Step({ icon, label, color, done, active }: { icon: string; label: string; color: string; done?: boolean; active?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: color + (done || active ? '25' : '10'),
        borderWidth: done || active ? 1.5 : 1,
        borderColor: color + (done || active ? '80' : '30'),
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Feather name={icon as any} size={15} color={color} />
      </View>
      <Text style={{ fontSize: 13, color: done || active ? '#E2E8F0' : GRAY, fontWeight: done || active ? '500' : '400' }}>
        {label}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: BG, paddingHorizontal: 24, justifyContent: 'space-between' },
  header:    { alignItems: 'center', marginBottom: 8 },
  brand:     { fontSize: 36, fontWeight: '900', color: WHITE, letterSpacing: 4 },
  sub:       { fontSize: 14, fontWeight: '600', color: GREEN, letterSpacing: 5, textTransform: 'uppercase', marginTop: 2 },
  card:      {
    backgroundColor: CARD, borderRadius: 24, padding: 24, gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 10,
  },
  iconWrap:  { alignItems: 'center', marginBottom: 4 },
  outerRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: GOLD + '15', borderWidth: 1, borderColor: GOLD + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  innerRing: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: GOLD + '20', borderWidth: 1.5, borderColor: GOLD + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  title:     { fontSize: 20, fontWeight: '700', color: WHITE, textAlign: 'center' },
  desc:      { fontSize: 14, color: GRAY, textAlign: 'center', lineHeight: 21 },
  steps:     { gap: 4, paddingVertical: 4 },
  stepLine:  { width: 1.5, height: 14, backgroundColor: '#2A3F5A', marginLeft: 15 },
  note:      {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: GOLD + '15', borderRadius: 12, borderWidth: 1, borderColor: GOLD + '40', padding: 12,
  },
  noteTxt:   { flex: 1, fontSize: 12, color: '#FCD34D', lineHeight: 18 },
  actions:   { gap: 10 },
  refreshBtn:{
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  refreshTxt:{ fontSize: 15, fontWeight: '600', color: WHITE },
  logoutBtn: { alignItems: 'center', paddingVertical: 10 },
  logoutTxt: { fontSize: 14, color: GRAY },
});
