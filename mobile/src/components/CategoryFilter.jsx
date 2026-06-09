/**
 * CategoryFilter.jsx — горизонтальный скролл категорий (pill-кнопки).
 *
 * Активная категория: фон #2c789d, белый текст
 * Неактивная: фон #cce4f0, тёмный текст #214559
 * Анимация scale при нажатии
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';

const DEFAULT_CATEGORIES = [
  { key: 'all', label: 'Все' },
  { key: 'alphabet', label: 'Алфавит' },
  { key: 'numbers', label: 'Цифры' },
  { key: 'greetings', label: 'Приветствия' },
  { key: 'emergency', label: 'Экстренные' },
  { key: 'common', label: 'Общие' },
  { key: 'colors', label: 'Цвета' },
];

function Pill({ label, active, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        style={[
          styles.pill,
          active ? styles.pillActive : styles.pillInactive,
        ]}
      >
        <Text style={[
          styles.pillText,
          active ? styles.pillTextActive : styles.pillTextInactive,
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function CategoryFilter({
  categories = DEFAULT_CATEGORIES,
  activeCategory = 'all',
  onSelect,
}) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {categories.map(cat => (
          <Pill
            key={cat.key}
            label={cat.label}
            active={cat.key === activeCategory}
            onPress={() => onSelect(cat.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 50,
  },
  pillActive: {
    backgroundColor: '#2c789d',
  },
  pillInactive: {
    backgroundColor: '#cce4f0',
  },
  pillText: {
    fontWeight: '700',
    fontSize: 14,
  },
  pillTextActive: {
    color: '#ffffff',
  },
  pillTextInactive: {
    color: '#214559',
  },
});
