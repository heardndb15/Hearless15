from fastapi import FastAPI, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
import subprocess
import json
import logging
import traceback
import shutil
import tempfile
import os
import sqlite3
import aiosqlite
import hashlib
import time
import asyncio
import io
from typing import List, Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("HearlessBackend")

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Hearless — AI Deaf Assist",
    description="Backend for Hearless — AI-powered accessibility application for deaf users",
    version="1.2.0"
)

# --- State ---
client: Optional[AsyncOpenAI] = None

ALEM_API_BASE = os.getenv("ALEM_API_BASE", "https://api.alem.ai/v1")
ALEM_MODEL    = os.getenv("ALEM_MODEL",    "gpt-3.5-turbo")

# Loaded lazily in startup so .env is guaranteed to be read first
openai_client:   Optional[AsyncOpenAI] = None
openai_client_2: Optional[AsyncOpenAI] = None

alerts_store = []
last_alert_time = {}  # For debouncing: {alert_type: timestamp}

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database setup ---
def init_db():
    try:
        with sqlite3.connect("users.db", timeout=10) as conn:
            c = conn.cursor()
            c.execute('''CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                password TEXT,
                avatar TEXT
            )''')
            c.execute('''CREATE TABLE IF NOT EXISTS lectures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT,
                notes TEXT,
                summary TEXT,
                created_at TEXT
            )''')
            c.execute('''CREATE TABLE IF NOT EXISTS sos_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL,
                longitude REAL,
                timestamp TEXT,
                user_id TEXT
            )''')
            conn.commit()
            logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

init_db()

# --- Auth models ---
class AuthUser(BaseModel):
    username: str
    password: str

def hash_pw(pw: str):
    return hashlib.sha256(pw.encode()).hexdigest()

# --- Startup ---
@app.on_event("startup")
async def startup_event():
    global client, openai_client, openai_client_2

    # xAI Grok — used for danger detection, summarization, chat
    xai_key = os.getenv("XAI_API_KEY", "").strip()
    if xai_key:
        try:
            client = AsyncOpenAI(api_key=xai_key, base_url="https://api.x.ai/v1")
            logger.info("✅ xAI (Grok) client ready")
        except Exception as e:
            logger.error(f"❌ xAI client init failed: {e}")
    else:
        logger.warning("⚠️ XAI_API_KEY not set — summarization/danger-AI disabled")

    # Alem AI — used for STT + Kazakh translation
    alem_key_1 = os.getenv("ALEM_API_KEY_1", "").strip()
    alem_key_2 = os.getenv("ALEM_API_KEY_2", "").strip()
    if alem_key_1:
        openai_client = AsyncOpenAI(api_key=alem_key_1, base_url=ALEM_API_BASE)
        logger.info("✅ Alem AI client 1 (STT + translation) ready")
    else:
        logger.warning("⚠️ ALEM_API_KEY_1 not set — STT and Kazakh translation disabled")
    if alem_key_2:
        openai_client_2 = AsyncOpenAI(api_key=alem_key_2, base_url=ALEM_API_BASE)
        logger.info("✅ Alem AI client 2 (translation refiner) ready")
    else:
        logger.warning("⚠️ ALEM_API_KEY_2 not set — translation refinement disabled")

    logger.info(f"🚀 Hearless v1.2 started | xAI={'✅' if client else '❌'} | Alem={'✅' if openai_client else '❌'}")

# ======================= HELPERS =======================

async def verify_danger_with_ai(text: str) -> bool:
    """Use AI to filter false positives in danger detection."""
    if not client or not text.strip():
        return False
    
    try:
        # Check if text contains high-alert keywords before calling AI
        danger_keywords = ["fire", "сирена", "помогите", "убивают", "грабят", "взрыв", "siren", "help", "explosion"]
        if not any(k in text.lower() for k in danger_keywords):
            return False

        resp = await client.chat.completions.create(
            model="grok-beta",
            messages=[
                {"role": "system", "content": "You are a danger detection assistant for deaf individuals. Your only output should be 'Yes' or 'No'."},
                {"role": "user", "content": (
                    "Analyze this transcribed text. Is there a clear indication of an immediate physical danger or emergency (like fire, alarm, or someone screaming for help)? "
                    "Context matters. If it sounds like a casual conversation or news, return 'No'. "
                    "If it's an emergency, return 'Yes'. Return ONLY 'Yes' or 'No'.\n\n"
                    f"Text: \"{text}\""
                )}
            ]
        )
        prediction = resp.choices[0].message.content.strip().lower()
        return "yes" in prediction
    except Exception as e:
        logger.error(f"AI Danger Verification Error: {e}")
        # Fallback to keyword matching if AI fails
        return True 

