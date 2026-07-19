import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';

/**
 * شاشة التحميل — قابلة للتعديل عبر OTA بدون APK جديد
 * غيّري الألوان أو النصوص أو الشعار هنا وانشري OTA
 */
export function SplashLoadingScreen() {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const dotAnim1  = useRef(new Animated.Value(0.3)).current;
  const dotAnim2  = useRef(new Animated.Value(0.3)).current;
  const dotAnim3  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();

    const pulseDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration: 350, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ]),
      );

    const d1 = pulseDot(dotAnim1, 0);
    const d2 = pulseDot(dotAnim2, 180);
    const d3 = pulseDot(dotAnim3, 360);
    d1.start(); d2.start(); d3.start();
    return () => { d1.stop(); d2.stop(); d3.stop(); };
  }, []);

  return (
    <View style={s.container}>
      <Animated.View style={[s.logoBox, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={require('../assets/images/icon.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.appName}>RIDEN</Text>
        <Text style={s.tagline}>راكب</Text>
      </Animated.View>

      <View style={s.dotsRow}>
        {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
          <Animated.View key={i} style={[s.dot, { opacity: anim }]} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1B2D',       // ← غيّري لون الخلفية هنا
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  logoBox: {
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 28,
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#22C55E',                 // ← غيّري لون الاسم هنا
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 16,
    color: '#8A9BB5',
    letterSpacing: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',       // ← غيّري لون النقاط هنا
  },
});
