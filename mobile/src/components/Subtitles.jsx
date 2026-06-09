/**
 * Subtitles.jsx
 *
 * Компонент стриминговых субтитров для Hearless Mobile.
 * Принимает массив субтитров из хука useSTT и отображает
 * последние 3 строки с плавной анимацией.
 *
 * Цвета Hearless:
 *   Фон субтитров: rgba(33, 69, 89, 0.85)
 *   Текст: #f3f8fc
 *   Акцент: #3c95bb
 */

import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';

// ── Константы ─────────────────────────────────────────────────────────
const MAX_LINES = 3;
const FONT_SIZE = 22;
const ANIM_DURATION = 300;

// ── Иконки качества соединения ────────────────────────────────────────
const QUALITY_LABELS = {
  good: { text: '🟢', color: '#22c55e' },
  degraded: { text: '🟡', color: '#eab308' },
  offline: { text: '🔴', color: '#ef4444' },
};

// ── Компонент одной строки субтитра ───────────────────────────────────
function SubtitleLine({ text, isNew }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      opacity.setValue(1);
      translateY.setValue(0);
    }
  }, [isNew]);

  return (
    <Animated.View
      style={[
        styles.lineContainer,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={styles.lineText} numberOfLines={2}>
        {text}
      </Text>
    </Animated.View>
  );
}

// ── Компонент индикатора качества ─────────────────────────────────────
function QualityBadge({ quality }) {
  const info = QUALITY_LABELS[quality] || QUALITY_LABELS.offline;
  return (
    <View style={styles.qualityBadge}>
      <Text style={[styles.qualityDot, { color: info.color }]}>
        {info.text}
      </Text>
    </View>
  );
}

// ── Главный компонент ─────────────────────────────────────────────────
export default function Subtitles({
  subtitles = [],
  connectionQuality = 'offline',
  isListening = false,
  onTap,     // колбэк при тапе по субтитрам (например, пауза/старт)
}) {
  // Берём последние MAX_LINES строк
  const visibleLines = useMemo(() => {
    const nonEmpty = subtitles.filter(s => s.text.trim());
    return nonEmpty.slice(-MAX_LINES);
  }, [subtitles]);

  const hasNewId = useRef(null);

  // Определяем, какая строка новая (для анимации)
  const linesWithNewFlag = useMemo(() => {
    if (visibleLines.length === 0) return [];

    const lastId = visibleLines[visibleLines.length - 1].id;
    const isNew = lastId !== hasNewId.current;
    hasNewId.current = lastId;

    return visibleLines.map((line, idx) => ({
      ...line,
      isNew: idx === visibleLines.length - 1 && isNew,
    }));
  }, [visibleLines]);

  // Если нет активной записи — показываем заглушку
  if (!isListening) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>
            Нажмите «Слушать» для старта субтитров
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Индикатор качества */}
      <QualityBadge quality={connectionQuality} />

      {/* Строки субтитров */}
      <View style={styles.linesWrapper}>
        {linesWithNewFlag.length === 0 ? (
          <View style={styles.lineContainer}>
            <Text style={[styles.lineText, styles.waitingText]}>
              Ожидание речи...
            </Text>
          </View>
        ) : (
          linesWithNewFlag.map((line) => (
            <SubtitleLine
              key={line.id}
              text={line.text}
              isNew={line.isNew}
            />
          ))
        )}
      </View>

      {/* Прозрачная кнопка на весь компонент (для тапа) */}
      <View
        style={StyleSheet.absoluteFill}
        onTouchEnd={onTap}
      />
    </View>
  );
}

// ── Стили ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  linesWrapper: {
    backgroundColor: 'rgba(33, 69, 89, 0.85)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backdropFilter: 'blur(12px)',  // iOS only, игнорируется на Android
  },
  lineContainer: {
    marginVertical: 3,
  },
  lineText: {
    color: '#f3f8fc',
    fontSize: FONT_SIZE,
    fontWeight: '500',
    lineHeight: FONT_SIZE * 1.35,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  waitingText: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
  // Заглушка когда запись неактивна
  placeholderBox: {
    backgroundColor: 'rgba(33, 69, 89, 0.6)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  placeholderText: {
    color: '#f3f8fc',
    fontSize: 18,
    opacity: 0.7,
    fontWeight: '400',
  },
  // Бейдж качества
  qualityBadge: {
    position: 'absolute',
    top: -30,
    right: 0,
    zIndex: 10,
  },
  qualityDot: {
    fontSize: 14,
  },
});
