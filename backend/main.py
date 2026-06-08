import warnings
warnings.filterwarnings("ignore")

from fastapi import FastAPI, UploadFile, File, HTTPException
import logging
import shutil
import tempfile
import os
import sqlite3
import aiosqlite
import hashlib
import time
import asyncio
from typing import Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("HearlessBackend")

load_dotenv()

app = FastAPI(title="Hearless Backend", version="2.0.0")

client: Optional[AsyncOpenAI] = None

alerts_store = []
last_alert_time = {}

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def init_db():
    try:
        with sqlite3.connect("users.db", timeout=10) as conn:
            c = conn.cursor()
            c.execute('''CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT, avatar TEXT)''')
            c.execute('''CREATE TABLE IF NOT EXISTS lectures (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, notes TEXT, summary TEXT, created_at TEXT)''')
            c.execute('''CREATE TABLE IF NOT EXISTS sos_events (id INTEGER PRIMARY KEY AUTOINCREMENT, latitude REAL, longitude REAL, timestamp TEXT, user_id TEXT)''')
            c.execute('''CREATE TABLE IF NOT EXISTS sign_progress (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, sign_id INTEGER, learned INTEGER DEFAULT 0, times_practiced INTEGER DEFAULT 0, last_practiced TEXT, correct_count INTEGER DEFAULT 0, wrong_count INTEGER DEFAULT 0, UNIQUE(username, sign_id))''')
            conn.commit()
    except Exception as e:
        logger.error(f"DB init failed: {e}")

init_db()

class AuthUser(BaseModel):
    username: str
    password: str

def hash_pw(pw: str):
    return hashlib.sha256(pw.encode()).hexdigest()

@app.on_event("startup")
async def startup_event():
    global client
    xai_key = os.getenv("XAI_API_KEY", "").strip()
    if xai_key:
        try:
            client = AsyncOpenAI(api_key=xai_key, base_url="https://api.x.ai/v1")
            logger.info("xAI Grok ready")
        except Exception as e:
            logger.error(f"xAI init failed: {e}")
    else:
        logger.warning("XAI_API_KEY not set")
    logger.info(f"Hearless v2.0 | xAI={'yes' if client else 'no'}")

# ======================= DIAGNOSTICS =======================

@app.get("/api/diagnose")
async def api_diagnose():
    """Service health check."""
    db_ok = False
    try:
        async with aiosqlite.connect("users.db", timeout=5) as conn:
            await conn.execute("SELECT 1")
            db_ok = True
    except Exception as e:
        logger.error(f"DB diagnose error: {e}")
    return {
        "status": "ok",
        "db": db_ok,
        "xai_configured": client is not None,
        "alerts_count": len(alerts_store),
    }

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
    if len(alerts_store) > 100:
        alerts_store[:] = alerts_store[-100:]
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
        resp = await asyncio.wait_for(
            client.chat.completions.create(
                model="grok-beta",
                messages=[
                    {"role": "system", "content": "You are a friendly assistant helping a deaf student with their lecture notes. Reply in Russian."},
                    {"role": "user", "content": (
                        f"Context: {text[:30000]}\n\n"
                        f"Question: {message}\n\n"
                        "Answer the question based on the context above. Be concise."
                    )}
                ]
            ), timeout=30
        )
        return {"response": resp.choices[0].message.content}
    except asyncio.TimeoutError:
        logger.error("Chat AI timeout")
        return {"response": "⏱ ИИ не ответил вовремя."}
    except Exception as e:
        logger.error(f"Chat AI Error: {e}")
        return {"response": "❌ Ошибка ИИ при ответе."}

@app.post("/api/translate-subtitle")
async def translate_subtitle(payload: dict):
    text = payload.get("text", "")
    return {"text": text}