# ======================= ROUTES =======================

@app.get("/")
def read_root():
    return {
        "status": "ok", 
        "message": "Hearless backend is active",
        "ai_enabled": client is not None
    }

@app.get("/api/ai/status")
def ai_status():
    if client:
        return {"ai_ready": True, "provider": "xAI Grok"}
    return {"ai_ready": False, "message": "AI is NOT configured (check XAI_API_KEY)"}

# --- Auth ---
@app.post("/api/register")
async def register_user(user: AuthUser):
    hashed_pw = hash_pw(user.password)
    try:
        async with aiosqlite.connect("users.db", timeout=10) as conn:
            await conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user.username, hashed_pw))
            await conn.commit()
        return {"success": True, "message": "User registered successfully"}
    except aiosqlite.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    except Exception as e:
        logger.error(f"Registration Error: {e}")
        raise HTTPException(status_code=500, detail="Internal database error")

@app.post("/api/login")
async def login_user(user: AuthUser):
    hashed_pw = hash_pw(user.password)
    try:
        async with aiosqlite.connect("users.db", timeout=10) as conn:
            async with conn.execute("SELECT * FROM users WHERE username = ? AND password = ?", (user.username, hashed_pw)) as cursor:
                db_user = await cursor.fetchone()
        if db_user:
            return {"success": True, "username": user.username}
        raise HTTPException(status_code=401, detail="Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/user/{username}")
async def get_user_profile(username: str):
    async with aiosqlite.connect("users.db", timeout=10) as conn:
        async with conn.execute("SELECT avatar FROM users WHERE username = ?", (username,)) as cursor:
            row = await cursor.fetchone()
    if row:
        return {"username": username, "avatar": row[0]}
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/api/user/{username}/avatar")
async def update_user_avatar(username: str, payload: dict):
    avatar_base64 = payload.get("avatar")
    if not avatar_base64:
        raise HTTPException(status_code=400, detail="Avatar data missing")
    async with aiosqlite.connect("users.db", timeout=10) as conn:
        await conn.execute("UPDATE users SET avatar = ? WHERE username = ?", (avatar_base64, username))
        await conn.commit()
    return {"success": True}

# --- Alerts & SOS ---
@app.get("/api/alerts")
def get_alerts():
    return {"alerts": alerts_store[-20:]}

@app.post("/api/alerts")
def post_alert(alert: dict):
    alert["id"] = alert.get("id", time.time())
    alerts_store.append(alert)
    return {"success": True}

@app.post("/api/sos")
async def post_sos(payload: dict):
    try:
        latitude = payload.get("latitude")
        longitude = payload.get("longitude")
        user_id = payload.get("user_id", "anonymous")
        danger_type = payload.get("danger_type", "manual_sos")
        
        logger.warning(f"SOS Triggered by {user_id}: {danger_type} at ({latitude}, {longitude})")
        
        async with aiosqlite.connect("users.db", timeout=10) as conn:
            await conn.execute(
                "INSERT INTO sos_events (latitude, longitude, timestamp, user_id) VALUES (?,?,datetime('now'),?)",
                (latitude, longitude, user_id)
            )
            await conn.commit()
        return {"success": True, "message": "SOS received and recorded"}
    except Exception as e:
        logger.error(f"SOS Save Error: {e}")
        return {"success": False, "error": str(e)}

# --- Lecture AI Tools ---
@app.post("/api/chat-lecture")
async def chat_lecture(payload: dict):
    text = payload.get("text", "")
    message = payload.get("message", "")
    if not text.strip() or not message.strip():
        return {"response": "Контекст или сообщение пустые."}
    
    if not client:
        return {"response": "AI service not available."}

    try:
        resp = await client.chat.completions.create(
            model="grok-beta",
            messages=[
                {"role": "system", "content": "You are a friendly assistant helping a deaf student with their lecture notes. Reply in Russian."},
                {"role": "user", "content": (
                    f"Context: {text[:30000]}\n\n"
                    f"Question: {message}\n\n"
                    "Answer the question based on the context above. Be concise."
                )}
            ]
        )
        return {"response": resp.choices[0].message.content}
    except Exception as e:
        logger.error(f"Chat AI Error: {e}")
        return {"response": "❌ Ошибка ИИ при ответе."}

