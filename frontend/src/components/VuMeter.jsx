export default function VuMeter({ label }) {
  const bars = Array.from({ length: 14 });
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div className="flex items-end gap-1 h-10">
        {bars.map((_, i) => (
          <span
            key={i}
            className="w-1.5 rounded-sm bg-rec/80"
            style={{
              height: `${8 + ((i * 37) % 32)}px`,
              animation: `blink ${0.6 + (i % 5) * 0.13}s ease-in-out infinite`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
      {label && <p className="font-mono text-xs tracking-widest2 uppercase text-muted">{label}</p>}
    </div>
  );
}
