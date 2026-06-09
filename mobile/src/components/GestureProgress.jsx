/**
 * GestureProgress.jsx — прогресс и геймификация.
 *
 * Показывает:
 *   - Количество выученных жестов (X из 1000)
 *   - Стрик дней подряд
 *   - Очки
 *   - Достижения: "10 жестов", "50 жестов", "100 жестов"
 *   - Ежедневная цель: 5 новых жестов
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ACHIEVEMENTS = [
  { id: '10', label: '10 жестов', icon: '🌱', threshold: 10 },
  { id: '50', label: '50 жестов', icon: '🌿', threshold: 50 },
  { id: '100', label: '100 жестов', icon: '🌳', threshold: 100 },
  { id: '250', label: '250 жестов', icon: '🏆', threshold: 250 },
  { id: '500', label: '500 жестов', icon: '👑', threshold: 500 },
  { id: '1000', label: '1000 жестов', icon: '🌟', threshold: 1000 },
];

export default function GestureProgress({ stats, streak, points, dailyGoal }) {
  const learned = stats?.learned || 0;
  const total = stats?.total || 1000;
  const progressPct = total > 0 ? (learned / total) * 100 : 0;
  const dailyProgress = dailyGoal?.done || 0;
  const dailyTarget = dailyGoal?.target || 5;

  return (
    <View style={styles.container}>
      {/* Общий прогресс */}
      <View style={styles.statCard}>
        <Text style={styles.statNumber}>{learned}</Text>
        <Text style={styles.statLabel}>из {total} жестов</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {/* Стрик и очки */}
      <View style={styles.row}>
        <View style={styles.miniCard}>
          <Text style={styles.miniValue}>{streak || 0} 🔥</Text>
          <Text style={styles.miniLabel}>дней подряд</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniValue}>{points || 0} ⚡</Text>
          <Text style={styles.miniLabel}>очков</Text>
        </View>
      </View>

      {/* Ежедневная цель */}
      <View style={styles.goalCard}>
        <Text style={styles.goalTitle}>Ежедневная цель</Text>
        <Text style={styles.goalText}>
          Выучено {dailyProgress} из {dailyTarget} жестов
        </Text>
        <View style={styles.goalTrack}>
          <View style={[styles.goalFill, {
            width: `${Math.min(100, (dailyProgress / dailyTarget) * 100)}%`,
            backgroundColor: dailyProgress >= dailyTarget ? '#22c55e' : '#3c95bb',
          }]} />
        </View>
        {dailyProgress >= dailyTarget && (
          <Text style={styles.goalDone}>✅ Цель достигнута!</Text>
        )}
      </View>

      {/* Достижения */}
      <Text style={styles.sectionTitle}>Достижения</Text>
      <View style={styles.achievementsRow}>
        {ACHIEVEMENTS.map(a => {
          const unlocked = learned >= a.threshold;
          return (
            <View key={a.id} style={[styles.achievementBadge, {
              opacity: unlocked ? 1 : 0.35,
              backgroundColor: unlocked ? '#cce4f0' : '#e2e8f0',
            }]}>
              <Text style={styles.achievementIcon}>{a.icon}</Text>
              <Text style={[styles.achievementLabel, {
                color: unlocked ? '#214559' : '#94a3b8',
              }]}>{a.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  statCard: {
    backgroundColor: '#cce4f0',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#214559',
  },
  statLabel: {
    fontSize: 16,
    color: '#3c95bb',
    fontWeight: '600',
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#f3f8fc',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#cce4f0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  miniValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#214559',
  },
  miniLabel: {
    fontSize: 13,
    color: '#3c95bb',
    fontWeight: '500',
    marginTop: 2,
  },
  goalCard: {
    backgroundColor: '#cce4f0',
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#214559',
    marginBottom: 6,
  },
  goalText: {
    fontSize: 14,
    color: '#3c95bb',
    marginBottom: 10,
  },
  goalTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#f3f8fc',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalDone: {
    marginTop: 8,
    color: '#22c55e',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#214559',
    marginBottom: 12,
  },
  achievementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achievementBadge: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 80,
  },
  achievementIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  achievementLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
