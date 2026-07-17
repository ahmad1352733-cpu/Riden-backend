import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'car', selected: 'car.fill' }} />
        <Label>لوحة التحكم</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <Icon sf={{ default: 'list.bullet', selected: 'list.bullet.fill' }} />
        <Label>رحلاتي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="earnings">
        <Icon sf={{ default: 'banknote', selected: 'banknote.fill' }} />
        <Label>أرباحي</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications">
        <Icon sf={{ default: 'bell', selected: 'bell.fill' }} />
        <Label>الإشعارات</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
        <Label>حسابي</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={80} tint={isDark ? 'dark' : 'default'} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'لوحة التحكم',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="car.fill" tintColor={color} size={22} /> : <Feather name="navigation" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'رحلاتي',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="list.bullet" tintColor={color} size={22} /> : <Feather name="list" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'أرباحي',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="banknote.fill" tintColor={color} size={22} /> : <Feather name="dollar-sign" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'الإشعارات',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="bell.fill" tintColor={color} size={22} /> : <Feather name="bell" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'حسابي',
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.circle.fill" tintColor={color} size={22} /> : <Feather name="user" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