@app.post("/api/summarize")
async def summarize_text(payload: dict):
    text = payload.get("text", "")
    if not text.strip(): return {"summary": ""}
    if not client: return {"summary": text[:200] + "..."}

    try:
        resp = await asyncio.wait_for(
            client.chat.completions.create(
                model="grok-beta",
                messages=[
                    {"role": "system", "content": "You are an assistant for deaf students. Summarize text in Russian."},
                    {"role": "user", "content": f"Summarize this lecture text in Russian (key points only):\n\n{text}"}
                ]
            ), timeout=30
        )
        return {"summary": resp.choices[0].message.content}
    except asyncio.TimeoutError:
        logger.error("Summarize timeout")
        return {"summary": "⏱ Таймаут при генерации саммари."}
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

        notes_task = client.chat.completions.create(
            model='grok-beta',
            messages=[{"role": "user", "content": f"Create detailed study notes in Russian for this: {extracted_text[:30000]}"}]
        )
        summary_task = client.chat.completions.create(
            model='grok-beta',
            messages=[{"role": "user", "content": f"Create a short summary in Russian for this: {extracted_text[:30000]}"}]
        )

        notes_resp, sum_resp = await asyncio.wait_for(
            asyncio.gather(notes_task, summary_task), timeout=60
        )
        
        return {
            "notes": notes_resp.choices[0].message.content,
            "summary": sum_resp.choices[0].message.content,
            "pages": len(reader.pages)
        }
    except asyncio.TimeoutError:
        logger.error("PDF AI processing timeout")
        raise HTTPException(status_code=504, detail="AI processing timed out")
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

