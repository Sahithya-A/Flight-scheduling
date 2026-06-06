import { useState, useEffect, useRef, useCallback } from "react";
import InputForm, { type SimulationConfig } from "@/components/InputForm";
import AirportCanvas from "@/components/AirportCanvas";
import GanttChart from "@/components/GanttChart";
import EventLog from "@/components/EventLog";
import { runSimulation, type SimulationStep } from "@/lib/simulation";

type Speed = 1 | 2 | 4;

export default function SimulationPage() {
  const [config, setConfig] = useState<SimulationConfig | null>(null);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [totalResources, setTotalResources] = useState([0, 0, 0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearInterval_ = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const step = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;
  const availableNow = step?.available ?? totalResources;
  const aircraftIds = config?.aircraft.map((a) => a.aircraft_id) ?? [];

  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev + 1 >= steps.length) {
        setPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length]);

  useEffect(() => {
    if (playing) {
      clearInterval_();
      const ms = speed === 4 ? 100 : speed === 2 ? 300 : 700;
      intervalRef.current = setInterval(advance, ms);
    } else {
      clearInterval_();
    }
    return clearInterval_;
  }, [playing, speed, advance]);

  const handleStart = (cfg: SimulationConfig) => {
    clearInterval_();
    setPlaying(false);
    const result = runSimulation(cfg.available, cfg.aircraft);
    setConfig(cfg);
    setSteps(result);
    setTotalResources([...cfg.available]);
    setCurrentStep(-1);
  };

  const handleReset = () => {
    clearInterval_();
    setPlaying(false);
    setCurrentStep(-1);
  };

  const handlePlayPause = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(-1);
      setTimeout(() => setPlaying(true), 50);
    } else {
      setPlaying((p) => !p);
    }
  };

  const isFinished = steps.length > 0 && currentStep >= steps.length - 1;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center gap-3">
        <span className="text-lg">✈</span>
        <div>
          <h1 className="text-sm font-mono font-bold tracking-wide text-foreground">
            Airport Scheduler
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground">
            Preemptive Priority + Banker's Algorithm
          </p>
        </div>
        {config && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              Step {Math.max(0, currentStep + 1)}/{steps.length}
            </span>
            {isFinished && (
              <span className="text-xs font-mono text-accent font-bold">COMPLETE</span>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — input form */}
        <aside className="w-80 border-r border-border overflow-y-auto p-4 shrink-0">
          <InputForm onStart={handleStart} />
        </aside>

        {/* Main area */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {!config ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="text-5xl">✈</div>
                <p className="text-muted-foreground font-mono text-sm">
                  Configure your simulation on the left and press
                </p>
                <p className="text-primary font-mono font-bold">Run Simulation</p>
              </div>
            </div>
          ) : (
            <>
              {/* Controls */}
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
                <button
                  onClick={handlePlayPause}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold hover:opacity-90 transition-all min-w-16"
                >
                  {isFinished ? "Restart" : playing ? "Pause" : "Play"}
                </button>
                <button
                  onClick={advance}
                  disabled={playing || isFinished}
                  className="px-3 py-1.5 rounded-lg border border-border font-mono text-xs hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Step
                </button>
                <button
                  onClick={handleReset}
                  disabled={playing}
                  className="px-3 py-1.5 rounded-lg border border-border font-mono text-xs hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Reset
                </button>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-xs font-mono text-muted-foreground">Speed</span>
                  {([1, 2, 4] as Speed[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded font-mono text-xs transition-all ${
                        speed === s
                          ? "bg-primary text-primary-foreground font-bold"
                          : "border border-border hover:bg-secondary"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Scrubber */}
                <input
                  type="range"
                  min={-1}
                  max={steps.length - 1}
                  value={currentStep}
                  onChange={(e) => {
                    clearInterval_();
                    setPlaying(false);
                    setCurrentStep(Number(e.target.value));
                  }}
                  className="ml-2 w-32 accent-primary"
                />
              </div>

              {/* Visualization grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <AirportCanvas
                    step={step}
                    aircraftIds={aircraftIds}
                    available={availableNow}
                    totalResources={totalResources}
                  />
                </div>
                <div className="col-span-2 space-y-4">
                  <GanttChart
                    steps={steps}
                    currentStepIndex={Math.max(0, currentStep)}
                    aircraftIds={aircraftIds}
                  />
                  <EventLog steps={steps} currentStepIndex={Math.max(0, currentStep)} />
                </div>
              </div>

              {/* Resource allocation table */}
              {step && (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                      Resource Allocation Matrix — T={step.time}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2 text-muted-foreground font-normal">Aircraft</th>
                          <th className="px-3 py-2 text-muted-foreground font-normal" colSpan={3}>Allocation (R/G/T)</th>
                          <th className="px-3 py-2 text-muted-foreground font-normal" colSpan={3}>Max Need (R/G/T)</th>
                          <th className="px-3 py-2 text-muted-foreground font-normal" colSpan={3}>Remaining Need (R/G/T)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.aircraft.map((a) => {
                          const alloc = step.allocations[a.aircraft_id] ?? [0, 0, 0];
                          const need = a.max_need.map((m, i) => m - alloc[i]);
                          const isActive = step.aircraft_id === a.aircraft_id;
                          return (
                            <tr
                              key={a.aircraft_id}
                              className={`border-b border-border/50 ${isActive ? "bg-primary/5" : ""}`}
                            >
                              <td className={`px-4 py-2 font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                                {a.aircraft_id}
                              </td>
                              {alloc.map((v, i) => (
                                <td key={i} className="px-3 py-2 text-center text-foreground">{v}</td>
                              ))}
                              {a.max_need.map((v, i) => (
                                <td key={i} className="px-3 py-2 text-center text-muted-foreground">{v}</td>
                              ))}
                              {need.map((v, i) => (
                                <td
                                  key={i}
                                  className={`px-3 py-2 text-center ${v > 0 ? "text-accent" : "text-muted-foreground/50"}`}
                                >
                                  {v}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                        <tr className="bg-[hsl(220,22%,8%)]">
                          <td className="px-4 py-2 font-bold text-muted-foreground">Available</td>
                          {step.available.map((v, i) => (
                            <td key={i} className="px-3 py-2 text-center text-primary font-bold">{v}</td>
                          ))}
                          <td colSpan={6} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
