/**
 * GestureChecker.jsx
 *
 * Главный компонент проверки жестов для Hearless Mobile.
 *
 * Возможности:
 * 1. Захват видео с камеры + MediaPipe Hands (21 точка)
 * 2. Проверка формы, позиции и движения жеста
 * 3. Процент точности (0–100%) по трём компонентам
 * 4. Наложение эталонного жеста поверх руки пользователя
 * 5. Замедленный режим с разбивкой на фазы
 * 6. Обратный отсчёт 3-2-1
 * 7. Анимации успеха / ошибки
 * 8. График прогресса за неделю
 *
 * Зависимости (npm install):
 *   expo install expo-camera
 *   npx expo install react-native-webview react-native-svg
 *
 * Цветовая схема Hearless:
 *   Фон: #f3f8fc
 *   Акцент: #3c95bb
 *   Успех: #22c55e
 *   Ошибка: #ef4444
 *   Заголовки: #214559
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { WebView } from 'react-native-webview';
import Svg, { Circle, Line, G } from 'react-native-svg';

import { evaluateGesture, checkConstraints, PASS_THRESHOLD } from '../utils/gestureComparison';
import { GESTURE_REFERENCE, GESTURE_LIST } from '../utils/gestureReferenceData';

// ─────────────────────────────────────────────────
// Константы
// ─────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAM_PREVIEW_SIZE = SCREEN_WIDTH;

const FRAME_INTERVAL_MS = 300;        // захват кадра каждые 300 ms
const HOLD_DURATION_MS = 2000;        // сколько держать позицию в замедленном режиме
const COUNTDOWN_SECONDS = 3;          // обратный отсчёт
const ACCUMULATE_FRAMES = 3;          // сколько успешных кадров подряд для зачёта
const WEEKLY_DAYS = 7;                // дней в графике прогресса

// HTML для WebView с MediaPipe Hands
// Загружает MediaPipe из CDN, принимает base64 изображения через postMessage
const MEDIAPIPE_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"></head>
<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;">
  <canvas id="canvas" style="display:none;"></canvas>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
  <script>
    let hands = null;
    let pending = false;
    function init() {
      hands = new Hands({locateFile: (f) => 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + f});
      hands.setOptions({maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.65, minTrackingConfidence: 0.65});
      hands.onResults((results) => {
        pending = false;
        const out = {hands: []};
        if (results.multiHandLandmarks) {
          for (const hlm of results.multiHandLandmarks) {
            const pts = hlm.map(p => [p.x, p.y, p.z]);
            out.hands.push(pts);
          }
        }
        if (results.multiHandedness) {
          out.handedness = results.multiHandedness.map(h => h.label);
        }
        try { window.ReactNativeWebView.postMessage(JSON.stringify(out)); } catch(e) {}
      });
      document.title = 'mp_ready';
    }
    // Принимаем base64 изображение и отправляем в MediaPipe
    async function processFrame(base64) {
      if (pending || !hands) return;
      pending = true;
      const img = new Image();
      img.onload = async () => { try { await hands.send({image: img}); } catch(e) {} };
      img.onerror = () => { pending = false; };
      img.src = base64;
    }
    // Слушаем команды из React Native
    window.addEventListener('message', (e) => {
      if (e.data === 'init') { init(); }
      else if (typeof e.data === 'string' && e.data.startsWith('data:')) { processFrame(e.data); }
    });
    // Сообщаем о готовности
    setTimeout(() => {
      init();
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ready: true})); } catch(e) {}
    }, 500);
  </script>
</body>
</html>
`;

// ─────────────────────────────────────────────────
// Вспомогательные компоненты
// ─────────────────────────────────────────────────

/** Полоска прогресса для отображения процента */
function ProgressBar({ value, color = '#3c95bb', height = 8, label }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressRow}>
      {label && <Text style={styles.progressLabel}>{label}</Text>}
      <View style={[styles.progressTrack, { height }]}>
        <View style={[styles.progressFill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.progressValue, { color }]}>{clamped}%</Text>
    </View>
  );
}

