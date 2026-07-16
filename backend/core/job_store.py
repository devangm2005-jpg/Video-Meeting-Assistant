"""
Very small in-memory job registry.

This keeps the service simple to deploy on a single Render instance without
a database. Each entry tracks the state of one piece of media as it moves
through: audio extracted -> transcribed -> analyzed / RAG-indexed.

NOTE: state is lost on process restart / across multiple instances. For a
multi-instance production deployment, swap this for Redis or a database
table keyed the same way (job_id -> dict).
"""

import threading

_lock = threading.Lock()
_jobs: dict[str, dict] = {}


def create(job_id: str, **fields) -> dict:
    with _lock:
        job = {"job_id": job_id, "status": "created", **fields}
        _jobs[job_id] = job
        return job


def update(job_id: str, **fields) -> dict:
    with _lock:
        if job_id not in _jobs:
            _jobs[job_id] = {"job_id": job_id}
        _jobs[job_id].update(fields)
        return _jobs[job_id]


def get(job_id: str) -> dict | None:
    with _lock:
        return _jobs.get(job_id)


def exists(job_id: str) -> bool:
    with _lock:
        return job_id in _jobs
