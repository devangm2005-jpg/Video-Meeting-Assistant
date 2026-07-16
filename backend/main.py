"""
Meeting Assistant API

Endpoints are grouped into four feature areas that mirror the product:

1. /api/media/*      - pull audio out of an uploaded file or a URL
2. /api/transcript/* - turn that audio into text
3. /api/analysis/*   - summary / decisions / action items / questions from a transcript
4. /api/rag/*        - chat with a transcript OR an uploaded document (RAG)
"""

import os
import shutil
import traceback
import uuid

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from utils.audio_processor import new_job_dir, process_input, chunk_audio
from core import job_store
from core.transcriber import transcribe_all
from core.summarizer import summarize, generate_title
from core.extractor import extract_action_items, extract_key_decisions, extract_questions
from core.rag_engine import create_session, ask_question
from core.document_reader import extract_text


STORAGE_ROOT = os.getenv("DOWNLOAD_DIR", "storage/downloads")
os.makedirs(STORAGE_ROOT, exist_ok=True)

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "500"))

app = FastAPI(title="Meeting Assistant API", version="1.0.0")

origins = os.getenv("FRONTEND_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins.split(",")] if origins != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _job_or_404(job_id: str) -> dict:
    job = job_store.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


def _error(e: Exception):
    traceback.print_exc()
    raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# 1. Media - extract audio from an uploaded file or a URL
# ---------------------------------------------------------------------------

@app.post("/api/media/extract-audio")
async def extract_audio(
    file: UploadFile | None = File(default=None),
    url: str | None = Form(default=None),
):
    if not file and not url:
        raise HTTPException(status_code=400, detail="Provide either a file or a url.")

    job_id, job_dir = new_job_dir()
    job_store.create(job_id, status="extracting_audio", source_type="url" if url else "file")

    try:
        if url:
            wav_path = await run_in_threadpool(process_input, url, job_dir)
        else:
            raw_path = os.path.join(job_dir, file.filename)
            with open(raw_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            wav_path = await run_in_threadpool(process_input, raw_path, job_dir)

        job_store.update(job_id, status="audio_ready", wav_path=wav_path)

        return {
            "job_id": job_id,
            "status": "audio_ready",
            "audio_url": f"/api/media/audio/{job_id}",
        }
    except Exception as e:
        job_store.update(job_id, status="error", error=str(e))
        _error(e)


@app.get("/api/media/audio/{job_id}")
def download_audio(job_id: str):
    job = _job_or_404(job_id)
    wav_path = job.get("wav_path")
    if not wav_path or not os.path.exists(wav_path):
        raise HTTPException(status_code=404, detail="Audio not ready for this job")
    return FileResponse(wav_path, media_type="audio/wav", filename=f"{job_id}.wav")


# ---------------------------------------------------------------------------
# 2. Transcript
# ---------------------------------------------------------------------------

class TranscribeRequest(BaseModel):
    language: str = "english"  # "english" | "hinglish"
    chunk_minutes: int = 10


@app.post("/api/transcript/{job_id}")
async def create_transcript(job_id: str, body: TranscribeRequest):
    job = _job_or_404(job_id)
    wav_path = job.get("wav_path")
    if not wav_path or not os.path.exists(wav_path):
        raise HTTPException(status_code=400, detail="Extract audio for this job first.")

    job_store.update(job_id, status="transcribing")

    try:
        chunks = await run_in_threadpool(chunk_audio, wav_path, body.chunk_minutes)
        transcript = await run_in_threadpool(transcribe_all, chunks, body.language)

        job_store.update(job_id, status="transcribed", transcript=transcript, language=body.language)

        return {"job_id": job_id, "status": "transcribed", "transcript": transcript}
    except Exception as e:
        job_store.update(job_id, status="error", error=str(e))
        _error(e)


from fastapi import HTTPException

@app.get("/api/transcript/{job_id}")
def get_transcript(job_id: str):
    job = _job_or_404(job_id)
    transcript = job.get("transcript")
    
    # Check if the transcript is still processing
    if not transcript:
        return {
            "job_id": job_id, 
            "status": "processing", 
            "transcript": None
        }
        
    return {
        "job_id": job_id, 
        "status": "completed", 
        "transcript": transcript
    }



class TranscriptTextRequest(BaseModel):
    """Lets the frontend register a transcript it already has (e.g. pasted
    text) as a job, so the same analysis/RAG endpoints can be reused."""
    transcript: str
    title: str | None = None


@app.post("/api/transcript/from-text")
def register_transcript(body: TranscriptTextRequest):
    job_id = uuid.uuid4().hex[:12]
    job_store.create(job_id, status="transcribed", transcript=body.transcript, source_type="text")
    return {"job_id": job_id, "status": "transcribed", "transcript": body.transcript}


# ---------------------------------------------------------------------------
# 3. Analysis - summary / decisions / action items / questions
# ---------------------------------------------------------------------------

def _transcript_or_400(job_id: str) -> str:
    job = _job_or_404(job_id)
    transcript = job.get("transcript")
    if not transcript:
        raise HTTPException(status_code=400, detail="This job has no transcript yet.")
    return transcript


@app.post("/api/analysis/{job_id}/summary")
async def analysis_summary(job_id: str):
    transcript = _transcript_or_400(job_id)
    try:
        title = await run_in_threadpool(generate_title, transcript)
        summary = await run_in_threadpool(summarize, transcript)
        job_store.update(job_id, title=title, summary=summary)
        return {"job_id": job_id, "title": title, "summary": summary}
    except Exception as e:
        _error(e)


@app.post("/api/analysis/{job_id}/decisions")
async def analysis_decisions(job_id: str):
    transcript = _transcript_or_400(job_id)
    try:
        decisions = await run_in_threadpool(extract_key_decisions, transcript)
        job_store.update(job_id, decisions=decisions)
        return {"job_id": job_id, "decisions": decisions}
    except Exception as e:
        _error(e)


@app.post("/api/analysis/{job_id}/actions")
async def analysis_actions(job_id: str):
    transcript = _transcript_or_400(job_id)
    try:
        actions = await run_in_threadpool(extract_action_items, transcript)
        job_store.update(job_id, actions=actions)
        return {"job_id": job_id, "actions": actions}
    except Exception as e:
        _error(e)


@app.post("/api/analysis/{job_id}/questions")
async def analysis_questions(job_id: str):
    transcript = _transcript_or_400(job_id)
    try:
        questions = await run_in_threadpool(extract_questions, transcript)
        job_store.update(job_id, questions=questions)
        return {"job_id": job_id, "questions": questions}
    except Exception as e:
        _error(e)


@app.get("/api/analysis/{job_id}")
def get_analysis(job_id: str):
    job = _job_or_404(job_id)
    return {
        "job_id": job_id,
        "title": job.get("title"),
        "summary": job.get("summary"),
        "decisions": job.get("decisions"),
        "actions": job.get("actions"),
        "questions": job.get("questions"),
    }


# ---------------------------------------------------------------------------
# 4. RAG chatbot - over a transcript job OR an uploaded document
# ---------------------------------------------------------------------------

@app.post("/api/rag/session/from-job/{job_id}")
async def rag_session_from_job(job_id: str):
    transcript = _transcript_or_400(job_id)
    session_id = f"job_{job_id}"
    try:
        await run_in_threadpool(create_session, transcript, session_id)
        return {"session_id": session_id}
    except Exception as e:
        _error(e)


@app.post("/api/rag/session/from-document")
async def rag_session_from_document(file: UploadFile = File(...)):
    session_id = uuid.uuid4().hex[:12]
    job_dir = os.path.join(STORAGE_ROOT, "documents", session_id)
    os.makedirs(job_dir, exist_ok=True)
    doc_path = os.path.join(job_dir, file.filename)

    with open(doc_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        text = await run_in_threadpool(extract_text, doc_path)
        if not text.strip():
            raise ValueError("Could not extract any text from this document.")
        await run_in_threadpool(create_session, text, session_id)
        return {"session_id": session_id, "characters_indexed": len(text)}
    except Exception as e:
        _error(e)


class AskRequest(BaseModel):
    session_id: str
    question: str


@app.post("/api/rag/ask")
async def rag_ask(body: AskRequest):
    try:
        answer = await run_in_threadpool(ask_question, body.session_id, body.question)
        return {"session_id": body.session_id, "question": body.question, "answer": answer}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        _error(e)


if __name__ == "__main__":
    import uvicorn
    # Changed reload to False for production stability
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
