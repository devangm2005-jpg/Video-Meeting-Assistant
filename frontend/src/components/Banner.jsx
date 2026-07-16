import { AlertTriangle, Info, X } from "lucide-react";

export default function Banner({ type = "error", children, onDismiss }) {
  const styles =
    type === "error"
      ? "border-rec/40 bg-rec/10 text-rec2"
      : "border-tape/40 bg-tape/10 text-tape";
  const Icon = type === "error" ? AlertTriangle : Info;

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm animate-rise ${styles}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