@app.post("/api/translate-subtitle")
async def translate_subtitle(payload: dict):
    text = payload.get("text", "")
    target_lang = payload.get("target_lang", "kazakh")
    if not text.strip():
        return {"text": ""}
        
    try:
        # Step 1: Initial translation by primary AI
        resp1 = await openai_client.chat.completions.create(
            model=ALEM_MODEL,
            messages=[
                {"role": "system", "content": f"You are a real-time subtitle translator. Translate the following speech snippet into {target_lang}. It might be a short word or phrase. Even if it's one word, translate it into {target_lang}. Return ONLY the translated text."},
                {"role": "user", "content": text}
            ]
        )
        initial_translation = resp1.choices[0].message.content.strip()

        # Step 2: Refinement and strict language guarantee by secondary AI
        resp2 = await openai_client_2.chat.completions.create(
            model=ALEM_MODEL,
            messages=[
                {"role": "system", "content": f"You are an expert {target_lang} editor. You will receive a rough {target_lang} translation of speech subtitles. Fix any grammatical errors, make it conversational and natural. MOST IMPORTANTLY: Make 100% sure the output is written in {target_lang} language and alphabet, NOT Russian. If the text only has one word, ensure it stays in {target_lang}. Return ONLY the final corrected text, without quotes."},
                {"role": "user", "content": initial_translation}
            ]
        )
        final_translation = resp2.choices[0].message.content.strip()

        return {"text": final_translation}
    except Exception as e:
        logger.error(f"Translation Error: {e}")
        return {"text": text}  # fallback to original


@app.post("/api/summarize")
async def summarize_text(payload: dict):
    text = payload.get("text", "")
    if not text.strip(): return {"summary": ""}
    if not client: return {"summary": text[:200] + "..."}

    try:
        resp = await client.chat.completions.create(
            model="grok-beta",
            messages=[
                {"role": "system", "content": "You are an assistant for deaf students. Summarize text in Russian."},
                {"role": "user", "content": f"Summarize this lecture text in Russian (key points only):\n\n{text}"}
            ]
        )
        return {"summary": resp.choices[0].message.content}
    except Exception as e:
        logger.error(f"Summarize Error: {e}")
        return {"summary": "Ошибка генерации саммари."}