# --- Sign Language Progress ---
@app.get("/api/signs")
async def list_signs():
    """Return the full sign language dictionary with categories."""
    return {"signs": [
        {"id": 1, "category": "alphabet", "label": "А", "icon": "🅰️", "sub": "Дактиль", "desc": "Кулак, большой палец сбоку."},
        {"id": 2, "category": "alphabet", "label": "Б", "icon": "🅱️", "sub": "Дактиль", "desc": "Ладонь раскрыта, большой палец прижат."},
        {"id": 3, "category": "alphabet", "label": "В", "icon": "✌️", "sub": "Дактиль", "desc": "Указательный и средний пальцы вверх, остальные в кулак."},
        {"id": 4, "category": "alphabet", "label": "Г", "icon": "🇬", "sub": "Дактиль", "desc": "Указательный палец вверх, остальные в кулак."},
        {"id": 5, "category": "alphabet", "label": "Д", "icon": "🇩", "sub": "Дактиль", "desc": "Три пальца вверх: указательный, средний и безымянный."},
        {"id": 6, "category": "alphabet", "label": "Е", "icon": "🇪", "sub": "Дактиль", "desc": "Пальцы сжаты, большой палец касается указательного."},
        {"id": 7, "category": "alphabet", "label": "Ё", "icon": "🇪", "sub": "Дактиль", "desc": "Пальцы сжаты, большой у указательного, с движением в сторону."},
        {"id": 8, "category": "alphabet", "label": "Ж", "icon": "🆖", "sub": "Дактиль", "desc": "Средний и безымянный скрещены, остальные в кулак."},
        {"id": 9, "category": "alphabet", "label": "З", "icon": "🇿", "sub": "Дактиль", "desc": "Указательный палец рисует зигзаг."},
        {"id": 10, "category": "alphabet", "label": "И", "icon": "🇮", "sub": "Дактиль", "desc": "Мизинец вверх, остальные в кулак."},
        {"id": 11, "category": "alphabet", "label": "К", "icon": "🇰", "sub": "Дактиль", "desc": "Указательный и большой вверх, остальные в кулак."},
        {"id": 12, "category": "alphabet", "label": "Л", "icon": "🇱", "sub": "Дактиль", "desc": "Ладонь раскрыта (буква L в дактиле)."},
        {"id": 13, "category": "alphabet", "label": "М", "icon": "🇲", "sub": "Дактиль", "desc": "Большой палец прижат к мизинцу, остальные накрывают."},
        {"id": 14, "category": "alphabet", "label": "Н", "icon": "🇳", "sub": "Дактиль", "desc": "Указательный и средний вниз, остальные в кулак."},
        {"id": 15, "category": "alphabet", "label": "О", "icon": "🅾️", "sub": "Дактиль", "desc": "Все пальцы в кольцо с большим (жест ок)."},
        {"id": 16, "category": "alphabet", "label": "П", "icon": "🇵", "sub": "Дактиль", "desc": "Ладонь раскрыта, пальцы вместе, направлена вперед."},
        {"id": 17, "category": "alphabet", "label": "Р", "icon": "🇷", "sub": "Дактиль", "desc": "Указательный и средний скрещены, остальные в кулак."},
        {"id": 18, "category": "alphabet", "label": "С", "icon": "🇨", "sub": "Дактиль", "desc": "Большой палец прикрывает сжатые пальцы сверху."},
        {"id": 19, "category": "alphabet", "label": "Т", "icon": "🇹", "sub": "Дактиль", "desc": "Кулак, большой палец зажат внутри."},
        {"id": 20, "category": "alphabet", "label": "У", "icon": "🇺", "sub": "Дактиль", "desc": "Указательный и мизинец вверх (коза)."},
        {"id": 21, "category": "alphabet", "label": "Ф", "icon": "🇫", "sub": "Дактиль", "desc": "Большой палец упирается в указательный (кольцо), остальные раскрыты."},
        {"id": 22, "category": "alphabet", "label": "Х", "icon": "🇭", "sub": "Дактиль", "desc": "Указательный и средний параллельно, ладонь вбок."},
        {"id": 23, "category": "alphabet", "label": "Ц", "icon": "🇨", "sub": "Дактиль", "desc": "Указательный, средний, безымянный вверх, мизинец отведен."},
        {"id": 24, "category": "alphabet", "label": "Ч", "icon": "4️⃣", "sub": "Дактиль", "desc": "Указательный и большой в кольцо, остальные вытянуты."},
        {"id": 25, "category": "alphabet", "label": "Ш", "icon": "🇸", "sub": "Дактиль", "desc": "Четыре пальца вверх, большой прижат к ладони."},
        {"id": 26, "category": "alphabet", "label": "Щ", "icon": "🇸", "sub": "Дактиль", "desc": "Четыре пальца вверх, большой отставлен."},
        {"id": 27, "category": "alphabet", "label": "Ъ", "icon": "🇷", "sub": "Дактиль", "desc": "Сжатый кулак с резким движением вправо."},
        {"id": 28, "category": "alphabet", "label": "Ы", "icon": "🇾", "sub": "Дактиль", "desc": "Указательный и мизинец вверх, большой поднят."},
        {"id": 29, "category": "alphabet", "label": "Ь", "icon": "🇷", "sub": "Дактиль", "desc": "Кулак с мягким движением вниз."},
        {"id": 30, "category": "alphabet", "label": "Э", "icon": "🇪", "sub": "Дактиль", "desc": "Указательный и средний скрещены, ладонь раскрыта."},
        {"id": 31, "category": "alphabet", "label": "Ю", "icon": "🇺", "sub": "Дактиль", "desc": "Указательный и большой в кольцо, остальные вверх."},
        {"id": 32, "category": "alphabet", "label": "Я", "icon": "🇾", "sub": "Дактиль", "desc": "Мизинец вперед, остальные в кулак."},
        {"id": 33, "category": "numbers", "label": "Один", "icon": "1️⃣", "sub": "Цифры", "desc": "Указательный палец вверх, остальные в кулак."},
        {"id": 34, "category": "numbers", "label": "Два", "icon": "2️⃣", "sub": "Цифры", "desc": "Указательный и средний вверх, остальные в кулак."},
        {"id": 35, "category": "numbers", "label": "Три", "icon": "3️⃣", "sub": "Цифры", "desc": "Указательный, средний и безымянный вверх."},
        {"id": 36, "category": "numbers", "label": "Четыре", "icon": "4️⃣", "sub": "Цифры", "desc": "Четыре пальца вверх, большой прижат к ладони."},
        {"id": 37, "category": "numbers", "label": "Пять", "icon": "5️⃣", "sub": "Цифры", "desc": "Ладонь полностью раскрыта."},
        {"id": 38, "category": "numbers", "label": "Шесть", "icon": "6️⃣", "sub": "Цифры", "desc": "Большой и мизинец соединены, остальные согнуты."},
        {"id": 39, "category": "numbers", "label": "Семь", "icon": "7️⃣", "sub": "Цифры", "desc": "Большой, указательный и средний вверх (как птичка)."},
        {"id": 40, "category": "numbers", "label": "Восемь", "icon": "8️⃣", "sub": "Цифры", "desc": "Большой и указательный в кольцо, остальные раскрыты."},
        {"id": 41, "category": "numbers", "label": "Девять", "icon": "9️⃣", "sub": "Цифры", "desc": "Большой палец согнут, остальные в кулак."},
        {"id": 42, "category": "numbers", "label": "Десять", "icon": "🔟", "sub": "Цифры", "desc": "Кулак, затем раскрытая ладонь (два движения)."},
        {"id": 43, "category": "greetings", "label": "Привет", "icon": "👋", "sub": "Приветствие", "desc": "Легкое покачивание раскрытой ладонью."},
        {"id": 44, "category": "greetings", "label": "До свидания", "icon": "🖐️", "sub": "Приветствие", "desc": "Покачивание ладонью с разведенными пальцами."},
        {"id": 45, "category": "greetings", "label": "Спасибо", "icon": "🙏", "sub": "Этикет", "desc": "Касание подбородка кончиками пальцев и движение вперед."},
        {"id": 46, "category": "greetings", "label": "Пожалуйста", "icon": "🤲", "sub": "Этикет", "desc": "Круговое движение раскрытой ладонью по груди."},
        {"id": 47, "category": "greetings", "label": "Извините", "icon": "😔", "sub": "Этикет", "desc": "Кулак трет грудь круговыми движениями."},
        {"id": 48, "category": "greetings", "label": "Как дела?", "icon": "🤷", "sub": "Вопросы", "desc": "Обе ладони раскрыты, движение от груди."},
        {"id": 49, "category": "greetings", "label": "Хорошо", "icon": "👍", "sub": "Ответы", "desc": "Большой палец вверх, остальные в кулак."},
        {"id": 50, "category": "greetings", "label": "Плохо", "icon": "👎", "sub": "Ответы", "desc": "Большой палец вниз, остальные в кулак."},
        {"id": 51, "category": "emergency", "label": "Помощь", "icon": "🆘", "sub": "Важное", "desc": "Одна рука сжата в кулак, другая ложится сверху."},
        {"id": 52, "category": "emergency", "label": "Опасно", "icon": "⚠️", "sub": "Важное", "desc": "Резкое движение рукой вниз с напряженным выражением."},
        {"id": 53, "category": "emergency", "label": "Пожар", "icon": "🔥", "sub": "Важное", "desc": "Движение кистью вверх-вниз перед собой (имитация пламени)."},
        {"id": 54, "category": "emergency", "label": "Врач", "icon": "🏥", "sub": "Важное", "desc": "Указательный палец рисует крест на лбу."},
        {"id": 55, "category": "emergency", "label": "Полиция", "icon": "👮", "sub": "Важное", "desc": "Жест пистолета (указательный и большой вверх)."},
        {"id": 56, "category": "emergency", "label": "Вызов", "icon": "📞", "sub": "Важное", "desc": "Жест телефон у уха или щеки."},
        {"id": 57, "category": "common", "label": "Я тебя люблю", "icon": "🤟", "sub": "Фраза", "desc": "Мизинец, указательный и большой пальцы вытянуты."},
        {"id": 58, "category": "common", "label": "Дом", "icon": "🏠", "sub": "Предмет", "desc": "Сложенные домиком ладони перед собой."},
        {"id": 59, "category": "common", "label": "Семья", "icon": "👨‍👩‍👧", "sub": "Люди", "desc": "Очерчивание круга двумя руками от груди."},
        {"id": 60, "category": "common", "label": "Мир", "icon": "☮️", "sub": "Слово", "desc": "Движение ладонями в разные стороны от центра."},
        {"id": 61, "category": "common", "label": "Вода", "icon": "💧", "sub": "Предмет", "desc": "Рука сложена ковшиком у губ, движение вниз."},
        {"id": 62, "category": "common", "label": "Еда", "icon": "🍽️", "sub": "Предмет", "desc": "Сложенная щепотью рука подносится ко рту."},
        {"id": 63, "category": "common", "label": "Друг", "icon": "🤝", "sub": "Люди", "desc": "Обе руки сжимаются в рукопожатие перед собой."},
        {"id": 64, "category": "common", "label": "Учиться", "icon": "📚", "sub": "Действие", "desc": "Раскрытая ладонь движется к голове."},
        {"id": 65, "category": "common", "label": "Слышать", "icon": "👂", "sub": "Действие", "desc": "Указательный палец касается уха."},
        {"id": 66, "category": "common", "label": "Говорить", "icon": "🗣️", "sub": "Действие", "desc": "Движение пальцами от губ вперед."},
        {"id": 67, "category": "common", "label": "Понимать", "icon": "💡", "sub": "Действие", "desc": "Указательный палец касается виска."},
        {"id": 68, "category": "common", "label": "Ждать", "icon": "⏳", "sub": "Действие", "desc": "Рука вытянута вперед, пальцы перебирают."},
        {"id": 69, "category": "common", "label": "Идти", "icon": "🚶", "sub": "Действие", "desc": "Указательный и средний шагают по ладони."},
        {"id": 70, "category": "common", "label": "Стоп", "icon": "🛑", "sub": "Действие", "desc": "Ладонь раскрыта, направлена вперед."},
        {"id": 71, "category": "common", "label": "Красивый", "icon": "✨", "sub": "Качество", "desc": "Движение пальцами перед лицом (веер)."},
        {"id": 72, "category": "common", "label": "Большой", "icon": "📏", "sub": "Качество", "desc": "Руки разводятся в стороны от груди."},
        {"id": 73, "category": "colors", "label": "Красный", "icon": "🔴", "sub": "Цвет", "desc": "Круговое движение пальца у губ (как помада)."},
        {"id": 74, "category": "colors", "label": "Синий", "icon": "🔵", "sub": "Цвет", "desc": "Ладонь сжата, движение вниз от подбородка."},
        {"id": 75, "category": "colors", "label": "Зеленый", "icon": "🟢", "sub": "Цвет", "desc": "Сжатая кисть, движение от груди вперед."},
        {"id": 76, "category": "colors", "label": "Желтый", "icon": "🟡", "sub": "Цвет", "desc": "Указательный палец крутит у виска."},
        {"id": 77, "category": "colors", "label": "Белый", "icon": "⚪", "sub": "Цвет", "desc": "Ладонь от груди вниз, пальцы вместе."},
        {"id": 78, "category": "colors", "label": "Черный", "icon": "⚫", "sub": "Цвет", "desc": "Указательный палец проводит по брови."},
    ]}

