import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, FileText, MessageSquare, ListChecks, ArrowRight } from "lucide-react";
import { listWorkspaces } from "../lib/history.js";
import Reel from "../components/Reel.jsx";

const FEATURES = [
  {
    icon: Mic,
    title: "Pull the audio",
    body: "Drop in a video file, an audio file, or a URL — we lift a clean track out of it.",
  },
  {
    icon: FileText,
    title: "Get a transcript",
    body: "Whisper (or Sarvam for Hinglish) turns the track into readable, searchable text.",
  },
  {
    icon: ListChecks,
    title: "Read the minutes",
    body: "Summary, key decisions, action items with owners, and open questions — generated on demand.",
  },
  {
    icon: MessageSquare,
    title: "Ask it anything",
    body: "Chat with the transcript, or drop in a separate PDF/DOCX and question that instead.",
  },
];

export default function Home() {
  const [workspaces, setWorkspaces] = useState([]);
  const navigate = useNavigate();

  useEffect(() => setWorkspaces(listWorkspaces()), []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
      <div className="flex items-center gap-2 text-rec mb-6">
        <Reel size={18} spinning />
        <span className="font-mono text-xs tracking-widest2 uppercase">recording · rolling</span>
      </div>

      <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-wide text-paper">
        EVERY MEETING,
        <br />
        <span className="text-rec">FULLY LOGGED.</span>
      </h1>

      <p className="mt-6 max-w-xl text-fog text-lg leading-relaxed">
        Feed Reelmark a video, an audio file, or a link. Get the track, the transcript, the minutes,
        and a chatbot that only speaks from what was actually said.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={() => navigate("/new")} className="btn-primary text-sm px-5 py-3">
          Start a new recording <ArrowRight size={16} />
        </button>
        <button onClick={() => navigate("/documents")} className="btn-secondary text-sm px-5 py-3">
          Chat with a document instead
        </button>
      </div>

      <div className="mt-16 grid sm:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className="card p-5">
            <div className="flex items-center gap-2 text-muted font-mono text-xs mb-3">
              <span className="text-rec2">{String(i + 1).padStart(2, "0")}</span>
              <span className="tracking-widest2 uppercase">step</span>
            </div>
            <Icon size={20} className="text-rec2 mb-3" />
            <h3 className="font-semibold text-paper">{title}</h3>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      {workspaces.length > 0 && (
        <div className="mt-16">
          <p className="eyebrow mb-4">Continue where you left off</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {workspaces.slice(0, 4).map((w) => (
              <button
                key={w.jobId}
                onClick={() => navigate(`/workspace/${w.jobId}`)}
                className="card p-4 text-left hover:border-rec2/60 transition-colors"
              >
                <p className="font-medium text-paper line-clamp-1">{w.title || "Untitled recording"}</p>
                <p className="text-xs text-muted font-mono mt-1">{w.status}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
