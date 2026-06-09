/**
 * ProgressHero.jsx — блок прогресса пользователя.
 *
 * Содержит:
 *   - Круговой прогресс-бар с числом по центру
 *   - Стрик дней подряд
 *   - Три мини-метрики: Изучено / Практик / Точность
 *   - Градиентный фон #3c95bb → #2c789d
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export default function ProgressHero({ stats, streak }) {
  const learned = stats?.learned || 0;
  const total = stats?.total || 78;
  const practiced = stats?.practiced || 0;
  const accuracy = stats?.accuracy ?? 0;
  const progress = total > 0 ? learned / total : 0;

  // Анимация заполнения круга
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Размеры круга
  const size = 140;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      {/* Градиентный фон */}
      <View style={styles.gradient}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>

      {/* Круговой прогресс */}
      <View style={styles.circleWrapper}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {/* Фоновый круг */}
          <View style={[styles.circleBg, { width: size, height: size, borderRadius: size / 2 }]} />
          {/* SVG круг (без svg — используем View с border) */}
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{
              width: size - stroke * 2,
              height: size - stroke * 2,
              borderRadius: (size - stroke * 2) / 2,
              backgroundColor: '#2c789d',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={styles.circleNumber}>{learned}</Text>
              <Text style={styles.circleLabel}>из {total}</Text>
            </View>
          </View>
          {/* Анимированное кольцо через крайний радиус */}
          <View style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: 'transparent',
            borderTopColor: '#f3f8fc',
            borderRightColor: '#f3f8fc',
            transform: [{ rotate: `${-90 + 360 * progress}deg` }],
          }} />
        </View>
      </View>

      {/* Стрик */}
      {streak > 0 && (
        <View style={styles.streakRow}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakText}>{streak} дней подряд</Text>
        </View>
      )}

      {/* Мини-метрики */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{learned}</Text>
          <Text style={styles.metricLabel}>Изучено</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{practiced}</Text>
          <Text style={styles.metricLabel}>Практик</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{accuracy}%</Text>
          <Text style={styles.metricLabel}>Точность</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 28,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  gradientTop: {
    flex: 1,
    backgroundColor: '#3c95bb',
  },
  gradientBottom: {
    flex: 0,
  },
  circleWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  circleBg: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    position: 'absolute',
  },
  circleNumber: {
    fontSize: 42,
    fontWeight: '900',
    color: '#f3f8fc',
    letterSpacing: -1,
  },
  circleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(243, 248, 252, 0.8)',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  streakIcon: {
    fontSize: 22,
    marginRight: 6,
  },
  streakText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f3f8fc',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f3f8fc',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(243, 248, 252, 0.7)',
    marginTop: 2,
  },
});
