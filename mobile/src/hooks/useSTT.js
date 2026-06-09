/**
 * Хук useSTT — запись аудио с микрофона и стриминг на WebSocket сервер.
 *
 * Возвращает:
 *   subtitles       — массив { id, text, timestamp }
 *   connectionQuality — 'good' | 'degraded' | 'offline'
 *   isListening     — идёт ли запись
 *   startListening  — запустить
 *   stopListening   — остановить
 *   setLanguage     — сменить язык
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

// ── Конфигурация ──────────────────────────────────────────────────────
const WS_URL = __DEV__
  ? 'ws://192.168.1.100:8001/ws/stt'        // ← заменить на IP бэкенда
  : 'wss://hearless15.onrender.com/ws/stt';

const CHUNK_MS = 500;      // длительность чанка (мс)
const SAMPLE_RATE = 16000; // 16 kHz
const BITS = 16;           // 16-bit PCM

// ── Утилита: конвертер Float32 → Int16 → base64 ──────────────────────
function pcmToBase64(audioData) {
  const buffer = new ArrayBuffer(audioData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < audioData.length; i++) {
    const s = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  // base64 из ArrayBuffer
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ── Hook ──────────────────────────────────────────────────────────────
export default function useSTT() {
  const [subtitles, setSubtitles] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('offline');

  const wsRef = useRef(null);
  const recordingRef = useRef(null);
  const intervalRef = useRef(null);
  const langRef = useRef('ru');
  const idCounter = useRef(0);
  const reconnectTimer = useRef(null);

  // ── Подключение WebSocket с авто-переподключением ─────────────────
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useSTT] WebSocket открыт');
        setConnectionQuality('good');
        // Отправляем конфиг
        ws.send(JSON.stringify({ cmd: 'config', lang: langRef.current }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'partial' && msg.text) {
            setSubtitles(prev => {
              const last = prev[prev.length - 1];
              if (last && !last.isFinal) {
                // Обновляем последнюю промежуточную строку
                return [...prev.slice(0, -1), { ...last, text: msg.text }];
              }
              return [...prev, { id: idCounter.current++, text: msg.text, timestamp: Date.now(), isFinal: false }];
            });
          }
          if (msg.type === 'final' && msg.text) {
            setSubtitles(prev => {
              const last = prev[prev.length - 1];
              if (last && !last.isFinal && last.id === idCounter.current - 1) {
                return [...prev.slice(0, -1), { ...last, text: msg.text, isFinal: true }];
              }
              return [...prev, { id: idCounter.current++, text: msg.text, timestamp: Date.now(), isFinal: true }];
            });
          }
          if (msg.type === 'pong') {
            setConnectionQuality('good');
          }
        } catch (err) {
          console.warn('[useSTT] parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.warn('[useSTT] WS error:', err.message);
        setConnectionQuality('degraded');
      };

      ws.onclose = () => {
        console.log('[useSTT] WebSocket закрыт');
        setConnectionQuality('offline');
        // Авто-переподключение через 2 сек
        if (isListening) {
          reconnectTimer.current = setTimeout(connectWs, 2000);
        }
      };
    } catch (err) {
      console.warn('[useSTT] WS connect error:', err);
      setConnectionQuality('offline');
    }
  }, [isListening]);

  // ── Отправка чанка аудио ──────────────────────────────────────────
  const sendChunk = useCallback(async (recording) => {
    try {
      const status = await recording.getStatusAsync();
      if (!status.isRecording) return;

      // expo-av не даёт прямой доступ к PCM, поэтому
      // используем метаданные последнего куска
      // Решение: читаем файл и отправляем
      const uri = recording.getURI();
      if (!uri) return;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Берём только новый кусок (последние CHUNK_MS)
      const totalBytes = arrayBuffer.byteLength;
      const bytesPerMs = totalBytes / (status.durationMillis || CHUNK_MS);
      const chunkSize = Math.floor(bytesPerMs * CHUNK_MS);
      const startOffset = Math.max(0, totalBytes - chunkSize - Math.floor(bytesPerMs * 300)); // 300ms overlap
      const chunk = arrayBuffer.slice(startOffset, startOffset + chunkSize);

      // Конвертируем Float32 → Int16 → base64
      const float32 = new Float32Array(chunk);
      const base64 = pcmToBase64(float32);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ cmd: 'audio', data: base64 }));
        // ping для проверки качества
        wsRef.current.send(JSON.stringify({ cmd: 'ping' }));
      }
    } catch (err) {
      console.warn('[useSTT] sendChunk error:', err);
    }
  }, []);

  // ── Отправка финального сообщения ─────────────────────────────────
  const sendFinal = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ cmd: 'final' }));
    }
  }, []);

  // ── Очистка подписок ──────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    if (recordingRef.current) {
      try { recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }
  }, []);

  // ── Старт записи ──────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      // Запрашиваем разрешение
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        console.warn('[useSTT] Нет доступа к микрофону');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Создаём запись с настройками 16kHz, mono, PCM
      const recording = new Audio.Recording();
      recordingRef.current = recording;

      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.PCM_16BIT,
          audioEncoder: Audio.AndroidAudioEncoder.PCM_16BIT,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: SAMPLE_RATE * 16,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: SAMPLE_RATE * 16,
          linearPCMBitDepth: BITS,
          linearPCMIsFloat: false,
          linearPCMIsBigEndian: false,
        },
      });

      await recording.startAsync();
      setIsListening(true);

      // Подключаем WebSocket
      connectWs();

      // Отправляем чанки каждые CHUNK_MS
      intervalRef.current = setInterval(() => sendChunk(recording), CHUNK_MS);
    } catch (err) {
      console.warn('[useSTT] start error:', err);
      setIsListening(false);
    }
  }, [connectWs, sendChunk]);

  // ── Стоп записи ───────────────────────────────────────────────────
  const stopListening = useCallback(async () => {
    try {
      // Останавливаем интервал
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Отправляем финал
      sendFinal();

      // Останавливаем запись
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      setIsListening(false);
    } catch (err) {
      console.warn('[useSTT] stop error:', err);
      setIsListening(false);
    }
  }, [sendFinal]);

  // ── Смена языка ───────────────────────────────────────────────────
  const setLanguage = useCallback((lang) => {
    langRef.current = lang;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ cmd: 'config', lang }));
    }
  }, []);

  // ── Cleanup при размонтировании ───────────────────────────────────
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    subtitles,
    isListening,
    connectionQuality,
    startListening,
    stopListening,
    setLanguage,
  };
}
