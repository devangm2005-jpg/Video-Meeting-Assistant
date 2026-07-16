# Reelmark — Frontend

React (Vite) frontend for the meeting/video assistant. Talks to the FastAPI backend in `../backend`.

## Features → pages

| Feature | Where |
|---|---|
| Get audio from a video path/URL | `New recording → Paste a URL / Upload a file` |
| Get a transcript | Same flow, continues automatically after audio extraction |
| RAG chatbot over audio/video/text document | `Workspace → Chat` tab, or the standalone `Chat with a document` page |
| Summary / decisions / action items / questions | `Workspace` tabs, generated on demand |

## Local development

```bash
cd frontend
npm install
cp .env.example .env.local   # point VITE_API_BASE_URL at your local backend
npm run dev
```

## Deploying to Vercel

1. Push this `frontend/` folder to a git repo (Vercel can also be pointed at a subdirectory of a monorepo —
   set **Root Directory** to `frontend` in the Vercel project settings).
2. Framework preset: **Vite**. Build command `npm run build`, output directory `dist` (auto-detected).
3. Add an environment variable `VITE_API_BASE_URL` set to your deployed Render backend URL,
   e.g. `https://meeting-assistant-api.onrender.com` (no trailing slash).
4. Deploy. `vercel.json` in this folder already handles client-side routing rewrites.
5. Back in the backend's environment variables, set `FRONTEND_ORIGIN` to your Vercel URL so CORS allows it.

## Notes
- Job/session state referenced by the UI lives in the backend's memory and in this browser's
  `localStorage` (just the sidebar history list, not the actual data) — clearing localStorage only
  loses the sidebar shortcuts, not anything on the server.
- Long transcriptions can take a while; the "Process recording" flow shows a VU-meter loading state
  and waits for the backend to finish rather than polling, since the current backend responds
  synchronously.