@app.post("/api/signs/progress")
async def update_sign_progress(payload: dict):
    """Update a user's progress on a specific sign."""
    username = payload.get("username")
    sign_id = payload.get("sign_id")
    correct = payload.get("correct", True)
    if not username or not sign_id:
        raise HTTPException(status_code=400, detail="username and sign_id required")
    try:
        async with aiosqlite.connect("users.db", timeout=10) as conn:
            await conn.execute(
                """INSERT INTO sign_progress (username, sign_id, learned, times_practiced, last_practiced, correct_count, wrong_count)
                   VALUES (?, ?, 1, 1, datetime('now'), ?, ?)
                   ON CONFLICT(username, sign_id) DO UPDATE SET
                       learned = 1,
                       times_practiced = times_practiced + 1,
                       last_practiced = datetime('now'),
                       correct_count = correct_count + ?,
                       wrong_count = wrong_count + ?""",
                (username, sign_id, 1 if correct else 0, 0 if correct else 1, 1 if correct else 0, 0 if correct else 1)
            )
            await conn.commit()
        return {"success": True}
    except Exception as e:
        logger.error(f"Sign progress error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/signs/progress/{username}")
async def get_sign_progress(username: str):
    """Get all progress records for a user."""
    try:
        async with aiosqlite.connect("users.db", timeout=10) as conn:
            async with conn.execute(
                "SELECT sign_id, learned, times_practiced, last_practiced, correct_count, wrong_count FROM sign_progress WHERE username = ?",
                (username,)
            ) as cursor:
                rows = await cursor.fetchall()
        return {"progress": [
            {"sign_id": r[0], "learned": r[1], "times_practiced": r[2], "last_practiced": r[3], "correct_count": r[4], "wrong_count": r[5]}
            for r in rows
        ]}
    except Exception as e:
        logger.error(f"Get sign progress error: {e}")
        return {"progress": []}

@app.get("/api/signs/stats/{username}")
async def get_sign_stats(username: str):
    """Get aggregate learning statistics for a user."""
    try:
        async with aiosqlite.connect("users.db", timeout=10) as conn:
            async with conn.execute(
                "SELECT COUNT(*), COALESCE(SUM(times_practiced),0), COALESCE(SUM(correct_count),0), COALESCE(SUM(wrong_count),0) FROM sign_progress WHERE username = ?",
                (username,)
            ) as cursor:
                row = await cursor.fetchone()
        learned = row[0] if row else 0
        practiced = row[1] if row else 0
        correct = row[2] if row else 0
        wrong = row[3] if row else 0
        total_attempts = correct + wrong
        accuracy = round((correct / total_attempts) * 100, 1) if total_attempts > 0 else None
        return {
            "learned": learned,
            "practiced": practiced,
            "correct": correct,
            "wrong": wrong,
            "accuracy": accuracy,
            "total": 78
        }
    except Exception as e:
        logger.error(f"Get sign stats error: {e}")
        return {"learned": 0, "practiced": 0, "correct": 0, "wrong": 0, "accuracy": None, "total": 78}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
