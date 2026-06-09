/**
 * LearningPath.jsx — визуальный путь обучения как в Duolingo.
 *
 * Кружки соединённые линией:
 *   - Пройденные — синие заполненные (#3c95bb)
 *   - Текущий — пульсирующая анимация
 *   - Будущие — серые (#cbd5e1)
 *
 * Каждый кружок = один жест.
 * При нажатии открывается практика.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const NODE_SIZE = 56;
const LINE_WIDTH = 4;
const NODE_GAP = 24;

function PathNode({ gesture, index, isCompleted, isCurrent, isLocked, onPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Анимация появления
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();

    // Пульсация текущего узла
    if (isCurrent) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start(pulse);
      };
      pulse();
    }
  }, [isCurrent]);

  const nodeColor = isCompleted
    ? '#3c95bb'
    : isCurrent
      ? '#3c95bb'
      : '#cbd5e1';

  const label = gesture?.name || gesture?.label || '';

  return (
    <Animated.View style={{ opacity, transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.nodeContainer}
        disabled={isLocked}
      >
        {/* Линия соединения (кроме последнего) */}
        {index < 10 && (
          <View style={[styles.line, {
            backgroundColor: isCompleted ? '#3c95bb' : '#cbd5e1',
          }]} />
        )}

        {/* Узел */}
        <View style={[styles.node, { backgroundColor: nodeColor }]}>
          {isCompleted ? (
            <Text style={styles.nodeCheck}>✓</Text>
          ) : isCurrent ? (
            <Text style={styles.nodeCurrent}>●</Text>
          ) : isLocked ? (
            <Text style={styles.nodeLock}>🔒</Text>
          ) : (
            <Text style={styles.nodeIndex}>{index + 1}</Text>
          )}
        </View>

        {/* Подпись */}
        <Text style={[styles.nodeLabel, {
          color: isCompleted || isCurrent ? '#214559' : '#94a3b8',
        }]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LearningPath({ gestures = [], completedIds = [], currentId, onSelectGesture }) {
  const scrollRef = useRef(null);

  const currentIndex = gestures.findIndex(g => g.id === currentId);

  // Автоскролл к текущему
  useEffect(() => {
    if (currentIndex >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          x: Math.max(0, currentIndex * (NODE_SIZE + NODE_GAP) - 100),
          animated: true,
        });
      }, 500);
    }
  }, [currentIndex]);

  if (!gestures || gestures.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Путь обучения пуст</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Путь обучения</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {gestures.slice(0, 12).map((g, idx) => {
          const isCompleted = completedIds.includes(g.id);
          const isCurrent = g.id === currentId;
          const isLocked = !isCompleted && !isCurrent && idx > currentIndex + 1;

          return (
            <PathNode
              key={g.id}
              gesture={g}
              index={idx}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isLocked={isLocked}
              onPress={() => !isLocked && onSelectGesture(g)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#214559',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  scroll: {
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    gap: NODE_GAP,
  },
  nodeContainer: {
    alignItems: 'center',
    width: NODE_SIZE,
  },
  line: {
    position: 'absolute',
    top: NODE_SIZE / 2,
    left: NODE_SIZE,
    width: NODE_GAP,
    height: LINE_WIDTH,
    borderRadius: LINE_WIDTH / 2,
    zIndex: -1,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#98cae1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nodeCheck: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  nodeCurrent: {
    color: '#fff',
    fontSize: 18,
  },
  nodeLock: {
    fontSize: 18,
  },
  nodeIndex: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nodeLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: NODE_SIZE + 10,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
});
