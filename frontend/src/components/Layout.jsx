import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Plus, FileText, Radio } from "lucide-react";
import Reel from "./Reel.jsx";
import { listWorkspaces } from "../lib/history.js";

export default function Layout({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => setWorkspaces(listWorkspaces());
    refresh();
    window.addEventListener("focus", refresh);
    const interval = setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-72 shrink-0 border-r border-line bg-panel flex-col">
        <div className="p-5 border-b border-line">
          <div className="flex items-center gap-2.5 text-paper">
            <Reel size={26} className="text-rec" />
            <span className="font-display text-2xl tracking-wide">REELMARK</span>
          </div>
          <p className="text-xs text-muted mt-1 font-mono">meeting &amp; video assistant</p>
        </div>

        <div className="p-4 space-y-1.5">
          <button
            onClick={() => navigate("/new")}
            className="btn-primary w-full text-sm"
          >
            <Plus size={16} strokeWidth={2.5} /> New recording
          </button>
          <NavLink
            to="/documents"
            className={({ isActive }) =>
              `btn-secondary w-full text-sm mt-2 ${isActive ? "border-rec2 text-paper" : ""}`
            }
          >
            <FileText size={16} /> Chat with a document
          </NavLink>
        </div>

        <div className="px-4 pb-2 pt-2">
          <p className="eyebrow text-[11px]">Recent</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {workspaces.length === 0 && (
            <p className="px-3 py-6 text-sm text-muted text-center">
              Nothing yet — process your first recording.
            </p>
          )}
          {workspaces.map((w) => (
            <NavLink
              key={w.jobId}
              to={`/workspace/${w.jobId}`}
              className={({ isActive }) =>
                `flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-panel2 text-paper" : "text-fog hover:bg-panel2/60"
                }`
              }
            >
              <Radio size={14} className="mt-1 text-rec shrink-0" />
              <span className="line-clamp-2">{w.title || "Untitled recording"}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-line">
          <p className="text-[11px] font-mono text-muted">
            status: <span className="text-decide">online</span>
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b border-line bg-panel px-4 py-3">
          <div className="flex items-center gap-2 text-paper">
            <Reel size={20} className="text-rec" />
            <span className="font-display text-xl tracking-wide">REELMARK</span>
          </div>
          <button onClick={() => navigate("/new")} className="btn-primary text-xs px-3 py-2">
            <Plus size={14} /> New
          </button>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
