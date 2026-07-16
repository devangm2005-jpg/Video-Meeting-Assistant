import { useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { api, ApiError } from "../lib/api.js";
import Banner from "../components/Banner.jsx";
import Reel from "../components/Reel.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

export default function Documents() {
  const [file, setFile] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  async function handleIndex() {
    if (!file) return;
    setError("");
    setIndexing(true);
    try {
      const res = await api.createRagSessionFromDocument(file);
      setSessionId(res.session_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't read that document.");
    } finally {
      setIndexing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14 h-full flex flex-col">
      <p className="eyebrow mb-2">Chat with a document</p>
      <h1 className="font-display text-4xl tracking-wide text-paper mb-2">READ THE ROOM</h1>
      <p className="text-fog mb-8 max-w-lg">
        Drop in a PDF, Word doc, or plain text file — meeting notes, a spec, minutes someone else
        typed up — and ask it questions directly, no audio required.
      </p>

      {!sessionId ? (
        <div className="card p-8">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-line hover:border-rec2/60 transition-colors px-6 py-10 text-center"
          >
            <UploadCloud size={26} className="mx-auto text-muted mb-2" />
            <p className="text-sm text-fog">{file ? file.name : "Click to choose a document"}</p>
            <p className="text-xs text-muted mt-1">PDF, DOCX, or TXT</p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {error && (
            <div className="mt-4">
              <Banner type="error" onDismiss={() => setError("")}>{error}</Banner>
            </div>
          )}

          <button
            onClick={handleIndex}
            disabled={!file || indexing}
            className="btn-primary w-full text-sm py-3 mt-5"
          >
            {indexing ? (
              <>
                <Reel size={16} spinning /> Reading document...
              </>
            ) : (
              <>
                <FileText size={16} /> Start chatting
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="card p-5 flex-1 min-h-[60vh]">
          <div className="flex items-center gap-2 text-sm text-muted mb-3 font-mono">
            <FileText size={14} className="text-rec2" /> {file?.name}
          </div>
          <ChatPanel sessionId={sessionId} emptyHint="Ask anything about this document." />
        </div>
      )}
    </div>
  );
}
