/**
 * SignLanguageScreen.jsx — главный экран раздела "Жестовый язык".
 *
 * Объединяет:
 *   1. ProgressHero — прогресс пользователя
 *   2. Ежедневная цель — карточка с прогресс-баром
 *   3. CategoryFilter — горизонтальные pill-кнопки
 *   4. GestureCard — сетка 2 колонки с анимациями
 *   5. LearningPath — путь обучения (Duolingo-style)
 *
 * Дизайн: игровой (Duolingo) + минималистичный + премиум + тёплый.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import ProgressHero from '../components/ProgressHero';
import CategoryFilter from '../components/CategoryFilter';
import GestureCard from '../components/GestureCard';
import LearningPath from '../components/LearningPath';
import useProgress from '../hooks/useProgress';

const API_URL = __DEV__
  ? 'http://192.168.1.100:8000'
  : 'https://hearless15.onrender.com';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Маппинг категорий для API ────────────────────────────────────────
const CATEGORY_MAP = {
  all: null,
  alphabet: 'alphabet',
  numbers: 'numbers',
  greetings: 'greetings',
  emergency: 'emergency',
  common: 'common',
  colors: 'colors',
};

const CATEGORIES = [
  { key: 'all', label: 'Все' },
  { key: 'alphabet', label: 'Алфавит' },
  { key: 'numbers', label: 'Цифры' },
  { key: 'greetings', label: 'Приветствия' },
  { key: 'emergency', label: 'Экстренные' },
  { key: 'common', label: 'Общие' },
  { key: 'colors', label: 'Цвета' },
];

// ── Тестовые данные жестов (когда API недоступен) ──────────────────
const FALLBACK_SIGNS = [
  { id: 1, category: 'alphabet', label: 'А', sub: 'Дактиль', desc: 'Кулак, большой палец сбоку.' },
  { id: 2, category: 'alphabet', label: 'Б', sub: 'Дактиль', desc: 'Ладонь раскрыта.' },
  { id: 3, category: 'alphabet', label: 'В', sub: 'Дактиль', desc: 'Указательный и средний вверх.' },
  { id: 4, category: 'alphabet', label: 'Г', sub: 'Дактиль', desc: 'Указательный палец вверх.' },
  { id: 5, category: 'numbers', label: 'Один', sub: 'Цифры', desc: 'Указательный палец вверх.' },
  { id: 6, category: 'numbers', label: 'Два', sub: 'Цифры', desc: 'Два пальца вверх.' },
  { id: 7, category: 'greetings', label: 'Привет', sub: 'Приветствие', desc: 'Взмах ладонью.' },
  { id: 8, category: 'greetings', label: 'Спасибо', sub: 'Этикет', desc: 'Кулак у подбородка.' },
  { id: 9, category: 'emergency', label: 'Помощь', sub: 'Важное', desc: 'Кулак, рука сверху.' },
  { id: 10, category: 'common', label: 'Я тебя люблю', sub: 'Фраза', desc: 'Три пальца.' },
  { id: 11, category: 'common', label: 'Дом', sub: 'Предмет', desc: 'Ладони домиком.' },
  { id: 12, category: 'colors', label: 'Красный', sub: 'Цвет', desc: 'Круг у губ.' },
  { id: 13, category: 'colors', label: 'Синий', sub: 'Цвет', desc: 'Ладонь вниз.' },
  { id: 14, category: 'common', label: 'Вода', sub: 'Предмет', desc: 'Ковшик у губ.' },
  { id: 15, category: 'alphabet', label: 'Е', sub: 'Дактиль', desc: 'Пальцы сжаты.' },
  { id: 16, category: 'alphabet', label: 'Ё', sub: 'Дактиль', desc: 'Сжаты, движение.' },
];

export default function SignLanguageScreen({ username, onLogout, onPracticeGesture }) {
  const [signs, setSigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [dailyGoal, setDailyGoal] = useState({ done: 2, target: 5 });

  const { progress, stats, streak, points } = useProgress(username);

  // ── Загрузка жестов ────────────────────────────────────────────
  const fetchSigns = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/signs`);
      const data = await res.json();
      if (data.signs && data.signs.length > 0) {
        setSigns(data.signs);
      } else {
        setSigns(FALLBACK_SIGNS);
      }
    } catch {
      setSigns(FALLBACK_SIGNS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSigns();
  }, [fetchSigns]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSigns();
    setRefreshing(false);
  }, [fetchSigns]);

  // ── Фильтрация по категории ────────────────────────────────────
  const filteredSigns = activeCategory === 'all'
    ? signs
    : signs.filter(s => s.category === activeCategory);

  // ── Прогресс жестов ────────────────────────────────────────────
  const completedIds = Object.entries(progress || {})
    .filter(([, p]) => p.learned)
    .map(([id]) => Number(id));

  const getGestureStatus = (gestureId) => {
    const p = progress?.[gestureId];
    if (!p) return 'new';
    if (p.learned) return 'learned';
    if ((p.attempts || 0) > 0) return 'in_progress';
    return 'new';
  };

  // ── Текущий жест для пути обучения ────────────────────────────
  const firstNewId = signs.find(s => !completedIds.includes(s.id))?.id || signs[0]?.id;

  // ── Ежедневная цель: кружки-чекбоксы ──────────────────────────
  const goalCircles = Array.from({ length: dailyGoal.target }, (_, i) => (
    <View key={i} style={[
      styles.goalCircle,
      i < dailyGoal.done && styles.goalCircleDone,
    ]}>
      {i < dailyGoal.done && <Text style={styles.goalCheck}>✓</Text>}
    </View>
  ));

  // ── Загрузка ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3c95bb" />
          <Text style={styles.loadingText}>Загрузка жестов...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3c95bb"
          />
        }
      >
        {/* ===== HERO БЛОК ===== */}
        <ProgressHero stats={stats} streak={streak} />

        {/* ===== ЕЖЕДНЕВНАЯ ЦЕЛЬ ===== */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Цель дня</Text>
            <Text style={styles.goalPoints}>{points || 0} ⚡</Text>
          </View>

          {/* Прогресс-бар */}
          <View style={styles.goalProgressTrack}>
            <View style={[styles.goalProgressFill, {
              width: `${Math.min(100, (dailyGoal.done / dailyGoal.target) * 100)}%`,
            }]} />
          </View>

          {/* Кружки-чекбоксы */}
          <View style={styles.goalCirclesRow}>
            {goalCircles}
            <Text style={styles.goalLabel}>
              {dailyGoal.done} из {dailyGoal.target}
            </Text>
          </View>

          {dailyGoal.done >= dailyGoal.target && (
            <Text style={styles.goalComplete}>🎉 Цель выполнена!</Text>
          )}
        </View>

        {/* ===== КАТЕГОРИИ ===== */}
        <CategoryFilter
          categories={CATEGORIES}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />

        {/* ===== СЕТКА ЖЕСТОВ ===== */}
        <View style={styles.grid}>
          {filteredSigns.length === 0 ? (
            <View style={styles.emptyGrid}>
              <Text style={styles.emptyText}>Нет жестов в этой категории</Text>
            </View>
          ) : (
            filteredSigns.map((sign, idx) => (
              <GestureCard
                key={sign.id}
                gesture={sign}
                index={idx}
                status={getGestureStatus(sign.id)}
                isLocked={false}
                onPress={() => onPracticeGesture?.(sign)}
              />
            ))
          )}
        </View>

        {/* ===== ПУТЬ ОБУЧЕНИЯ ===== */}
        {signs.length > 0 && (
          <LearningPath
            gestures={signs}
            completedIds={completedIds}
            currentId={firstNewId}
            onSelectGesture={onPracticeGesture}
          />
        )}

        {/* Нижний отступ */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f8fc',
  },
  scroll: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#3c95bb',
    fontWeight: '600',
  },

  // ── Ежедневная цель ───────────────────────────────────────────
  goalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#98cae1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#214559',
  },
  goalPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3c95bb',
  },
  goalProgressTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 14,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#3c95bb',
    borderRadius: 4,
  },
  goalCirclesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCircleDone: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  goalCheck: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 6,
  },
  goalComplete: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#22c55e',
    textAlign: 'center',
  },

  // ── Сетка жестов ──────────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingTop: 8,
    justifyContent: 'flex-start',
  },
  emptyGrid: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
});
