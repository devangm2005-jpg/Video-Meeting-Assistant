"""
Speech-to-text engine.

Routes each audio chunk to one of two backends depending on the requested
language mode:
- "english"  -> local Whisper model
- "hinglish" -> Sarvam AI speech-to-text-translate API (translates to English
                while transcribing, useful for Hindi/Hinglish meetings)
"""

import os
from faster_whisper import WhisperModel
import requests
from pydub import AudioSegment

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")

_model = None

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_STT_TRANSLATE_URL = "https://api.sarvam.ai/speech-to-text-translate"
SARVAM_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v2.5")
SARVAM_PIECE_SECONDS = 25


def load_model():
    global _model
    if _model is None:
        print(f"Loading Whisper model: {WHISPER_MODEL}...")
        _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
        print("Whisper model loaded successfully")
    return _model


def _send_to_sarvam(piece_path: str) -> str:
    """Send one <=30s WAV file to Sarvam and return the English transcript."""
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


def transcribe_chunk_whisper(chunk_path: str) -> str:
    model = load_model()
    # The new engine returns a generator; we join the segments together
    segments, info = model.transcribe(chunk_path, beam_size=5)
    return " ".join([segment.text for segment in segments])


def transcribe_chunk_sarvam(chunk_path: str) -> str:
    """
    Sarvam's sync API only accepts <=30s audio. We split this chunk into
    25-second pieces, send each separately, and join the transcripts.
    """
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not set in environment/.env")

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
    """Route one chunk to Whisper or Sarvam depending on language choice."""
    if language.lower() == "hinglish":
        return transcribe_chunk_sarvam(chunk_path)
    return transcribe_chunk_whisper(chunk_path)


def transcribe_all(chunks: list, language: str = "english", on_progress=None) -> str:
    full_transcript = ""

    for i, chunk in enumerate(chunks):
        text = transcribe_chunk(chunk, language=language)
        full_transcript += text + " "
        if on_progress:
            on_progress(i + 1, len(chunks))

    return full_transcript.strip()
