import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FileText,
  Sparkles,
  Gavel,
  ListChecks,
  HelpCircle,
  MessageSquare,
  Download,
  RefreshCw,
} from "lucide-react";
import { api, ApiError } from "../lib/api.js";
import { updateWorkspace } from "../lib/history.js";
import Reel from "../components/Reel.jsx";
import Banner from "../components/Banner.jsx";
import FormattedText from "../components/FormattedText.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

const TABS = [
  { id: "transcript", label: "Transcript", icon: FileText },
  { id: "summary", label: "Summary", icon: Sparkles },
  { id: "decisions", label: "Decisions", icon: Gavel },
  { id: "actions", label: "Action items", icon: ListChecks },
  { id: "questions", label: "Open questions", icon: HelpCircle },
  { id: "chat", label: "Chat", icon: MessageSquare },
];

export default function Workspace() {
  const { jobId } = useParams();
  const [tab, setTab] = useState("transcript");
  const [transcript, setTranscript] = useState(null);
  const [analysis, setAnalysis] = useState({});
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await api.getTranscript(jobId);
        if (!cancelled) setTranscript(t.transcript);
      } catch {
        if (!cancelled) setError("Couldn't load a transcript for this recording yet.");
      }
      try {
        const a = await api.getAnalysis(jobId);
        if (!cancelled) {
          setAnalysis(a);
          if (a.title) updateWorkspace(jobId, { title: a.title });
        }
      } catch {
        /* no analysis yet — fine */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (tab === "chat" && !sessionId && !sessionLoading && transcript) {
      setSessionLoading(true);
      api
        .createRagSessionFromJob(jobId)
        .then((res) => setSessionId(res.session_id))
        .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't start the chat session."))
        .finally(() => setSessionLoading(false));
    }
  }, [tab, sessionId, sessionLoading, transcript, jobId]);

  async function runAnalysis(key, fetcher) {
    setError("");
    setLoadingKey(key);
    try {
      const res = await fetcher(jobId);
      setAnalysis((a) => ({ ...a, ...res }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Couldn't generate ${key}.`);
    } finally {
      setLoadingKey(null);
    }
  }

  const analysisMap = {
    summary: { fetcher: api.getSummary, field: "summary" },
    decisions: { fetcher: api.getDecisions, field: "decisions" },
    actions: { fetcher: api.getActions, field: "actions" },
    questions: { fetcher: api.getQuestions, field: "questions" },
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 h-full flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="eyebrow mb-1">Workspace</p>
          <h1 className="font-display text-3xl md:text-4xl tracking-wide text-paper">
            {analysis.title || "UNTITLED RECORDING"}
          </h1>
          <p className="text-xs text-muted font-mono mt-1">job · {jobId}</p>
        </div>
        <a href={api.audioUrl(jobId)} className="btn-secondary text-xs px-3 py-2 shrink-0" download>
          <Download size={14} /> Audio
        </a>
      </div>

      <div className="flex gap-1 mb-6 border-b border-line overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`tab-btn flex items-center gap-1.5 shrink-0 ${tab === id ? "active" : ""}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5">
          <Banner type="error" onDismiss={() => setError("")}>{error}</Banner>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {tab === "transcript" && (
          <div className="card p-5 max-h-[65vh] overflow-y-auto">
            {transcript ? (
              <p className="font-mono text-sm text-fog leading-relaxed whitespace-pre-line">{transcript}</p>
            ) : (
              <p className="text-muted text-sm">No transcript available yet.</p>
            )}
          </div>
        )}

        {["summary", "decisions", "actions", "questions"].includes(tab) && (
          <AnalysisTab
            tab={tab}
            value={analysis[analysisMap[tab].field]}
            loading={loadingKey === tab}
            onGenerate={() => runAnalysis(tab, analysisMap[tab].fetcher)}
          />
        )}

        {tab === "chat" && (
          <div className="card p-5 h-[65vh]">
            {sessionLoading && !sessionId ? (
              <div className="h-full flex items-center justify-center gap-2 text-muted text-sm">
                <Reel size={16} spinning className="text-rec" />
                indexing this transcript for chat...
              </div>
            ) : (
              <ChatPanel sessionId={sessionId} emptyHint="Ask about anything discussed in this recording." />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisTab({ tab, value, loading, onGenerate }) {
  if (loading) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center gap-3 text-muted text-sm">
        <Reel size={22} spinning className="text-rec" />
        generating {tab}...
      </div>
    );
  }

  if (!value) {
    return (
      <div className="card p-10 flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted">Nothing generated yet for this tab.</p>
        <button onClick={onGenerate} className="btn-primary text-sm px-4 py-2">
          Generate {tab}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5 max-h-[65vh] overflow-y-auto">
      <div className="flex justify-end mb-3">
        <button onClick={onGenerate} className="text-xs text-muted hover:text-rec2 flex items-center gap-1">
          <RefreshCw size={12} /> Regenerate
        </button>
      </div>
      <FormattedText text={value} />
    </div>
  );
}
