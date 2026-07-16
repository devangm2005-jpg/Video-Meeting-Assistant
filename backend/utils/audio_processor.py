"""
Audio acquisition & preprocessing utilities.

Responsible for:
- Downloading audio from a YouTube (or any yt-dlp supported) URL
- Converting arbitrary local audio/video files to a normalized WAV
- Chunking a WAV file into fixed-length pieces for transcription
"""

import os
import uuid
from yt_dlp import YoutubeDL
from pydub import AudioSegment

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "storage/downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Optional: path to a Netscape-format cookies.txt file for age/region
# restricted YouTube videos. NOT set by default - reading cookies directly
# from a desktop browser (as the original prototype did) does not work on a
# headless server such as Render, so it is disabled unless explicitly configured.
YTDLP_COOKIES_FILE = os.getenv("YTDLP_COOKIES_FILE")


def download_youtube_audio(url: str, job_dir: str) -> str:
    """Download the best available audio track for a URL and return the wav path."""
    os.makedirs(job_dir, exist_ok=True)
    output_path = os.path.join(job_dir, "source.%(ext)s")

    ydl_opts = {
        "format": "bestaudio/best",
        'remote_components': 'ejs:github',  # Automatically downloads the missing challenge solver scripts
        'js_runtime': 'node',                # Explicitly instructs yt-dlp to use your Node.js engine
        "outtmpl": output_path,
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
        },
        "extractor_args": {
            "youtube": {"player_client": ["android","web"]},
        },
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
                "preferredquality": "192",
            }
        ],
        "quiet": True,
        "noplaylist": True,
    }

    if YTDLP_COOKIES_FILE and os.path.exists(YTDLP_COOKIES_FILE):
        ydl_opts["cookiefile"] = YTDLP_COOKIES_FILE

    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        video_id = info.get("id", "source")

    wav_path = os.path.join(job_dir, "source.wav")
    if not os.path.exists(wav_path):
        # yt-dlp names the post-processed file after the outtmpl id token
        candidate = os.path.join(job_dir, f"{video_id}.wav")
        if os.path.exists(candidate):
            os.rename(candidate, wav_path)

    return wav_path


def convert_to_wav(input_path: str, job_dir: str) -> str:
    """Convert any uploaded audio/video file to a normalized mono 16kHz WAV."""
    os.makedirs(job_dir, exist_ok=True)
    output_path = os.path.join(job_dir, "source.wav")
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(16000)
    audio.export(output_path, format="wav")
    return output_path


def chunk_audio(wav_path: str, chunk_minutes: int = 10) -> list:
    """Split a WAV file into fixed length chunks. Returns list of chunk paths."""
    audio = AudioSegment.from_wav(wav_path)
    chunk_ms = chunk_minutes * 60 * 1000

    chunks = []
    base_path = os.path.splitext(wav_path)[0]

    for i, start in enumerate(range(0, len(audio), chunk_ms)):
        chunk = audio[start : start + chunk_ms]
        chunk_path = f"{base_path}_chunk_{i}.wav"
        chunk.export(chunk_path, format="wav")
        chunks.append(chunk_path)

    return chunks


def new_job_dir() -> tuple[str, str]:
    """Create a fresh unique job directory. Returns (job_id, job_dir)."""
    job_id = uuid.uuid4().hex[:12]
    job_dir = os.path.join(DOWNLOAD_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)
    return job_id, job_dir


def process_input(source: str, job_dir: str) -> str:
    """Acquire audio from a URL or local file path and return the wav path
    (not yet chunked)."""
    if source.startswith("http://") or source.startswith("https://"):
        wav_path = download_youtube_audio(source, job_dir)
    else:
        wav_path = convert_to_wav(source, job_dir)
    return wav_path
