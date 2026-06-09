/**
 * useProgress.js — сохранение и загрузка прогресса пользователя
 * по жестам из Supabase через бэкенд + AsyncStorage для локальных данных.
 *
 * ВНИМАНИЕ: для локального хранения использует
 * `@react-native-async-storage/async-storage` (не localStorage — его нет в RN).
 *
 * Возвращает:
 *   progress      — { [gesture_id]: { learned, attempts, best_confidence } }
 *   stats         — { learned, total, by_topic }
 *   streak        — количество дней подряд
 *   points        — очки
 *   dailyGoal     — { done, target }
 *   markLearned   — отметить жест как выученный
 *   addPoints     — добавить очки
 *   refresh       — перезагрузить прогресс
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__
  ? 'http://192.168.1.100:8000'
  : 'https://hearless15.onrender.com';

// ── Ключи для AsyncStorage ───────────────────────────────────────────
const STREAK_KEY = 'hearless_streak';
const POINTS_KEY = 'hearless_points';
const GOAL_KEY = 'hearless_daily_goal';
const FAVORITES_KEY = 'hearless_favorites';

async function getLocal(key, def) {
  try {
    const val = await AsyncStorage.getItem(key);
    return val !== null ? JSON.parse(val) : def;
  } catch {
    return def;
  }
}

async function setLocal(key, val) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export default function useProgress(username) {
  const [progress, setProgress] = useState({});
  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [dailyGoal, setDailyGoal] = useState({ done: 0, target: 5 });
  const [favorites, setFavorites] = useState([]);

  // ── Загрузка прогресса из Supabase + AsyncStorage ──────────────
  const refresh = useCallback(async () => {
    if (!username) return;
    try {
      const res = await fetch(`${API_URL}/api/gestures/stats/${username}`);
      const data = await res.json();
      setStats(data);

      const res2 = await fetch(`${API_URL}/api/signs/progress/${username}`);
      const data2 = await res2.json();
      if (data2.progress) {
        const map = {};
        data2.progress.forEach(p => { map[p.sign_id] = p; });
        setProgress(map);
      }
    } catch (err) {
      console.warn('[useProgress] fetch error:', err);
    }

    // Локальные данные из AsyncStorage
    setStreak(await getLocal(STREAK_KEY, 0));
    setPoints(await getLocal(POINTS_KEY, 0));
    setDailyGoal(await getLocal(GOAL_KEY, { done: 0, target: 5, date: null }));
    setFavorites(await getLocal(FAVORITES_KEY, []));
  }, [username]);

  // ── Загрузка при монтировании и смене пользователя ────────────
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Обновление ежедневной цели (сброс если новый день) ────────
  const updateDailyGoal = useCallback(async () => {
    const goal = await getLocal(GOAL_KEY, { done: 0, target: 5, date: null });
    const today = new Date().toDateString();
    if (goal.date !== today) {
      goal.done = 0;
      goal.date = today;
      await setLocal(GOAL_KEY, goal);
    }
    setDailyGoal(goal);
    return goal;
  }, []);

  // ── Отметить жест как выученный ───────────────────────────────
  const markLearned = useCallback(async (gestureId, confidence = 1.0) => {
    if (!username) return;

    try {
      const res = await fetch(`${API_URL}/api/gestures/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          gesture_id: gestureId,
          learned: confidence > 0.85,
          confidence,
        }),
      });
      const data = await res.json();
      if (data.success) refresh();
    } catch {}

    if (confidence > 0.85) {
      const s = await getLocal(STREAK_KEY, 0);
      const newStreak = s + 1;
      await setLocal(STREAK_KEY, newStreak);
      setStreak(newStreak);

      const p = await getLocal(POINTS_KEY, 0);
      const newPoints = p + 10;
      await setLocal(POINTS_KEY, newPoints);
      setPoints(newPoints);

      const goal = await getLocal(GOAL_KEY, { done: 0, target: 5, date: null });
      const today = new Date().toDateString();
      if (goal.date !== today) {
        goal.date = today;
        goal.done = 0;
      }
      goal.done += 1;
      await setLocal(GOAL_KEY, goal);
      setDailyGoal(goal);
    }
  }, [username, refresh]);

  // ── Добавить очки ─────────────────────────────────────────────
  const addPoints = useCallback(async (amount) => {
    const p = await getLocal(POINTS_KEY, 0);
    const newPoints = p + amount;
    await setLocal(POINTS_KEY, newPoints);
    setPoints(newPoints);
  }, []);

  // ── Избранное ─────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (gestureId) => {
    const prev = await getLocal(FAVORITES_KEY, []);
    const next = prev.includes(gestureId)
      ? prev.filter(id => id !== gestureId)
      : [...prev, gestureId];
    await setLocal(FAVORITES_KEY, next);
    setFavorites(next);
  }, []);

  return {
    progress,
    stats,
    streak,
    points,
    dailyGoal,
    favorites,
    markLearned,
    addPoints,
    refresh,
    toggleFavorite,
  };
}