@app.post("/api/pdf-notes")
async def pdf_notes(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file format")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(tmp_path)
        extracted_text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
        
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")
        
        if not client:
            return {"notes": "AI unavailable", "summary": "AI unavailable", "text": extracted_text[:1000]}

        # Parallel generation
        notes_task = client.chat.completions.create(
            model='grok-beta',
            messages=[{"role": "user", "content": f"Create detailed study notes in Russian for this: {extracted_text[:30000]}"}]
        )
        summary_task = client.chat.completions.create(
            model='grok-beta',
            messages=[{"role": "user", "content": f"Create a short summary in Russian for this: {extracted_text[:30000]}"}]
        )
        
        notes_resp, sum_resp = await asyncio.gather(notes_task, summary_task)
        
        return {
            "notes": notes_resp.choices[0].message.content,
            "summary": sum_resp.choices[0].message.content,
            "pages": len(reader.pages)
        }
    except Exception as e:
        logger.error(f"PDF Processing Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path): os.remove(tmp_path)

@app.get("/api/lectures")
async def list_lectures():
    async with aiosqlite.connect("users.db", timeout=10) as conn:
        async with conn.execute("SELECT id, title, summary, created_at FROM lectures ORDER BY id DESC") as cursor:
            rows = await cursor.fetchall()
    return {"lectures": [{"id": r[0], "title": r[1], "summary": r[2], "created_at": r[3]} for r in rows]}

@app.post("/api/lectures")
async def save_lecture(payload: dict):
    title = payload.get("title") or "New Lecture"
    notes = payload.get("notes", "")
    summary = payload.get("summary", "")
    async with aiosqlite.connect("users.db", timeout=10) as conn:
        await conn.execute("INSERT INTO lectures (title, notes, summary, created_at) VALUES (?,?,?,datetime('now'))", (title, notes, summary))
        await conn.commit()
    return {"success": True}

# --- Danger Detection ---
@app.post("/api/detect-danger")
async def detect_danger(payload: dict):
    text = payload.get("text", "").lower()
    if not text.strip() or len(text) < 3:
        return {"is_dangerous": False}

    # 1. Simple Keyword Match First
    danger_keywords = [
        "siren", "сирена", "alarm", "тревога", "fire", "пожар",
        "emergency", "help", "помощь", "выстрел", "взрыв", "авария"
    ]
    
    has_keyword = any(k in text for k in danger_keywords)
    
    if not has_keyword:
        return {"is_dangerous": False}

    # 2. Debounce Check (don't alert for the same thing more than once every 10 seconds)
    now = time.time()
    for kw in danger_keywords:
        if kw in text:
            if now - last_alert_time.get(kw, 0) < 10:
                logger.info(f"Debounced alert for {kw}")
                return {"is_dangerous": False}
            last_alert_time[kw] = now

    # 3. AI Verification for critical keywords to reduce false positives
    is_confirmed = await verify_danger_with_ai(text)
    
    if is_confirmed:
        logger.warning(f"Confirmed danger detected: {text}")
        alert = {
            "id": time.time(),
            "type": "emergency",
            "title": "ВНИМАНИЕ!",
            "desc": text,
            "time": "Только что"
        }
        alerts_store.append(alert)
        return {"is_dangerous": True, "alert": alert}
    
    return {"is_dangerous": False}

# --- STT WebSocket ---
# Browser lang code → Whisper lang code
LANG_MAP = {
    "ru-RU": "ru",
    "en-US": "en",
    "kk-KZ": "kk",
}

@app.websocket("/ws/subtitles")
async def ws_subtitles(websocket: WebSocket):
    await websocket.accept()
    logger.info("Subtitle WS Connected")

    audio_buffer = bytearray()
    current_lang = "ru"   # default until client tells us otherwise

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                # Accumulate raw audio data
                audio_buffer.extend(message["bytes"])

            elif "text" in message:
                txt_data = message["text"]

                # Parse as JSON when possible (frontend sends {text, lang})
                cmd = txt_data
                try:
                    parsed = json.loads(txt_data)
                    cmd = parsed.get("text", "")
                    lang_code = parsed.get("lang", "ru-RU")
                    current_lang = LANG_MAP.get(lang_code, "ru")
                except Exception:
                    pass   # plain-text fallback ("END_CHUNK", "END")

                if "END_CHUNK" in cmd:
                    # Ignore very small buffers (silence / network jitter)
                    if len(audio_buffer) < 1000:
                        logger.debug(f"Buffer too small ({len(audio_buffer)} bytes), skipping")
                        audio_buffer.clear()
                        continue

                    if openai_client:
                        try:
                            logger.info(f"Processing {len(audio_buffer)} bytes, lang={current_lang}")
                            # Use in-memory buffer to avoid disk I/O lag
                            audio_file = io.BytesIO(audio_buffer)
                            audio_file.name = f"chunk_{int(time.time())}.webm"

                            transcript = await openai_client.audio.transcriptions.create(
                                model="whisper-1",
                                file=audio_file,
                                language=current_lang   # use language chosen by user
                            )

                            final_text = transcript.text
                            if final_text and final_text.strip():
                                # Check if translation is requested via WebSocket message
                                if parsed.get("translate"):
                                    target_lang = parsed.get("target_lang", "kazakh")
                                    try:
                                        # Fast single-pass translation for real-time
                                        resp = await openai_client.chat.completions.create(
                                            model=ALEM_MODEL,
                                            messages=[
                                                {"role": "system", "content": f"You are a fast real-time translator. Translate the text to {target_lang}. Keep it natural and conversational. Return ONLY the translation, no quotes or notes."},
                                                {"role": "user", "content": final_text}
                                            ]
                                        )
                                        final_text = resp.choices[0].message.content.strip()
                                    except Exception as te:
                                        logger.error(f"WS Translation Error: {te}")

                                logger.info(f"STT Result: {final_text}")
                                await websocket.send_text(final_text)
                        except Exception as e:
                            logger.error(f"Alem STT Error: {e}")
                            await websocket.send_text(f"[STT Error: {str(e)}]")
                    else:
                        await websocket.send_text("[Backend: Alem AI not configured]")

                    audio_buffer.clear()

                elif "END" in cmd:
                    break

    except WebSocketDisconnect:
        logger.info("Subtitle WS Disconnected")
    except Exception as e:
        logger.error(f"WS critical error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
