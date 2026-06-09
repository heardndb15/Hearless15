/**
 * GestureCard.jsx — карточка одного жеста.
 *
 * Показывает: название, описание, сложность, прогресс пользователя.
 * Кнопки: "Практиковать", "Добавить в избранное".
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const DIFFICULTY_STARS = {
  1: '⭐',
  2: '⭐⭐',
  3: '⭐⭐⭐',
};

const DIFFICULTY_LABEL = {
  1: 'Простой',
  2: 'Средний',
  3: 'Сложный',
};

export default function GestureCard({
  gesture,
  progress,       // { learned, attempts, best_confidence }
  onPractice,     // callback
  onToggleFavorite,
  isFavorite,
}) {
  return (
    <View style={styles.card}>
      {/* Верхняя строка: название + сложность */}
      <View style={styles.header}>
        <Text style={styles.name}>{gesture.name}</Text>
        <Text style={styles.difficulty}>
          {DIFFICULTY_STARS[gesture.difficulty] || '⭐'}
        </Text>
      </View>

      <Text style={styles.ru}>{gesture.ru}</Text>
      <Text style={styles.topic}>{gesture.topic}</Text>
      <Text style={styles.desc} numberOfLines={2}>{gesture.desc}</Text>

      {/* Прогресс */}
      {progress && (
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, {
            width: `${Math.min(100, (progress.best_confidence || 0) * 100)}%`,
          }]} />
          <Text style={styles.progressText}>
            {progress.learned ? '✅ Выучено' : `${Math.round((progress.best_confidence || 0) * 100)}%`}
          </Text>
        </View>
      )}

      {/* Кнопки */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.practiceBtn} onPress={onPractice}>
          <Text style={styles.practiceBtnText}>Практиковать</Text>
        </TouchableOpacity>
        {onToggleFavorite && (
          <TouchableOpacity style={styles.favBtn} onPress={onToggleFavorite}>
            <Text style={styles.favBtnText}>{isFavorite ? '★' : '☆'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#cce4f0',
    borderRadius: 18,
    padding: 18,
    marginVertical: 6,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: '#214559',
    flex: 1,
  },
  difficulty: {
    fontSize: 14,
  },
  ru: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c95bb',
    marginBottom: 2,
  },
  topic: {
    fontSize: 12,
    color: '#3c95bb',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    color: '#2c789d',
    lineHeight: 20,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#214559',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  practiceBtn: {
    backgroundColor: '#3c95bb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  practiceBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  favBtn: {
    backgroundColor: '#f3f8fc',
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnText: {
    fontSize: 22,
    color: '#3c95bb',
  },
});