/** Мини-график прогресса за неделю */
function WeeklyChart({ data, color = '#3c95bb' }) {
  const maxVal = Math.max(...data, 1);
  const barW = (SCREEN_WIDTH - 100) / WEEKLY_DAYS - 4;
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date().getDay();
  const startIdx = ((today + 6) % 7); // понедельник = 0

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Прогресс за неделю</Text>
      <View style={styles.chartBars}>
        {data.slice(0, WEEKLY_DAYS).map((val, i) => {
          const dayIdx = (startIdx + i) % 7;
          const h = maxVal > 0 ? (val / maxVal) * 80 : 0;
          return (
            <View key={i} style={styles.chartCol}>
              <View style={[styles.chartBar, { height: Math.max(4, h), backgroundColor: val >= 80 ? '#22c55e' : color }]} />
              <Text style={styles.chartDayLabel}>{days[dayIdx]}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Наложение эталонного жеста (полупрозрачные точки + соединения) */
function GestureOverlay({ reference, detected, issues, size }) {
  const w = size;
  const h = size;

  // Соединения между точками MediaPipe
  const HAND_CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17],
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={w} height={h}>

        {/* Эталонные соединения (полупрозрачные зелёные) */}
        {reference && HAND_CONNECTIONS.map(([a, b], i) => (
          <Line
            key={`rc${i}`}
            x1={reference[a]?.[0] * w}
            y1={reference[a]?.[1] * h}
            x2={reference[b]?.[0] * w}
            y2={reference[b]?.[1] * h}
            stroke="rgba(34, 197, 94, 0.35)"
            strokeWidth={2}
          />
        ))}

        {/* Эталонные точки (полупрозрачные зелёные круги) */}
        {reference?.map((p, i) => (
          <Circle
            key={`rp${i}`}
            cx={p[0] * w}
            cy={p[1] * h}
            r={5}
            fill="rgba(34, 197, 94, 0.5)"
          />
        ))}

        {/* Детектированные точки (синие) */}
        {detected?.map((p, i) => (
          <Circle
            key={`dp${i}`}
            cx={p[0] * w}
            cy={p[1] * h}
            r={i === 0 ? 5 : 3.5}
            fill={i === 0 ? '#ef4444' : '#3c95bb'}
          />
        ))}

        {/* Детектированные соединения (синие) */}
        {detected && HAND_CONNECTIONS.map(([a, b], i) => (
          detected[a] && detected[b] ? (
            <Line
              key={`dc${i}`}
              x1={detected[a][0] * w}
              y1={detected[a][1] * h}
              x2={detected[b][0] * w}
              y2={detected[b][1] * h}
              stroke="#3c95bb"
              strokeWidth={1.5}
            />
          ) : null
        ))}

        {/* Различия эталон ↔ детект (красные линии) */}
        {reference && detected && HAND_CONNECTIONS.map(([a, b], i) => {
          const refA = reference[a]; const refB = reference[b];
          const detA = detected[a]; const detB = detected[b];
          if (!refA || !refB || !detA || !detB) return null;
          const midRefX = (refA[0] + refB[0]) / 2 * w;
          const midRefY = (refA[1] + refB[1]) / 2 * h;
          const midDetX = (detA[0] + detB[0]) / 2 * w;
          const midDetY = (detA[1] + detB[1]) / 2 * h;
          const d = Math.hypot(midRefX - midDetX, midRefY - midDetY);
          if (d < 8) return null;
          return (
            <Line
              key={`diff${i}`}
              x1={midRefX}
              y1={midRefY}
              x2={midDetX}
              y2={midDetY}
              stroke="rgba(239, 68, 68, 0.5)"
              strokeWidth={1.5}
              strokeDasharray="4,4"
            />
          );
        })}

      </Svg>
    </View>
  );
}

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────

export default function GestureChecker({ gestureId, onComplete, onBack }) {
  // ── Состояния ──
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [handedness, setHandedness] = useState([]);
  const [accuracy, setAccuracy] = useState({ total: 0, shape: 0, position: 0, movement: 0, passed: false });
  const [issues, setIssues] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);

  // Замедленный режим
  const [isSlowMotion, setIsSlowMotion] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseHolding, setPhaseHolding] = useState(false);
  const [phaseHeld, setPhaseHeld] = useState(false);

  // Результат
  const [result, setResult] = useState(null); // 'success' | 'fail' | null
  const [animateSuccess] = useState(() => new Animated.Value(0));
  const [animateFail] = useState(() => new Animated.Value(0));

  // Прогресс
  const [weeklyData, setWeeklyData] = useState(Array(WEEKLY_DAYS).fill(0));
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [successfulAttempts, setSuccessfulAttempts] = useState(0);

  // ── Refs ──
  const cameraRef = useRef(null);
  const webViewRef = useRef(null);
  const frameTimer = useRef(null);
  const prevFrameRef = useRef(null);
  const successCounter = useRef(0);
  const holdTimer = useRef(null);
  const isMounted = useRef(true);

  // ── Данные выбранного жеста ──
  const gestureData = useMemo(() => {
    return gestureId ? GESTURE_REFERENCE[gestureId] : null;
  }, [gestureId]);

  const currentPhases = useMemo(() => {
    return gestureData?.phases || [];
  }, [gestureData]);

  // ── Эффекты ──

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Запрос разрешения камеры
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Управление циклом захвата кадров
  useEffect(() => {
    if (cameraReady && isChecking && !showCountdown) {
      startFrameCapture();
    } else {
      stopFrameCapture();
    }
    return () => stopFrameCapture();
  }, [cameraReady, isChecking, showCountdown]);

  // Сброс при смене жеста
  useEffect(() => {
    resetState();
  }, [gestureId]);

  // ── Функции ──

  /** Сбросить всё */
  const resetState = useCallback(() => {
    setLandmarks(null);
    setAccuracy({ total: 0, shape: 0, position: 0, movement: 0, passed: false });
    setIssues([]);
    setIsChecking(false);
    setShowCountdown(false);
    setCountdown(0);
    setResult(null);
    setCurrentPhase(0);
    setPhaseHolding(false);
    setPhaseHeld(false);
    successCounter.current = 0;
    animateSuccess.setValue(0);
    animateFail.setValue(0);
  }, []);

  /** Запустить цикл захвата кадров */
  const startFrameCapture = useCallback(() => {
    stopFrameCapture();
    frameTimer.current = setInterval(captureFrame, FRAME_INTERVAL_MS);
  }, []);

  /** Остановить цикл захвата */
  const stopFrameCapture = useCallback(() => {
    if (frameTimer.current) {
      clearInterval(frameTimer.current);
      frameTimer.current = null;
    }
  }, []);

  /** Захватить кадр с камеры и отправить в WebView */
  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.5,
        exif: false,
        skipProcessing: true,
      });
      if (photo?.base64 && webViewRef.current) {
        webViewRef.current.postMessage(`data:image/jpeg;base64,${photo.base64}`);
      }
    } catch (err) {
      // Тихий сбой — кадр пропускаем
    }
  }, [cameraReady]);

  /** Обработка результатов MediaPipe */
  const handleMediaPipeResult = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.ready) {
        // WebView с MediaPipe загрузился
        return;
      }
      if (data.hands && data.hands.length > 0) {
        const pts = data.hands[0];
        setLandmarks(pts);
        setHandedness(data.handedness || []);

        if (gestureData && isChecking && pts.length >= 21) {
          const prev = prevFrameRef.current;
          const result = evaluateGesture(pts, gestureData, prev);
          setAccuracy(result);

          // Проверка дополнительных ограничений
          const constraintIssues = checkConstraints(pts, gestureData.constraints || {});
          setIssues(constraintIssues);

          // Обработка зачёта
          if (result.passed && constraintIssues.length === 0) {
            successCounter.current += 1;
            if (successCounter.current >= ACCUMULATE_FRAMES) {
              handleSuccess();
            }
          } else {
            successCounter.current = 0;
          }

          // В замедленном режиме — проверка удержания фазы
          if (isSlowMotion && currentPhase < currentPhases.length) {
            const phaseRef = currentPhases[currentPhase].landmarks;
            if (phaseRef && pts.length >= 21) {
              const phaseResult = evaluateGesture(pts, { landmarks: phaseRef }, prev);
              if (phaseResult.passed && !phaseHeld) {
                setPhaseHolding(true);
                if (!holdTimer.current) {
                  holdTimer.current = setTimeout(() => {
                    if (isMounted.current) {
                      setPhaseHeld(true);
                      setPhaseHolding(false);
                      Vibration.vibrate(100);
                    }
                  }, HOLD_DURATION_MS);
                }
              } else {
                if (holdTimer.current) {
                  clearTimeout(holdTimer.current);
                  holdTimer.current = null;
                }
                setPhaseHolding(false);
              }
            }
          }

          // Сохраняем для сравнения движения в следующем кадре
          prevFrameRef.current = { detected: pts, reference: gestureData.landmarks };
        }
      }
    } catch (err) {
      // ignore parse errors
    }
  }, [gestureData, isChecking, isSlowMotion, currentPhase, currentPhases]);

  /** Успешный зачёт */
  const handleSuccess = useCallback(() => {
    successCounter.current = 0;
    setResult('success');
    setIsChecking(false);
    stopFrameCapture();
    Vibration.vibrate([0, 100, 50, 100]);

    Animated.sequence([
      Animated.timing(animateSuccess, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(animateSuccess, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    setSuccessfulAttempts(prev => prev + 1);
    setTotalAttempts(prev => prev + 1);
    updateWeeklyProgress(true);
    onComplete?.(true);
  }, []);

  /** Обновить недельный прогресс */
  const updateWeeklyProgress = useCallback((success) => {
    setWeeklyData(prev => {
      const today = new Date().getDay();
      const idx = (today + 6) % 7; // Пн=0
      const copy = [...prev];
      copy[idx] = Math.min(100, (copy[idx] || 0) + (success ? 20 : 5));
      return copy;
    });
  }, []);

  /** Запустить проверку с обратным отсчётом */
  const startCheck = useCallback(async () => {
    resetState();
    setShowCountdown(true);
    setCountdown(COUNTDOWN_SECONDS);

    for (let i = COUNTDOWN_SECONDS; i > 0; i--) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!isMounted.current) return;
      setCountdown(i - 1);
    }

    if (isMounted.current) {
      setShowCountdown(false);
      setIsChecking(true);
    }
  }, []);

  /** Перейти к следующей фазе замедленного режима */
  const nextPhase = useCallback(() => {
    if (currentPhase < currentPhases.length - 1) {
      setCurrentPhase(p => p + 1);
      setPhaseHeld(false);
      setPhaseHolding(false);
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
      successCounter.current = 0;
    } else {
      // Все фазы пройдены
      handleSuccess();
    }
  }, [currentPhase, currentPhases, handleSuccess]);

  /** Попробовать снова */
  const retry = useCallback(() => {
    resetState();
    animateSuccess.setValue(0);
    animateFail.setValue(0);
    setTotalAttempts(prev => prev + 1);
    startCheck();
  }, [startCheck]);

  // ── Стили анимаций ──

  const successOverlayStyle = {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#22c55e',
    opacity: animateSuccess.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
  };

  const failOverlayStyle = {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ef4444',
    opacity: animateFail.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
  };

  // ── Рендер ──

  // Нет разрешения на камеру
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.permissionTitle}>Доступ к камере</Text>
          <Text style={styles.permissionText}>
            Для проверки жестов нужен доступ к фронтальной камере.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryButtonText}>Разрешить доступ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>

        {/* ─── Шапка ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {gestureData?.icon} {gestureData?.label || 'Проверка жеста'}
            </Text>
            <Text style={styles.headerSub}>{gestureData?.description}</Text>
          </View>
          <TouchableOpacity
            style={[styles.slowMoToggle, isSlowMotion && styles.slowMoToggleActive]}
            onPress={() => setIsSlowMotion(!isSlowMotion)}
          >
            <Text style={[styles.slowMoText, isSlowMotion && styles.slowMoTextActive]}>
              {isSlowMotion ? '🐢' : '⚡'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ КАМЕРА ═══ */}
        <View style={styles.cameraWrapper}>
          {showCountdown && (
            <View style={styles.countdownOverlay}>
              <Text style={styles.countdownNumber}>
                {countdown > 0 ? countdown : '🏁'}
              </Text>
            </View>
          )}

          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={CameraType.front}
            ratio="1:1"
            onCameraReady={() => setCameraReady(true)}
          />

          {/* Наложение эталона */}
          {gestureData && !showCountdown && (
            <GestureOverlay
              reference={isSlowMotion && currentPhases[currentPhase]
                ? currentPhases[currentPhase].landmarks
                : gestureData.landmarks}
              detected={landmarks}
              issues={issues}
              size={CAM_PREVIEW_SIZE}
            />
          )}

          {/* Анимация успеха/ошибки */}
          {result === 'success' && <Animated.View style={successOverlayStyle} />}
          {result === 'fail' && <Animated.View style={failOverlayStyle} />}

          {/* Индикатор проверки */}
          {isChecking && (
            <View style={styles.checkingBadge}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.checkingText}>Проверка...</Text>
            </View>
          )}
        </View>

        {/* ═══ ИНФОРМАЦИЯ О ФАЗЕ (замедленный режим) ═══ */}
        {isSlowMotion && !showCountdown && result !== 'success' && (
          <View style={styles.phaseIndicator}>
            <Text style={styles.phaseTitle}>
              Фаза {currentPhase + 1} из {currentPhases.length}
            </Text>
            {currentPhases[currentPhase] && (
              <Text style={styles.phaseName}>{currentPhases[currentPhase].name}</Text>
            )}
            {phaseHolding && (
              <Text style={styles.phaseHint}>⏳ Держите эту позицию...</Text>
            )}
            {phaseHeld && (
              <View style={styles.phaseComplete}>
                <Text style={styles.phaseCompleteText}>✅ Фаза пройдена!</Text>
                {currentPhase < currentPhases.length - 1 ? (
                  <TouchableOpacity style={styles.nextPhaseButton} onPress={nextPhase}>
                    <Text style={styles.nextPhaseButtonText}>Следующая фаза →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.nextPhaseButton} onPress={nextPhase}>
                    <Text style={styles.nextPhaseButtonText}>Завершить →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* ═══ ТОЧНОСТЬ ═══ */}
        {!showCountdown && result !== 'success' && (
          <View style={styles.accuracyPanel}>
            <Text style={styles.accuracyTitle}>Точность выполнения</Text>

            <ProgressBar
              label="Форма руки"
              value={accuracy.shape}
              color="#3c95bb"
            />
            <ProgressBar
              label="Позиция"
              value={accuracy.position}
              color="#3b82f6"
            />
            <ProgressBar
              label="Движение"
              value={accuracy.movement}
              color="#8b5cf6"
            />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Общий результат</Text>
              <Text
                style={[
                  styles.totalValue,
                  { color: accuracy.total >= PASS_THRESHOLD ? '#22c55e' : '#ef4444' },
                ]}
              >
                {accuracy.total}%
              </Text>
            </View>

            {/* Текстовые подсказки */}
            {issues.length > 0 && (
              <View style={styles.issuesContainer}>
                {issues.map((issue, i) => (
                  <View key={i} style={styles.issueRow}>
                    <Text style={styles.issueBullet}>•</Text>
                    <Text style={styles.issueText}>{issue}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ═══ РЕЗУЛЬТАТ ═══ */}
        {result === 'success' && (
          <View style={styles.resultPanel}>
            <Text style={styles.resultEmoji}>🎉</Text>
            <Text style={styles.resultTitle}>Жест засчитан!</Text>
            <Text style={styles.resultScore}>
              Точность: {Math.max(accuracy.total, PASS_THRESHOLD)}%
            </Text>
            <View style={styles.resultButtons}>
              <TouchableOpacity style={styles.primaryButton} onPress={retry}>
                <Text style={styles.primaryButtonText}>Попробовать снова</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
                <Text style={styles.secondaryButtonText}>К списку жестов</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {result === 'fail' && (
          <View style={styles.failPanel}>
            <Text style={styles.failEmoji}>😔</Text>
            <Text style={styles.failTitle}>Попробуйте ещё раз</Text>
            <Text style={styles.failScore}>Точность: {accuracy.total}%</Text>
            <Text style={styles.failHint}>Старайтесь точнее повторять положение пальцев</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={retry}>
              <Text style={styles.primaryButtonText}>Попробовать снова</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ ЭТАЛОННЫЙ ЖЕСТ (повторный показ) ═══ */}
        {!isChecking && !showCountdown && result !== 'success' && (
          <TouchableOpacity style={styles.referenceButton} onPress={() => {
            // Показать эталон — краткая вибрация как подсказка
            Vibration.vibrate(50);
          }}>
            <Text style={styles.referenceButtonText}>
              👆 Показать эталон ещё раз
            </Text>
          </TouchableOpacity>
        )}

        {/* ═══ НЕДЕЛЬНЫЙ ПРОГРЕСС ═══ */}
        {!isChecking && (
          <WeeklyChart data={weeklyData} />
        )}

        {/* ═══ СТАТИСТИКА ═══ */}
        {!isChecking && (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalAttempts}</Text>
              <Text style={styles.statLabel}>Всего попыток</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#22c55e' }]}>{successfulAttempts}</Text>
              <Text style={styles.statLabel}>Успешно</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: '#3c95bb' }]}>
                {totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Успешность</Text>
            </View>
          </View>
        )}

        {/* ═══ КНОПКА СТАРТА ═══ */}
        {!isChecking && !showCountdown && result !== 'success' && (
          <TouchableOpacity style={styles.startButton} onPress={startCheck}>
            <Text style={styles.startButtonText}>
              {result === 'fail' ? '🔄 Повторить проверку' : '▶ Начать проверку'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── Спэйсер ─── */}
        <View style={{ height: 40 }} />

      </ScrollView>

      {/* ═══ СКРЫТЫЙ WEBVIEW ДЛЯ MEDIAPIPE ═══ */}
      <WebView
        ref={webViewRef}
        source={{ html: MEDIAPIPE_HTML }}
        style={styles.hiddenWebView}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMediaPipeResult}
        onError={() => console.warn('[GestureChecker] WebView error')}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────
// Стили
// ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f8fc',
  },
  scrollContent: {
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  // Шапка
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 20,
    color: '#214559',
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#214559',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  slowMoToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slowMoToggleActive: {
    backgroundColor: '#e0f2fe',
  },
  slowMoText: {
    fontSize: 20,
  },
  slowMoTextActive: {
    fontSize: 22,
  },

  // Камера
  cameraWrapper: {
    width: CAM_PREVIEW_SIZE,
    height: CAM_PREVIEW_SIZE,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  camera: {
    width: '100%',
    height: '100%',
  },

  checkingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  checkingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Обратный отсчёт
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  countdownNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },

  // Фазы (замедленный режим)
  phaseIndicator: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  phaseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  phaseName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3c95bb',
  },
  phaseHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
  },
  phaseComplete: {
    marginTop: 12,
    alignItems: 'center',
  },
  phaseCompleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
    marginBottom: 8,
  },
  nextPhaseButton: {
    backgroundColor: '#3c95bb',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  nextPhaseButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Точность
  accuracyPanel: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  accuracyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#214559',
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    width: 90,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  progressTrack: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressValue: {
    width: 40,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#214559',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
  },

  // Подсказки
  issuesContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  issueBullet: {
    color: '#ef4444',
    fontWeight: '700',
    marginRight: 6,
  },
  issueText: {
    flex: 1,
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
  },

  // Результат успех
  resultPanel: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#16a34a',
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#214559',
    marginBottom: 24,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
  },

  // Результат ошибка
  failPanel: {
    width: '100%',
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fef2f2',
  },
  failEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  failTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#dc2626',
    marginBottom: 8,
  },
  failScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#214559',
    marginBottom: 8,
  },
  failHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },

  // Кнопки
  primaryButton: {
    backgroundColor: '#3c95bb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 16,
  },
  referenceButton: {
    width: '100%',
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  referenceButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3c95bb',
  },
  startButton: {
    width: '90%',
    marginTop: 20,
    backgroundColor: '#3c95bb',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#3c95bb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  // График прогресса
  chartContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#214559',
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: '60%',
    borderRadius: 6,
    minWidth: 8,
  },
  chartDayLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '600',
  },

  // Статистика
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    padding: 20,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#214559',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
  },

  // Разрешение
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#214559',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },

  // WebView
  hiddenWebView: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 1,
    height: 1,
  },
});
