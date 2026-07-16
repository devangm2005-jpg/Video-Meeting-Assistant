const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://video-meeting-assistant.onrender.com";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export const api = {
  base: API_BASE,

  health: () => fetch(`${API_BASE}/api/health`).then(handle),

  // --- 1. Media -------------------------------------------------------
  extractAudioFromUrl: (url) => {
    const form = new FormData();
    form.append("url", url);
    return fetch(`${API_BASE}/api/media/extract-audio`, { method: "POST", body: form }).then(handle);
  },
  extractAudioFromFile: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/api/media/extract-audio`, { method: "POST", body: form }).then(handle);
  },
  audioUrl: (jobId) => `${API_BASE}/api/media/audio/${jobId}`,

  // --- 2. Transcript ----------------------------------------------------
  createTranscript: (jobId, { language = "english", chunk_minutes = 10 } = {}) =>
    fetch(`${API_BASE}/api/transcript/${jobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, chunk_minutes }),
    }).then(handle),
  getTranscript: (jobId) => fetch(`${API_BASE}/api/transcript/${jobId}`).then(handle),
  registerTranscriptText: (transcript, title) =>
    fetch(`${API_BASE}/api/transcript/from-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, title }),
    }).then(handle),

  // --- 3. Analysis --------------------------------------------------------
  getSummary: (jobId) => fetch(`${API_BASE}/api/analysis/${jobId}/summary`, { method: "POST" }).then(handle),
  getDecisions: (jobId) => fetch(`${API_BASE}/api/analysis/${jobId}/decisions`, { method: "POST" }).then(handle),
  getActions: (jobId) => fetch(`${API_BASE}/api/analysis/${jobId}/actions`, { method: "POST" }).then(handle),
  getQuestions: (jobId) => fetch(`${API_BASE}/api/analysis/${jobId}/questions`, { method: "POST" }).then(handle),
  getAnalysis: (jobId) => fetch(`${API_BASE}/api/analysis/${jobId}`).then(handle),

  // --- 4. RAG chat ---------------------------------------------------------
  createRagSessionFromJob: (jobId) =>
    fetch(`${API_BASE}/api/rag/session/from-job/${jobId}`, { method: "POST" }).then(handle),
  createRagSessionFromDocument: (file) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${API_BASE}/api/rag/session/from-document`, { method: "POST", body: form }).then(handle);
  },
  ask: (sessionId, question) =>
    fetch(`${API_BASE}/api/rag/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, question }),
    }).then(handle),
};

export { ApiError };
