# Deaf Assist Application

This workspace contains a FastAPI backend plus a simple React frontend for a
proof-of-concept application that
helps deaf or hard-of-hearing users by providing real-time subtitles, lecture
notes, AI summaries, and emergency alerts.

## Getting Started

### Python Backend

1. Create a Python virtual environment and activate it (example using `venv`):
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
2. Install dependencies:
   ```powershell
   pip install -r backend/requirements.py
   ```
3. Create `.env` by copying the example:
   ```powershell
   copy .env.example .env
   # then edit .env and set your OpenAI key if you want AI features
   ```
4. Run the backend server:
   ```powershell
   cd backend
   uvicorn main:app --reload
   ```

### Frontend

The frontend is a simple React app located under `front/` (uses Vite) and the
landing page under `lendinig/`.

You can start the React dev server (requires Node.js/npm):

```bash
cd front
npm install
npm run dev
```

or just open `lendinig/index.html` directly in your browser for static demo.

## Available API Endpoints

All endpoints are mounted under `http://127.0.0.1:8000` by default.

- `GET /` – health check
- `GET /api/ai/status` – returns whether OpenAI features are enabled
- `POST /api/register` – register a user
- `POST /api/login` – authenticate user
- `GET /api/alerts` – get current alerts (in-memory)
- `POST /api/alerts` – submit a new alert
- `POST /api/sos` – send an SOS event (stores in SQLite)
- `POST /api/summarize` – generate a text summary (AI or fallback)
- `POST /api/lectures` – save lecture notes
- `GET /api/lectures` – list saved lectures
- `GET /api/lectures/{id}` – fetch a lecture by ID
- `POST /api/transcribe` – upload audio for transcription
- `GET /api/sos-history` – view past SOS events
- `POST /api/detect-danger` – check text for dangerous keywords
- `GET /ws/subtitles` – websocket for real‑time transcription

## Notes

- If you do not provide a valid `OPENAI_API_KEY`, AI endpoints will either
  return simple fallbacks (e.g. truncated text) or indicate the feature is
  disabled. This ensures the app continues functioning with or without a key.
- The SQLite databases (`users.db`) are created automatically in the backend
  folder.

For any problems, check the backend terminal logs; errors are logged to help
debug issues such as invalid API keys or file I/O problems.
