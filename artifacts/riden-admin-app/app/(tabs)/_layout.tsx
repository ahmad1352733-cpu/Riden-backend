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
      <NativeTabs.Trigger name="index"><Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} /><Label>الرئيسية</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="captains"><Icon sf={{ default: 'car', selected: 'car.fill' }} /><Label>الكباتن</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="passengers"><Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} /><Label>الركاب</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips"><Icon sf={{ default: 'map', selected: 'map.fill' }} /><Label>الرحلات</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings"><Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} /><Label>الإعدادات</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="complaints"><Icon sf={{ default: 'exclamationmark.bubble', selected: 'exclamationmark.bubble.fill' }} /><Label>الشكاوى</Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="notifications"><Icon sf={{ default: 'bell', selected: 'bell.fill' }} /><Label>إشعار</Label></NativeTabs.Trigger>
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
          borderTopWidth: 1, borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          : isWeb ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          : null,
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      {([
        { name: 'index', title: 'الرئيسية', icon: 'bar-chart-2', sf: 'chart.bar.fill' },
        { name: 'captains', title: 'الكباتن', icon: 'navigation', sf: 'car.fill' },
        { name: 'passengers', title: 'الركاب', icon: 'users', sf: 'person.2.fill' },
        { name: 'trips', title: 'الرحلات', icon: 'map', sf: 'map.fill' },
        { name: 'settings', title: 'الإعدادات', icon: 'settings', sf: 'gearshape.fill' },
        { name: 'complaints', title: 'الشكاوى', icon: 'alert-circle', sf: 'exclamationmark.bubble.fill' },
        { name: 'notifications', title: 'إشعار', icon: 'bell', sf: 'bell.fill' },
      ] as const).map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) =>
              isIOS
                ? <SymbolView name={tab.sf as any} tintColor={color} size={22} />
                : <Feather name={tab.icon as any} size={20} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
