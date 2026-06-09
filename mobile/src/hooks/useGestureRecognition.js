/**
 * useGestureRecognition.js — хук отправки фреймов на бэкенд
 * и получения результата распознавания жеста.
 *
 * Отправляет фреймы на /api/recognize каждые 300мс (каждый 3-й фрейм
 * обрабатывается моделью, остальные пропускаются на сервере).
 *
 * Возвращает:
 *   currentGesture — строка с названием жеста
 *   confidence     — число 0..1
 *   isCorrect      — совпадает ли с targetGesture
 *   isChecking     — идёт ли распознавание
 *   error          — ошибка
 *   startRecognition — запуск цикла
 *   stopRecognition  — остановка
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const RECOGNIZE_INTERVAL = 300; // мс между отправками фреймов

export default function useGestureRecognition(apiUrl, targetGesture, username) {
  const [currentGesture, setCurrentGesture] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);
  const lastFrameRef = useRef(null);
  const framesBatch = useRef([]);
  const running = useRef(false);

  // ── Отправка одного фрейма ────────────────────────────────────
  const sendFrame = useCallback(async () => {
    if (!lastFrameRef.current || !running.current) return;

    try {
      setIsChecking(true);
      framesBatch.current.push(lastFrameRef.current);

      // Отправляем батч из 3 фреймов (каждый 3-й = каждый 900мс)
      if (framesBatch.current.length < 3) return;

      const batch = framesBatch.current.splice(0);
      const res = await fetch(`${apiUrl}/api/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (data.gesture && data.gesture !== 'None') {
        setCurrentGesture(data.gesture);
        setConfidence(data.confidence || 0);

        // Проверка совпадения с целевым жестом
        if (targetGesture) {
          const match = data.gesture.toLowerCase() === targetGesture.toLowerCase();
          setIsCorrect(match);

          // Если match и confidence высокий — сохраняем прогресс
          if (match && data.confidence > 0.5 && username) {
            fetch(`${apiUrl}/api/gestures/progress`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username,
                gesture_id: null, // будет заполнено в проде
                learned: data.confidence > 0.85,
                confidence: data.confidence,
              }),
            }).catch(() => {});
          }
        } else {
          setIsCorrect(false);
        }
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Ошибка соединения');
    } finally {
      setIsChecking(false);
    }
  }, [apiUrl, targetGesture, username]);

  // ── Старт цикла распознавания ─────────────────────────────────
  const startRecognition = useCallback(() => {
    if (running.current) return;
    running.current = true;
    setCurrentGesture(null);
    setConfidence(0);
    setIsCorrect(false);
    setError(null);
    framesBatch.current = [];

    intervalRef.current = setInterval(sendFrame, RECOGNIZE_INTERVAL);
  }, [sendFrame]);

  // ── Сохранение последнего фрейма (вызывается из useCamera) ───
  const onFrame = useCallback((base64) => {
    lastFrameRef.current = base64;
  }, []);

  // ── Остановка ─────────────────────────────────────────────────
  const stopRecognition = useCallback(() => {
    running.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(() => {
    return stopRecognition;
  }, [stopRecognition]);

  return {
    currentGesture,
    confidence,
    isCorrect,
    isChecking,
    error,
    onFrame,
    startRecognition,
    stopRecognition,
  };
}
