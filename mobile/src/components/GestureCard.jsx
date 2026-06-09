/**
 * GestureCard.jsx — ПОЛНЫЙ РЕДИЗАЙН карточки жеста.
 *
 * Дизайн:
 *   - Большая иллюстрация руки на фоне #e6f1f8
 *   - Название жеста крупно жирным
 *   - Тег категории
 *   - Полоска прогресса внизу (не изучен / в процессе / изучен)
 *   - Иконка замка если не открыт
 *   - Зелёная галочка в углу если изучен
 *   - Мягкая тень через #98cae1
 *   - Анимация scale 0.97 при нажатии
 *   - Анимация появления fade-up с задержкой
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 колонки с отступами

// Маленькие SVG-подобные иллюстрации для разных жестов
const HAND_ICONS = {
  alphabet: '🖐️',
  numbers: '🔢',
  greetings: '👋',
  emergency: '🆘',
  common: '🤟',
  colors: '🎨',
  default: '✋',
};

function getHandIcon(category) {
  return HAND_ICONS[category] || HAND_ICONS.default;
}

function getProgressColor(status) {
  switch (status) {
    case 'learned': return '#22c55e';
    case 'in_progress': return '#3c95bb';
    default: return '#e2e8f0';
  }
}

function getProgressWidth(status) {
  switch (status) {
    case 'learned': return '100%';
    case 'in_progress': return '50%';
    default: return '0%';
  }
}

export default function GestureCard({
  gesture,
  status = 'new',        // 'new' | 'in_progress' | 'learned'
  isLocked = false,
  index = 0,
  onPress,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  // Анимация появления (fade-up с задержкой)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const category = gesture.category || gesture.topic || 'common';
  const name = gesture.label || gesture.name || '';
  const sub = gesture.sub || '';

  return (
    <Animated.View style={{
      opacity,
      transform: [{ translateY }, { scale }],
      width: CARD_WIDTH,
    }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={isLocked}
        style={[
          styles.card,
          isLocked && styles.cardLocked,
        ]}
      >
        {/* Иконка замка */}
        {isLocked && (
          <View style={styles.lockBadge}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}

        {/* Галочка изучено */}
        {status === 'learned' && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        )}

        {/* Иллюстрация руки */}
        <View style={styles.illustration}>
          <Text style={styles.handIcon}>{getHandIcon(category)}</Text>
        </View>

        {/* Название жеста */}
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        {/* Тег категории */}
        {sub ? (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText} numberOfLines={1}>{sub}</Text>
          </View>
        ) : null}

        {/* Полоска прогресса */}
        <View style={styles.progressTrack}>
          <View style={[
            styles.progressFill,
            {
              width: getProgressWidth(status),
              backgroundColor: getProgressColor(status),
            },
          ]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    marginHorizontal: 6,
    shadowColor: '#98cae1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
    position: 'relative',
    overflow: 'visible',
  },
  cardLocked: {
    opacity: 0.65,
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    zIndex: 10,
    backgroundColor: '#162d3b',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 16,
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 10,
    backgroundColor: '#22c55e',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  checkIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  illustration: {
    backgroundColor: '#e6f1f8',
    borderRadius: 18,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  handIcon: {
    fontSize: 44,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    color: '#214559',
    marginBottom: 4,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#cce4f0',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2c789d',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
