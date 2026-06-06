import { useMemo } from "react";
import type { SimulationStep } from "@/lib/simulation";

const AIRCRAFT_COLORS = [
  "#38bdf8", "#34d399", "#f59e0b", "#f87171", "#a78bfa",
  "#fb7185", "#67e8f9", "#86efac", "#fcd34d", "#c084fc",
];

interface Props {
  step: SimulationStep | null;
  aircraftIds: string[];
  available: number[];
  totalResources: number[];
}

export default function AirportCanvas({ step, aircraftIds, available, totalResources }: Props) {
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    aircraftIds.forEach((id, i) => {
      map[id] = AIRCRAFT_COLORS[i % AIRCRAFT_COLORS.length];
    });
    return map;
  }, [aircraftIds]);

  const activeId = step?.aircraft_id;
  const allocations = step?.allocations ?? {};
  const queue = step?.queue ?? [];

  const resourcePct = (used: number, total: number) => total > 0 ? ((total - used) / total) * 100 : 0;

  return (
    <div className="bg-[hsl(220,22%,8%)] rounded-xl border border-border overflow-hidden">
      {/* Airport header */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Tower Control</span>
        <span className="ml-auto text-xs font-mono text-accent">
          {step ? `T=${step.time}` : "T=0"}
        </span>
      </div>

      {/* Main visual area */}
      <div className="p-4 space-y-4">

        {/* Runways */}
        <div className="space-y-1">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Resources</p>
          {(["Runway", "Gate", "Taxiway"] as const).map((res, i) => {
            const used = totalResources[i] - available[i];
            const total = totalResources[i];
            const pct = total > 0 ? (used / total) * 100 : 0;
            return (
              <div key={res} className="flex items-center gap-3">
                <span className="text-xs font-mono w-16 text-muted-foreground">{res}</span>
                <div className="flex-1 h-3 bg-[hsl(220,18%,14%)] rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: pct > 80 ? "#f87171" : pct > 50 ? "#f59e0b" : "#38bdf8",
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-12 text-right text-foreground">
                  {used}/{total}
                </span>
              </div>
            );
          })}
        </div>

        {/* Aircraft fleet */}
        <div className="space-y-1">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Fleet</p>
          <div className="grid grid-cols-2 gap-2">
            {aircraftIds.map((id) => {
              const alloc = allocations[id] ?? [0, 0, 0];
              const isActive = id === activeId;
              const isQueued = queue.includes(id);
              const isCompleted = step?.event === "release" && step.aircraft_id === id
                ? true
                : !isQueued && !isActive && alloc.every(a => a === 0) && step !== null
                  ? false
                  : false;

              let status = "waiting";
              if (isActive) status = "active";
              else if (isQueued) status = "queued";

              return (
                <div
                  key={id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-mono transition-all duration-300 ${
                    isActive
                      ? "border-primary bg-primary/10 shadow-[0_0_12px_2px_hsl(210_90%_55%_/_0.25)] aircraft-active"
                      : isQueued
                      ? "border-border bg-card"
                      : "border-border/40 bg-card/40 opacity-60"
                  }`}
                >
                  {/* Aircraft icon */}
                  <span
                    className="text-base leading-none"
                    style={{ filter: `drop-shadow(0 0 4px ${colorMap[id]})` }}
                  >
                    ✈
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold truncate" style={{ color: colorMap[id] }}>{id}</span>
                      {isActive && (
                        <span className="text-[10px] text-primary">● RUN</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      R:{alloc[0]} G:{alloc[1]} T:{alloc[2]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safe sequence */}
        {step?.safe_sequence && step.safe_sequence.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Safe Sequence</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {step.safe_sequence.map((id, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      background: colorMap[id] ? `${colorMap[id]}22` : "rgba(255,255,255,0.05)",
                      color: colorMap[id] ?? "#aaa",
                      border: `1px solid ${colorMap[id] ?? "#444"}44`,
                    }}
                  >
                    {id}
                  </span>
                  {i < step.safe_sequence!.length - 1 && (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
