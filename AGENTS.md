# AGENTS.md — Deaf Assist (Hearless)

## Project structure

- `backend/main.py` — active FastAPI backend (port 8000)
- `front/` — active Vite + React frontend (port 5173)
- `lendinig/` — static landing page (open `index.html` directly)
- `hearless/`, `dashbord/`, `&/` — deleted (stale copies / empty dirs)

## Backend

- Run: `uvicorn main:app --reload` from `backend/`
- Dependencies: `pip install -r backend/requirements.txt`
- **Database: Supabase** (PostgreSQL). Tables: `users`, `lectures`, `sos_events`, `sign_progress`
- Passwords: SHA-256 hashing (no bcrypt)
- CORS: wide open (`*`)

### AI providers (env vars)

| Var | Provider | Used for |
|-----|----------|----------|
| `XAI_API_KEY` | xAI Grok (`grok-beta`) | danger detection, summarization, chat |
| `OPENAI_API_KEY` | OpenAI Whisper | STT fallback (transcribe) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Supabase | PostgreSQL database |

### Subtitles (STT)

- Dashboard uses **browser SpeechRecognition API** (Web Speech) — no backend dependency
- Languages: русский (`ru-RU`), қазақша (`kk-KZ`), English (`en-US`)
- Recognized text sent to backend via HTTP for danger detection (xAI Grok)

### Test

- `test_api.py` — crude register/login smoke test (requires backend running)

## Frontend

- Dev: `cd front && npm install && npm run dev` (port 5173)
- Build: `cd front && npm run build` (output `front/dist/`)
- Vercel deploys from `front/` with build command `cd front && npm install && npm run build`
- Camera practice uses MediaPipe Hands (loaded dynamically from CDN)
- No TypeScript, no CSS modules, no test framework
