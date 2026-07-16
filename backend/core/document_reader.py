"""
Extracts plain text from uploaded documents (PDF / DOCX / TXT) so they can be
fed into the RAG chatbot alongside audio/video transcripts.
"""

import os
from pypdf import PdfReader
import docx


def read_pdf(path: str) -> str:
    reader = PdfReader(path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def read_docx(path: str) -> str:
    document = docx.Document(path)
    return "\n".join(p.text for p in document.paragraphs)


def read_txt(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_text(path: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        return read_pdf(path)
    if ext == ".docx":
        return read_docx(path)
    if ext in (".txt", ".md"):
        return read_txt(path)
    raise ValueError(f"Unsupported document type: {ext}")
