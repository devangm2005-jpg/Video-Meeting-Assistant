"""
Vector store management for the RAG chatbot feature.

Each RAG session (built from a transcript or an uploaded document) gets its
own Chroma collection so different users/jobs never mix context.
"""

import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

CHROMA_ROOT_DIR = os.getenv("CHROMA_ROOT_DIR", "storage/vector_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

os.makedirs(CHROMA_ROOT_DIR, exist_ok=True)

_embeddings = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    return _embeddings


def _collection_dir(session_id: str) -> str:
    path = os.path.join(CHROMA_ROOT_DIR, session_id)
    os.makedirs(path, exist_ok=True)
    return path


def build_vector_store(text: str, session_id: str) -> Chroma:
    """Chunk `text`, embed it, and persist a fresh Chroma collection for this session."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_text(text)

    docs = [
        Document(page_content=chunk, metadata={"chunk_index": i})
        for i, chunk in enumerate(chunks)
    ]

    embeddings = get_embeddings()

    vector_store = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        collection_name=session_id,
        persist_directory=_collection_dir(session_id),
    )

    return vector_store


def load_vector_store(session_id: str) -> Chroma:
    """Re-open a previously built collection for this session."""
    embeddings = get_embeddings()
    return Chroma(
        collection_name=session_id,
        persist_directory=_collection_dir(session_id),
        embedding_function=embeddings,
    )


def session_exists(session_id: str) -> bool:
    path = _collection_dir(session_id)
    return os.path.isdir(path) and len(os.listdir(path)) > 0


def get_retriever(vector_store: Chroma, k: int = 4):
    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k},
    )
