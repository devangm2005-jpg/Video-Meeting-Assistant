# Reelmark — Meeting & Video Assistant

Full-stack app: turn any video/audio/URL into audio, a transcript, meeting minutes
(summary, decisions, action items, open questions), and a RAG chatbot you can question —
plus a separate flow to chat directly with an uploaded PDF/DOCX/TXT document.

```
.
├── backend/     FastAPI service (deploy to Render)
└── frontend/    React + Vite app (deploy to Vercel)
```

## Quick start (local)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # add MISTRAL_API_KEY
uvicorn main:app --reload
```
Requires `ffmpeg` installed locally.

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_API_BASE_URL=http://localhost:8000
npm run dev
```

Open the printed local URL — you should see the Reelmark dashboard.

## Deploying

- **Backend → Render**: see `backend/README.md`. Ships with a `Dockerfile` and `render.yaml`
  (Docker is used so `ffmpeg` and Whisper's system deps install correctly).
- **Frontend → Vercel**: see `frontend/README.md`. Set `VITE_API_BASE_URL` to your Render URL.
- After both are live, set the backend's `FRONTEND_ORIGIN` env var to your Vercel URL for CORS.

## How the four features map to the API

1. **Audio from video/URL** — `POST /api/media/extract-audio` (file upload or `url` form field)
2. **Transcript** — `POST /api/transcript/{job_id}`
3. **RAG chatbot over audio/video/text document** — `POST /api/rag/session/from-job/{job_id}` or
   `POST /api/rag/session/from-document` (PDF/DOCX/TXT), then `POST /api/rag/ask`
4. **Summary / decisions / actions / questions** — `POST /api/analysis/{job_id}/summary|decisions|actions|questions`

Full interactive docs are available at `<backend-url>/docs` once the backend is running.

## What was fixed from the original prototype scripts

The six files you provided were adapted into `backend/core/` and `backend/utils/` with these bugs fixed:
- `summarizer.py`: `map_chain.invoke({"text":chunk} for chunk in chunks)` passed a generator into
  a single `.invoke()` call instead of mapping over each chunk — now a proper list comprehension.
- `vector_store.py`: `get_retriever` had a typo (`searc_type`) that would throw at request time;
  `load_vector_store()` called `Chroma.from_documents()` with no documents to re-open an existing
  collection — now uses the correct `Chroma(...)` constructor, and every RAG session gets its own
  isolated collection so different transcripts/documents never mix context.
- `rag_engine.py`: `load_rag_chain()` called `build_vector_store()` and `get_retriever()` with
  missing required arguments; contained a typo ("Ig the answer"); now sessions are explicit and
  looked up by ID instead of relying on process-wide globals.
- `audio_processor.py`: `cookiesfrombrowser: ("chrome",)` reads cookies from a desktop Chrome
  profile — this cannot work on a server and would crash every request in production. Replaced
  with an optional `YTDLP_COOKIES_FILE` (Netscape-format cookies.txt) for the rare restricted video.
- `transcriber.py` / `extractor.py`: cleaned up unused imports and minor typos, wired to accept
  a shared job-based storage layout instead of hardcoded paths.

## Known production considerations

- Job and RAG-session state is kept in an in-memory dict for simplicity (`backend/core/job_store.py`).
  It resets on redeploy and won't work across multiple backend instances — fine for a single Render
  instance / demo use, but swap in Redis or a database table for real multi-instance traffic.
- Transcription requests are synchronous; very long recordings may take a while and could exceed
  some proxies' request timeouts. For production at scale, move transcription to a background
  worker (Celery/RQ) and have the frontend poll a status endpoint instead.
