/**
 * GesturePractice.jsx — практика жеста с камерой.
 *
 * Открывает фронтальную камеру, отправляет фреймы на бэкенд,
 * показывает распознанный жест в реальном времени.
 *
 * Визуальная обратная связь:
 *   - Зелёная рамка — жест верный
 *   - Красная рамка — неверный
 *   - Текст по центру
 *   - Анимация успеха при confidence > 85%
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Vibration,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import useGestureRecognition from '../hooks/useGestureRecognition';

const API_URL = __DEV__
  ? 'http://192.168.1.100:8000'          // ← заменить на IP бэкенда
  : 'https://hearless15.onrender.com';

const SUCCESS_THRESHOLD = 0.85;

export default function GesturePractice({ gesture, onBack, username }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  const {
    currentGesture,
    confidence,
    isCorrect,
    isChecking,
    error,
    startRecognition,
    stopRecognition,
  } = useGestureRecognition(API_URL, gesture?.name, username);

  // ── Запрос разрешения на камеру ────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // ── Запуск/остановка распознавания ─────────────────────────────
  useEffect(() => {
    if (cameraReady && hasPermission) {
      startRecognition();
    }
    return () => stopRecognition();
  }, [cameraReady, hasPermission]);

  // ── Анимация вспышки при успехе ────────────────────────────────
  useEffect(() => {
    if (isCorrect && confidence >= SUCCESS_THRESHOLD) {
      Vibration.vibrate(300);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
      // Сброс через 2 секунды
      const t = setTimeout(() => stopRecognition(), 2000);
      return () => clearTimeout(t);
    }
  }, [isCorrect, confidence]);

  if (hasPermission === null) {
    return <View style={styles.centered}><Text>Проверка разрешений...</Text></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Нет доступа к камере</Text>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Назад</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const borderColor = isCorrect
    ? '#22c55e'
    : (currentGesture && !isCorrect)
      ? '#ef4444'
      : '#3c95bb';

  const borderWidth = isCorrect ? 4 : 2;

  return (
    <SafeAreaView style={styles.container}>
      {/* Верхняя панель */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Назад</Text>
        </TouchableOpacity>
        <Text style={styles.targetGesture}>Цель: {gesture?.name || ''}</Text>
      </View>

      {/* Камера */}
      <View style={[styles.cameraContainer, { borderColor, borderWidth }]}>
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={CameraType.front}
          ratio="16:9"
          onCameraReady={() => setCameraReady(true)}
        >
          {/* Затемнение фона */}
          <View style={styles.cameraOverlay} />

          {/* Распознанный жест — по центру */}
          {currentGesture && (
            <View style={styles.gestureOverlay}>
              <Text style={[styles.gestureText, {
                color: isCorrect ? '#22c55e' : '#f3f8fc',
              }]}>
                {currentGesture}
              </Text>
              {confidence > 0 && (
                <Text style={styles.confidenceText}>
                  {Math.round(confidence * 100)}%
                </Text>
              )}
            </View>
          )}

          {/* Загрузка */}
          {isChecking && !currentGesture && (
            <Text style={styles.checkingText}>Распознавание...</Text>
          )}

          {/* Анимация вспышки */}
          <Animated.View
            pointerEvents="none"
            style={[styles.flash, { opacity: flashAnim }]}
          />
        </Camera>
      </View>

      {/* Инструкция внизу */}
      <View style={styles.instruction}>
        <Text style={styles.instructionText}>
          Покажите жест перед камерой
        </Text>
        <Text style={styles.instructionSub}>
          {isCorrect
            ? '✅ Жест распознан!'
            : 'Держите руку в центре кадра'}
        </Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>⚠ {error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#214559',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f8fc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(33, 69, 89, 0.95)',
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3c95bb',
    borderRadius: 10,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  targetGesture: {
    color: '#f3f8fc',
    fontSize: 18,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  gestureOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(33, 69, 89, 0.75)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  gestureText: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  confidenceText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f3f8fc',
    marginTop: 4,
    opacity: 0.8,
  },
  checkingText: {
    color: '#f3f8fc',
    fontSize: 20,
    fontWeight: '600',
    opacity: 0.7,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#22c55e',
  },
  instruction: {
    padding: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: '#f3f8fc',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionSub: {
    color: '#3c95bb',
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBoxText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 13,
  },
});
