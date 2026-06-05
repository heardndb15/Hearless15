# AGENTS.md — Deaf Assist (Hearless)

## Project structure

- `backend/main.py` — active FastAPI backend (port 8000)
- `front/` — active Vite + React frontend (port 5173)
- `lendinig/` — static landing page (open `index.html` directly)
- `hearless/`, `dashbord/`, `&/` — deleted (stale copies / empty dirs)

## Backend

- Run: `uvicorn main:app --reload` from `backend/`
- Dependencies: `pip install -r backend/requirements.txt`
- SQLite `users.db` auto-created on startup in `backend/`; tables: `users`, `lectures`, `sos_events`, `sign_progress`
- Passwords: SHA-256 hashing (no bcrypt)
- CORS: wide open (`*`)

### AI providers (env vars)

| Var | Provider | Used for |
|-----|----------|----------|
| `XAI_API_KEY` | xAI Grok (`grok-beta`) | danger detection, summarization, chat |
| `ALEM_API_KEY_1` | Alem AI (OpenAI-compat) | STT (Whisper), translation |
| `ALEM_API_KEY_2` | Alem AI (OpenAI-compat) | translation refinement (second pass) |

Copy `.env.example` → `.env` and set them (README's `OPENAI_API_KEY` is outdated).

### Sign language endpoints

- `GET /api/signs` — full sign dictionary (78 signs, 7 categories)
- `POST /api/signs/progress` — save practice result `{username, sign_id, correct}`
- `GET /api/signs/progress/{username}` — per-sign progress
- `GET /api/signs/stats/{username}` — aggregate stats (learned, accuracy)

### WebSocket

- `/ws/subtitles` — receives binary audio chunks + JSON control messages (`{text: "END_CHUNK", lang: "ru-RU", translate: bool}`)
- Sends back transcribed (and optionally translated) text

### Test

- `test_api.py` — crude register/login smoke test (requires backend running)

## Frontend

- Dev: `cd front && npm install && npm run dev` (port 5173)
- Build: `cd front && npm run build` (output `front/dist/`)
- Vercel deploys from `front/` with build command `cd front && npm install && npm run build`
- Camera practice uses MediaPipe Hands (loaded dynamically from CDN)
- No TypeScript, no CSS modules, no test framework
