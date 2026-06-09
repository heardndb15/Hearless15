"""
WebSocket сервер для стриминга субтитров через faster-whisper.
Запуск: uvicorn stt_server:app --reload --port 8001
"""

import asyncio
import json
import io
import time
import os
import wave
import struct
from typing import Optional

import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# ── faster-whisper (основной引擎) ───────────────────────────────────────
try:
    from faster_whisper import WhisperModel

    WHISPER_AVAILABLE = True
    MODEL = None  # lazy init
except ImportError:
    WHISPER_AVAILABLE = False
    MODEL = None


def get_model():
    global MODEL
    if MODEL is None and WHISPER_AVAILABLE:
        MODEL = WhisperModel("small", device="cpu", compute_type="int8")
    return MODEL


# ── Soyle API / Google STT fallback ────────────────────────────────────
try:
    import requests as req

    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    from google.cloud import speech_v1
    from google.oauth2 import service_account

    GOOGLE_STT_AVAILABLE = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
except ImportError:
    GOOGLE_STT_AVAILABLE = False


SOYLE_API_KEY = os.getenv("SOYLE_API_KEY", "")


# ── FastAPI ─────────────────────────────────────────────────────────────
app = FastAPI(title="Hearless STT Server", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Буфер аудио (300ms перекрытие) ─────────────────────────────────────
class AudioBuffer:
    """
    Накопление аудио-семплов.
    При добавлении нового чанка сохраняем последние 300ms для плавности.
    """

    def __init__(self, sample_rate: int = 16000, overlap_ms: int = 300):
        self.sample_rate = sample_rate
        self.overlap_samples = int(sample_rate * overlap_ms / 1000)
        self.buffer = bytearray()

    def add(self, chunk: bytes):
        self.buffer.extend(chunk)

    def pop_for_transcription(self) -> bytes:
        """Возвращает все данные и оставляет последние overlap_samples."""
        data = bytes(self.buffer)
        if len(self.buffer) > self.overlap_samples * 2:  # 16-bit = 2 bytes
            keep = self.overlap_samples * 2
            self.buffer = self.buffer[-keep:]
        else:
            self.buffer = bytearray()
        return data

    def clear(self):
        self.buffer = bytearray()


# ── faster-whisper транскрибация ──────────────────────────────────────
def transcribe_faster_whisper(audio_bytes: bytes, lang: str = "ru") -> str:
    """Транскрибация через faster-whisper. Возвращает распознанный текст."""
    model = get_model()
    if model is None:
        return ""
    try:
        # Конвертируем bytes → numpy float32
        raw = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        if raw.size == 0:
            return ""
        segments, _ = model.transcribe(raw, language=lang, beam_size=1, vad_filter=True)
        text = " ".join(seg.text for seg in segments).strip()
        return text
    except Exception as e:
        print(f"[faster-whisper error] {e}")
        return ""


# ── Soyle API fallback ─────────────────────────────────────────────────
def transcribe_soyle(audio_bytes: bytes, lang: str = "ru") -> str:
    """Транскрибация через Soyle API."""
    if not SOYLE_API_KEY or not REQUESTS_AVAILABLE:
        return ""
    try:
        resp = req.post(
            "https://api.soyle.ai/v1/speech-to-text",
            headers={"Authorization": f"Bearer {SOYLE_API_KEY}"},
            files={"file": ("audio.wav", audio_bytes, "audio/wav")},
            data={"language": lang},
            timeout=10,
        )
        if resp.ok:
            data = resp.json()
            return data.get("text", "")
    except Exception as e:
        print(f"[Soyle error] {e}")
    return ""


# ── Google STT fallback ────────────────────────────────────────────────
def transcribe_google(audio_bytes: bytes, lang: str = "ru") -> str:
    """Транскрибация через Google Speech-to-Text."""
    if not GOOGLE_STT_AVAILABLE:
        return ""
    try:
        client = speech_v1.SpeechClient()
        audio = speech_v1.RecognitionAudio(content=audio_bytes)
        config = speech_v1.RecognitionConfig(
            encoding=speech_v1.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code=lang,
            enable_automatic_punctuation=True,
        )
        resp = client.recognize(config=config, audio=audio)
        text = " ".join(
            alt.transcript for result in resp.results for alt in result.alternatives
        )
        return text
    except Exception as e:
        print(f"[Google STT error] {e}")
        return ""


# ── Цепочка fallback ──────────────────────────────────────────────────
async def transcribe_fallback(audio_bytes: bytes, lang: str = "ru") -> dict:
    """
    Пробует faster-whisper → Soyle → Google.
    Возвращает {"text": str, "source": str}.
    """
    text = transcribe_faster_whisper(audio_bytes, lang)
    if text:
        return {"text": text, "source": "faster-whisper"}

    # Soyle
    text = await asyncio.to_thread(transcribe_soyle, audio_bytes, lang)
    if text:
        return {"text": text, "source": "soyle"}

    # Google
    text = await asyncio.to_thread(transcribe_google, audio_bytes, lang)
    if text:
        return {"text": text, "source": "google"}

    return {"text": "", "source": "none"}


# ── WebSocket эндпоинт ─────────────────────────────────────────────────
@app.websocket("/ws/stt")
async def websocket_stt(ws: WebSocket):
    await ws.accept()
    print("[WS] Клиент подключился")

    buf = AudioBuffer()
    phrase_count = 0
    prev_text = ""
    source = "faster-whisper"
    lang = "ru"

    try:
        while True:
            message = await ws.receive_text()
            data = json.loads(message)

            cmd = data.get("cmd", "")

            if cmd == "config":
                # Установка языка
                lang = data.get("lang", "ru")
                await ws.send_text(json.dumps({"type": "config_ok", "lang": lang}))

            elif cmd == "audio":
                # Декодируем base64 аудио-чанк
                import base64

                chunk = base64.b64decode(data["data"])
                buf.add(chunk)
                phrase_count += 1

                # Отправляем каждые 2 чанка (чтобы не спамить)
                audio_data = buf.pop_for_transcription()
                if len(audio_data) < 3200:  # минимум 100ms
                    await ws.send_text(
                        json.dumps({"type": "partial", "text": "", "source": source})
                    )
                    continue

                result = await transcribe_fallback(audio_data, lang)
                text = result["text"]
                if result["source"] != "none":
                    source = result["source"]

                if text and text != prev_text:
                    await ws.send_text(
                        json.dumps(
                            {
                                "type": "partial",
                                "text": text,
                                "source": source,
                                "phrase": phrase_count,
                            }
                        )
                    )
                    prev_text = text
                else:
                    await ws.send_text(
                        json.dumps({"type": "partial", "text": "", "source": source})
                    )

            elif cmd == "final":
                # Финальная транскрибация всего накопленного буфера
                audio_data = buf.pop_for_transcription()
                if len(audio_data) > 0:
                    result = await transcribe_fallback(audio_data, lang)
                    text = result["text"]
                    if result["source"] != "none":
                        source = result["source"]
                else:
                    text = ""

                await ws.send_text(
                    json.dumps(
                        {
                            "type": "final",
                            "text": text,
                            "source": source,
                            "phrase": phrase_count,
                        }
                    )
                )
                buf.clear()
                prev_text = ""
                phrase_count = 0

            elif cmd == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        print("[WS] Клиент отключился")
    except Exception as e:
        print(f"[WS] Ошибка: {e}")
        try:
            await ws.send_text(json.dumps({"type": "error", "message": str(e)}))
        except Exception:
            pass


# ── Health check ───────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "faster_whisper": WHISPER_AVAILABLE,
        "soyle": bool(SOYLE_API_KEY),
        "google_stt": GOOGLE_STT_AVAILABLE,
    }
