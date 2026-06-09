/**
 * GestureLearn.jsx — главный экран обучения жестам.
 *
 * Возможности:
 *   - Список жестов с группировкой по темам
 *   - Поиск по названию
 *   - Фильтр по теме и сложности
 *   - Прогресс пользователя (выучено X из 1000)
 *   - Переход к практике
 *   - Словарь с видео-эталонами
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import GestureCard from './GestureCard';
import GesturePractice from './GesturePractice';
import GestureProgress from './GestureProgress';
import useProgress from '../hooks/useProgress';

const API_URL = __DEV__
  ? 'http://192.168.1.100:8000'
  : 'https://hearless15.onrender.com';

const TOPICS = [
  'Все',
  'Приветствие',
  'Семья',
  'Еда',
  'Медицина',
  'Транспорт',
  'Цифры',
];

const DIFFICULTY_FILTERS = [
  { label: 'Все', value: 0 },
  { label: '⭐ Простой', value: 1 },
  { label: '⭐⭐ Средний', value: 2 },
  { label: '⭐⭐⭐ Сложный', value: 3 },
];

export default function GestureLearn({ username, onLogout }) {
  const [gestures, setGestures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('Все');
  const [selectedDifficulty, setSelectedDifficulty] = useState(0);
  const [practicingGesture, setPracticingGesture] = useState(null);
  const [showProgress, setShowProgress] = useState(false);

  const { progress, stats, streak, points, dailyGoal, markLearned } = useProgress(username);

  // ── Загрузка жестов ────────────────────────────────────────────
  const fetchGestures = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTopic !== 'Все') params.set('topic', selectedTopic);
      if (selectedDifficulty > 0) params.set('difficulty', selectedDifficulty);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_URL}/api/gestures?${params}`);
      const data = await res.json();
      setGestures(data.gestures || []);
    } catch (err) {
      console.warn('[GestureLearn] fetch error:', err);
      setGestures([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTopic, selectedDifficulty, search]);

  useEffect(() => {
    fetchGestures();
  }, [fetchGestures]);

  // ── Начать практику ────────────────────────────────────────────
  const handlePractice = (gesture) => {
    setPracticingGesture(gesture);
  };

  // ── Рендер элемента списка ─────────────────────────────────────
  const renderItem = ({ item }) => (
    <GestureCard
      gesture={item}
      progress={progress[item.id]}
      onPractice={() => handlePractice(item)}
    />
  );

  // ── Если практика активна — показываем её ──────────────────────
  if (practicingGesture) {
    return (
      <GesturePractice
        gesture={practicingGesture}
        username={username}
        onBack={() => setPracticingGesture(null)}
      />
    );
  }

  // ── Если показываем прогресс ───────────────────────────────────
  if (showProgress) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setShowProgress(false)}>
            <Text style={styles.backBtn}>← Назад</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Мой прогресс</Text>
          <View style={{ width: 60 }} />
        </View>
        <GestureProgress
          stats={stats}
          streak={streak}
          points={points}
          dailyGoal={dailyGoal}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Верхняя панель */}
      <View style={styles.topBar}>
        <Text style={styles.title}>Жестовый язык</Text>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.progressBtn}
            onPress={() => setShowProgress(true)}
          >
            <Text style={styles.progressBtnText}>
              {stats?.learned || 0} / {stats?.total || 1000}
            </Text>
          </TouchableOpacity>
          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>Выйти</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Поиск */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск жеста..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Фильтр по темам */}
      <FlatList
        horizontal
        data={TOPICS}
        keyExtractor={item => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.topicsContainer}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.topicChip,
              selectedTopic === item && styles.topicChipActive,
            ]}
            onPress={() => setSelectedTopic(item)}
          >
            <Text style={[
              styles.topicChipText,
              selectedTopic === item && styles.topicChipTextActive,
            ]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Фильтр по сложности */}
      <View style={styles.difficultyRow}>
        {DIFFICULTY_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.diffChip,
              selectedDifficulty === f.value && styles.diffChipActive,
            ]}
            onPress={() => setSelectedDifficulty(f.value)}
          >
            <Text style={[
              styles.diffChipText,
              selectedDifficulty === f.value && styles.diffChipTextActive,
            ]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Список жестов */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3c95bb" />
          <Text style={styles.loadingText}>Загрузка жестов...</Text>
        </View>
      ) : (
        <FlatList
          data={gestures}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Жесты не найдены</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f8fc',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#214559',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  progressBtn: {
    backgroundColor: '#cce4f0',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  progressBtnText: {
    color: '#214559',
    fontWeight: '700',
    fontSize: 13,
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutBtnText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  backBtn: {
    color: '#3c95bb',
    fontWeight: '700',
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#214559',
  },
  topicsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  topicChip: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  topicChipActive: {
    backgroundColor: '#3c95bb',
    borderColor: '#3c95bb',
  },
  topicChipText: {
    color: '#214559',
    fontWeight: '600',
    fontSize: 14,
  },
  topicChipTextActive: {
    color: '#fff',
  },
  difficultyRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  diffChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  diffChipActive: {
    backgroundColor: '#2c789d',
    borderColor: '#2c789d',
  },
  diffChipText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  diffChipTextActive: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#3c95bb',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '600',
  },
});
