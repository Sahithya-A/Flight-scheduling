import { useMemo } from "react";
import type { SimulationStep } from "@/lib/simulation";

const AIRCRAFT_COLORS = [
  "#38bdf8", "#34d399", "#f59e0b", "#f87171", "#a78bfa",
  "#fb7185", "#67e8f9", "#86efac", "#fcd34d", "#c084fc",
];

interface Props {
  steps: SimulationStep[];
  currentStepIndex: number;
  aircraftIds: string[];
}

export default function GanttChart({ steps, currentStepIndex, aircraftIds }: Props) {
  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    aircraftIds.forEach((id, i) => {
      map[id] = AIRCRAFT_COLORS[i % AIRCRAFT_COLORS.length];
    });
    return map;
  }, [aircraftIds]);

  const slots = useMemo(() => {
    const result: Array<{ time: number; label: string }> = [];
    for (let i = 0; i <= currentStepIndex; i++) {
      const step = steps[i];
      if (step.gantt_slot) {
        result.push({ time: step.time, label: step.gantt_slot });
      }
    }
    return result;
  }, [steps, currentStepIndex]);

  if (slots.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Gantt Chart</p>
        <div className="h-12 flex items-center justify-center text-muted-foreground text-xs font-mono">
          Simulation not started
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Gantt Chart</p>
      <div className="overflow-x-auto">
        <div className="flex items-end gap-0 min-w-0">
          {slots.map((slot, i) => {
            const isIdle = slot.label === "Idle";
            const color = isIdle ? "#334155" : (colorMap[slot.label] ?? "#64748b");
            return (
              <div key={i} className="flex flex-col items-center" style={{ minWidth: 32 }}>
                <div
                  className="w-7 h-8 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold transition-all duration-300"
                  style={{
                    background: `${color}33`,
                    border: `1px solid ${color}88`,
                    color: isIdle ? "#64748b" : color,
                  }}
                  title={`T${slot.time}: ${slot.label}`}
                >
                  {slot.label === "Idle" ? "—" : slot.label.slice(0, 2)}
                </div>
                <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                  {slot.time}
                </div>
              </div>
            );
          })}
          <div className="flex flex-col items-center" style={{ minWidth: 32 }}>
            <div className="w-px h-8 bg-border" />
            <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
              {slots.length > 0 ? slots[slots.length - 1].time + 1 : 0}
            </div>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
        {aircraftIds.map((id) => (
          <div key={id} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: colorMap[id], opacity: 0.7 }}
            />
            <span className="text-[10px] font-mono text-muted-foreground">{id}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-700 opacity-70" />
          <span className="text-[10px] font-mono text-muted-foreground">Idle</span>
        </div>
      </div>
    </div>
  );
}
