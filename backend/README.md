# Meeting Assistant — Backend

FastAPI service powering the meeting/video assistant. Wraps four feature areas:

| Area | Endpoints |
|---|---|
| Audio extraction | `POST /api/media/extract-audio`, `GET /api/media/audio/{job_id}` |
| Transcription | `POST /api/transcript/{job_id}`, `GET /api/transcript/{job_id}`, `POST /api/transcript/from-text` |
| Analysis | `POST /api/analysis/{job_id}/summary\|decisions\|actions\|questions`, `GET /api/analysis/{job_id}` |
| RAG chatbot | `POST /api/rag/session/from-job/{job_id}`, `POST /api/rag/session/from-document`, `POST /api/rag/ask` |

Full request/response shapes are documented via the interactive API docs at `/docs` once running.

## Local development

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in MISTRAL_API_KEY
uvicorn main:app --reload
```

You also need **ffmpeg** installed locally (`brew install ffmpeg` / `apt install ffmpeg`) for audio conversion.

## Deploying to Render

This repo ships with a `Dockerfile` and `render.yaml` (Docker is used instead of Render's native Python
runtime because Whisper + ffmpeg need system packages Render's buildpack doesn't install).

1. Push this `backend/` folder to a git repo (or the whole project, pointing Render at this subdirectory).
2. In Render: **New → Blueprint**, point it at the repo, it will read `render.yaml`.
3. Set the `MISTRAL_API_KEY` (and optionally `SARVAM_API_KEY`) environment variables in the Render dashboard.
4. Once deployed, set `FRONTEND_ORIGIN` to your Vercel URL (e.g. `https://your-app.vercel.app`) instead of `*`.
5. Note your service URL (e.g. `https://meeting-assistant-api.onrender.com`) — the frontend needs it as `VITE_API_BASE_URL`.

### Notes on production readiness
- Job/session state is kept **in-memory** for simplicity — it resets on redeploy/restart and won't work across
  multiple instances. For real multi-instance production traffic, swap `core/job_store.py` for Redis or a database.
- Whisper's `small` model is a reasonable default; use `tiny`/`base` on constrained Render plans, or swap in
  a hosted STT API if you need faster/larger-scale transcription.
- YouTube extraction uses `yt-dlp`. Some videos require cookies (age-restricted/region-locked); set
  `YTDLP_COOKIES_FILE` to a Netscape-format `cookies.txt` path if you hit those. Do **not** use
  browser-cookie extraction on a server — it only works on your own desktop.
