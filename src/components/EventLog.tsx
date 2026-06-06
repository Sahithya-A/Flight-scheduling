import { useEffect, useRef } from "react";
import type { SimulationStep } from "@/lib/simulation";

const EVENT_STYLES: Record<string, { icon: string; color: string }> = {
  arrive:     { icon: "▸", color: "#34d399" },
  allocate:   { icon: "✦", color: "#38bdf8" },
  run:        { icon: "●", color: "#f59e0b" },
  release:    { icon: "✓", color: "#a78bfa" },
  idle:       { icon: "○", color: "#475569" },
  wait:       { icon: "⏸", color: "#f87171" },
  safe_check: { icon: "⚙", color: "#67e8f9" },
};

interface Props {
  steps: SimulationStep[];
  currentStepIndex: number;
}

export default function EventLog({ steps, currentStepIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentStepIndex]);

  const visibleSteps = steps.slice(0, currentStepIndex + 1);

  return (
    <div className="bg-card rounded-xl border border-border flex flex-col" style={{ height: 320 }}>
      <div className="px-4 py-2 border-b border-border">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Event Log</p>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-xs"
      >
        {visibleSteps.length === 0 && (
          <div className="text-muted-foreground text-center pt-8">
            Press Play or Step to begin
          </div>
        )}
        {visibleSteps.map((step, i) => {
          const style = EVENT_STYLES[step.event] ?? { icon: "·", color: "#64748b" };
          return (
            <div
              key={i}
              className={`flex gap-2 items-start py-0.5 log-entry ${i === currentStepIndex ? "opacity-100" : "opacity-70"}`}
            >
              <span className="shrink-0 w-12 text-right text-muted-foreground">T={step.time}</span>
              <span className="shrink-0" style={{ color: style.color }}>{style.icon}</span>
              <span className="text-foreground/90 leading-snug">{step.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
