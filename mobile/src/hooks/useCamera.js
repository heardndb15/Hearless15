/**
 * useCamera.js — хук для работы с камерой.
 *
 * Управляет:
 *   - состоянием камеры (готова/нет)
 *   - захватом фреймов
 *   - конвертацией в base64 JPEG через expo-file-system
 *     (вместо FileReader — его нет в React Native)
 *   - переключением фронтальная/тыловая
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';

const FRAME_QUALITY = 0.6;   // качество JPEG (0-1)
const FRAME_WIDTH = 480;     // ширина фрейма

export default function useCamera() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [type, setType] = useState(Camera.Constants.Type.front);
  const cameraRef = useRef(null);
  const frameInterval = useRef(null);
  const onFrameRef = useRef(null);

  // ── Запрос разрешения ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // ── Конвертация URI в base64 через expo-file-system ────────────
  const uriToBase64 = useCallback(async (uri) => {
    try {
      return await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (err) {
      console.warn('[useCamera] uriToBase64 error:', err);
      return null;
    }
  }, []);

  // ── Остановка захвата ──────────────────────────────────────────
  const stopCapture = useCallback(() => {
    if (frameInterval.current) {
      clearInterval(frameInterval.current);
      frameInterval.current = null;
    }
  }, []);

  // ── Запуск захвата фреймов каждые `intervalMs` ────────────────
  const startCapture = useCallback((intervalMs = 300, onFrame) => {
    stopCapture();
    onFrameRef.current = onFrame;
    setIsReady(true);

    frameInterval.current = setInterval(async () => {
      if (!cameraRef.current || !onFrameRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: FRAME_QUALITY,
          exif: false,
          skipProcessing: true,
        });
        if (photo?.uri && onFrameRef.current) {
          const base64 = await uriToBase64(photo.uri);
          if (base64) onFrameRef.current(base64);
        }
      } catch (err) {
        // Тихий сброс — камера может быть занята
      }
    }, intervalMs);
  }, [stopCapture, uriToBase64]);

  // ── Переключение камеры ────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    setType(prev =>
      prev === Camera.Constants.Type.front
        ? Camera.Constants.Type.back
        : Camera.Constants.Type.front
    );
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return stopCapture;
  }, [stopCapture]);

  return {
    cameraRef,
    hasPermission,
    isReady,
    type,
    setIsReady,
    startCapture,
    stopCapture,
    toggleCamera,
  };
}
