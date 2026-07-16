import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, UploadCloud, Type, ArrowRight } from "lucide-react";
import { api, ApiError } from "../lib/api.js";
import { saveWorkspace, updateWorkspace } from "../lib/history.js";
import Banner from "../components/Banner.jsx";
import VuMeter from "../components/VuMeter.jsx";

const TABS = [
  { id: "url", label: "Paste a URL", icon: Link2 },
  { id: "file", label: "Upload a file", icon: UploadCloud },
  { id: "text", label: "Paste a transcript", icon: Type },
];

export default function NewMeeting() {
  const [tab, setTab] = useState("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [language, setLanguage] = useState("english");
  const [stage, setStage] = useState(null); // null | 'audio' | 'transcript' | 'done'
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const busy = stage === "audio" || stage === "transcript";

  async function runMediaPipeline() {
    setError("");
    try {
      setStage("audio");
      const extract = url
        ? await api.extractAudioFromUrl(url.trim())
        : await api.extractAudioFromFile(file);

      const jobId = extract.job_id;
      saveWorkspace({ jobId, title: url || file?.name || "Untitled recording", status: "audio_ready" });

      setStage("transcript");
      await api.createTranscript(jobId, { language });
      updateWorkspace(jobId, { status: "transcribed" });

      setStage("done");
      navigate(`/workspace/${jobId}`);
    } catch (err) {
      setStage(null);
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  async function runTextPipeline() {
    setError("");
    try {
      setStage("transcript");
      const res = await api.registerTranscriptText(transcriptText.trim());
      saveWorkspace({
        jobId: res.job_id,
        title: transcriptText.trim().slice(0, 60) || "Pasted transcript",
        status: "transcribed",
      });
      setStage("done");
      navigate(`/workspace/${res.job_id}`);
    } catch (err) {
      setStage(null);
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (tab === "text") return runTextPipeline();
    return runMediaPipeline();
  }

  const canSubmit =
    (tab === "url" && url.trim().length > 4) ||
    (tab === "file" && !!file) ||
    (tab === "text" && transcriptText.trim().length > 20);

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="eyebrow mb-2">New recording</p>
      <h1 className="font-display text-4xl tracking-wide text-paper mb-8">GET IT ON TAPE</h1>

      {busy ? (
        <div className="card p-8">
          <VuMeter
            label={
              stage === "audio"
                ? "pulling audio track..."
                : "transcribing — this can take a few minutes for longer recordings..."
            }
          />
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-6 border-b border-line">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`tab-btn flex items-center gap-1.5 ${tab === id ? "active" : ""}`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {tab === "url" && (
              <div>
                <label className="text-sm text-fog font-medium mb-1.5 block">Video or audio URL</label>
                <input
                  className="input-field"
                  placeholder="https://youtube.com/watch?v=..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted mt-1.5">Works with YouTube and most direct media links.</p>
              </div>
            )}

            {tab === "file" && (
              <div>
                <label className="text-sm text-fog font-medium mb-1.5 block">Audio or video file</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-line hover:border-rec2/60 transition-colors px-6 py-10 text-center"
                >
                  <UploadCloud size={26} className="mx-auto text-muted mb-2" />
                  <p className="text-sm text-fog">{file ? file.name : "Click to choose a file"}</p>
                  <p className="text-xs text-muted mt-1">MP4, MOV, MP3, WAV, M4A and more</p>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            )}

            {tab === "text" && (
              <div>
                <label className="text-sm text-fog font-medium mb-1.5 block">Paste an existing transcript</label>
                <textarea
                  className="input-field min-h-[200px] font-mono text-sm"
                  placeholder="[00:00] Alright, let's get started..."
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                />
                <p className="text-xs text-muted mt-1.5">
                  Skips audio processing entirely — heads straight to summary, decisions, and chat.
                </p>
              </div>
            )}

            {tab !== "text" && (
              <div>
                <label className="text-sm text-fog font-medium mb-1.5 block">Spoken language</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage("english")}
                    className={language === "english" ? "btn-primary text-sm py-2 px-4" : "btn-secondary text-sm py-2 px-4"}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("hinglish")}
                    className={language === "hinglish" ? "btn-primary text-sm py-2 px-4" : "btn-secondary text-sm py-2 px-4"}
                  >
                    Hindi / Hinglish → English
                  </button>
                </div>
              </div>
            )}

            {error && <Banner type="error" onDismiss={() => setError("")}>{error}</Banner>}

            <button type="submit" disabled={!canSubmit} className="btn-primary w-full text-sm py-3">
              Process recording <ArrowRight size={16} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
