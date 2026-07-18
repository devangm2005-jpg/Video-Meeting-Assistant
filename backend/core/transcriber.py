"""
Speech-to-text engine.

Routes each audio chunk to one of two backends depending on the requested
language mode:
- "english"  -> Groq Whisper API (Free, fast, cloud-based)
- "hinglish" -> Sarvam AI speech-to-text-translate API (translates to English
                while transcribing, useful for Hindi/Hinglish meetings)
"""

import os
import time
import requests
from groq import Groq
from pydub import AudioSegment

# --- Configuration ---
# Groq is used for "english" mode to save local RAM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "whisper-large-v3"  # Free tier model

# Sarvam is used for "hinglish" mode
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_STT_TRANSLATE_URL = "https://sarvam.ai"
SARVAM_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v2.5")
SARVAM_PIECE_SECONDS = 25

# Initialize Groq Client
# Ensure GROQ_API_KEY is set in your .env or Render environment
client = None
if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)


def _send_to_sarvam(piece_path: str) -> str:
    """Send one <=30s WAV file to Sarvam and return the English transcript."""
    if not SARVAM_API_KEY:
         raise RuntimeError("SARVAM_API_KEY is missing")
         
    headers = {"api-subscription-key": SARVAM_API_KEY}

    with open(piece_path, "rb") as f:
        files = {"file": (os.path.basename(piece_path), f, "audio/wav")}
        data = {"model": SARVAM_MODEL, "with_diarization": "false"}
        response = requests.post(
            SARVAM_STT_TRANSLATE_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=120,
        )

    if not response.ok:
        raise RuntimeError(f"Sarvam API returned {response.status_code}: {response.text}")

    return response.json().get("transcript", "")


def transcribe_chunk_groq(chunk_path: str) -> str:
    """
    Sends audio chunk to Groq's Whisper API.
    Includes a sleep timer to respect the Free Tier rate limit (20 requests/min).
    """
    if not client:
        raise RuntimeError("GROQ_API_KEY is not set. Cannot use Groq for transcription.")

    with open(chunk_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(os.path.basename(chunk_path), file.read()),
            model=GROQ_MODEL,
            response_format="json",  # Returns a JSON object with a 'text' field
            language="en"
        )
    
    # GROQ FREE TIER LIMIT: 20 requests per minute.
    # We sleep for 4 seconds to ensure we never exceed ~15 requests/min.
    time.sleep(4) 
    
    return transcription.text


def transcribe_chunk_sarvam(chunk_path: str) -> str:
    """
    Sarvam's sync API only accepts <=30s audio. We split this chunk into
    25-second pieces, send each separately, and join the transcripts.
    """
    audio = AudioSegment.from_wav(chunk_path)
    piece_ms = SARVAM_PIECE_SECONDS * 1000

    full_text = ""
    for start in range(0, len(audio), piece_ms):
        piece = audio[start : start + piece_ms]
        piece_path = f"{chunk_path}_sv_{start}.wav"
        piece.export(piece_path, format="wav")
        try:
            full_text += _send_to_sarvam(piece_path) + " "
        finally:
            if os.path.exists(piece_path):
                os.remove(piece_path)

    return full_text.strip()


def transcribe_chunk(chunk_path: str, language: str = "english") -> str:
    """Route one chunk to Groq or Sarvam depending on language choice."""
    if language.lower() == "hinglish":
        return transcribe_chunk_sarvam(chunk_path)
    # Default to Groq for English
    return transcribe_chunk_groq(chunk_path)


def transcribe_all(chunks: list, language: str = "english", on_progress=None) -> str:
    full_transcript = ""

    for i, chunk in enumerate(chunks):
        text = transcribe_chunk(chunk, language=language)
        full_transcript += text + " "
        if on_progress:
            on_progress(i + 1, len(chunks))

    return full_transcript.strip()
