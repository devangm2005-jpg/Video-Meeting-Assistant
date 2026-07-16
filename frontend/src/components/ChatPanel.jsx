import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { api, ApiError } from "../lib/api.js";
import Reel from "./Reel.jsx";
import Banner from "./Banner.jsx";

export default function ChatPanel({ sessionId, emptyHint }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function handleSend(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question || !sessionId || asking) return;

    setError("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setAsking(true);

    try {
      const res = await api.ask(sessionId, question);
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong reaching the assistant.";
      setError(msg);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 px-1">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">
            {emptyHint || "Ask anything — answers are grounded only in this content."}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                m.role === "user"
                  ? "bg-rec text-ink font-medium"
                  : "bg-panel2 border border-line text-fog"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {asking && (
          <div className="flex justify-start">
            <div className="bg-panel2 border border-line rounded-xl px-4 py-2.5 flex items-center gap-2 text-muted text-sm">
              <Reel size={14} spinning className="text-rec" />
              thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mt-3">
          <Banner type="error" onDismiss={() => setError("")}>{error}</Banner>
        </div>
      )}

      <form onSubmit={handleSend} className="mt-4 flex gap-2">
        <input
          className="input-field"
          placeholder={sessionId ? "Ask a question..." : "Preparing chat session..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!sessionId}
        />
        <button type="submit" className="btn-primary px-4" disabled={!sessionId || asking || !input.trim()}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
