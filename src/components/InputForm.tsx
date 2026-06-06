import { useState } from "react";

export interface AircraftInput {
  aircraft_id: string;
  arrival_time: number;
  burst_time: number;
  priority: number;
  max_need: number[];
}

export interface SimulationConfig {
  available: number[];
  aircraft: AircraftInput[];
}

interface Props {
  onStart: (config: SimulationConfig) => void;
}

const DEFAULTS: SimulationConfig = {
  available: [3, 3, 2],
  aircraft: [
    { aircraft_id: "A1", arrival_time: 0, burst_time: 3, priority: 2, max_need: [2, 2, 1] },
    { aircraft_id: "A2", arrival_time: 1, burst_time: 2, priority: 1, max_need: [1, 1, 0] },
    { aircraft_id: "A3", arrival_time: 2, burst_time: 4, priority: 3, max_need: [1, 1, 2] },
  ],
};

function clamp(val: string, min: number, max: number): number {
  const n = parseInt(val, 10);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export default function InputForm({ onStart }: Props) {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULTS);
  const [errors, setErrors] = useState<string[]>([]);

  const updateAvailable = (i: number, val: string) => {
    const next = [...config.available];
    next[i] = clamp(val, 0, 20);
    setConfig({ ...config, available: next });
  };

  const updateAircraft = (
    idx: number,
    field: keyof AircraftInput,
    val: string | number[],
  ) => {
    const next = config.aircraft.map((a, i) =>
      i === idx ? { ...a, [field]: val } : a
    );
    setConfig({ ...config, aircraft: next });
  };

  const updateNeed = (idx: number, ri: number, val: string) => {
    const need = [...config.aircraft[idx].max_need];
    need[ri] = clamp(val, 0, 20);
    updateAircraft(idx, "max_need", need);
  };

  const addAircraft = () => {
    const n = config.aircraft.length + 1;
    setConfig({
      ...config,
      aircraft: [
        ...config.aircraft,
        {
          aircraft_id: `A${n}`,
          arrival_time: 0,
          burst_time: 2,
          priority: n,
          max_need: [1, 1, 0],
        },
      ],
    });
  };

  const removeAircraft = (idx: number) => {
    setConfig({
      ...config,
      aircraft: config.aircraft.filter((_, i) => i !== idx),
    });
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (config.aircraft.length === 0) errs.push("Add at least one aircraft.");
    const ids = config.aircraft.map((a) => a.aircraft_id.trim());
    if (new Set(ids).size !== ids.length) errs.push("Aircraft IDs must be unique.");
    if (ids.some((id) => id === "")) errs.push("Aircraft IDs cannot be empty.");
    for (const a of config.aircraft) {
      if (a.burst_time < 1) errs.push(`${a.aircraft_id}: burst time must be ≥ 1.`);
      if (a.priority < 1) errs.push(`${a.aircraft_id}: priority must be ≥ 1.`);
    }
    return errs;
  };

  const handleStart = () => {
    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    onStart(config);
  };

  const labelCls = "text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1 block";
  const inputCls =
    "w-full bg-[hsl(220,18%,12%)] border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary transition-colors";

  return (
    <div className="space-y-6">
      {/* Available resources */}
      <div>
        <p className={labelCls}>Total Available Resources</p>
        <div className="grid grid-cols-3 gap-3">
          {["Runway", "Gate", "Taxiway"].map((res, i) => (
            <div key={res}>
              <label className="text-[10px] font-mono text-muted-foreground block mb-1">{res}</label>
              <input
                type="number"
                min={0}
                max={20}
                value={config.available[i]}
                onChange={(e) => updateAvailable(i, e.target.value)}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Aircraft */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={labelCls + " mb-0"}>Aircraft</p>
          <button
            onClick={addAircraft}
            className="text-xs font-mono text-primary hover:text-primary/80 transition-colors"
          >
            + Add
          </button>
        </div>

        <div className="space-y-3">
          {config.aircraft.map((aircraft, idx) => (
            <div key={idx} className="bg-[hsl(220,18%,12%)] border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-primary font-bold">{aircraft.aircraft_id || `Aircraft ${idx + 1}`}</span>
                {config.aircraft.length > 1 && (
                  <button
                    onClick={() => removeAircraft(idx)}
                    className="text-[10px] font-mono text-destructive hover:opacity-80"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">ID</label>
                  <input
                    type="text"
                    value={aircraft.aircraft_id}
                    maxLength={8}
                    onChange={(e) => updateAircraft(idx, "aircraft_id", e.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">Priority (1=high)</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={aircraft.priority}
                    onChange={(e) => updateAircraft(idx, "priority", clamp(e.target.value, 1, 99))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">Arrival Time</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={aircraft.arrival_time}
                    onChange={(e) => updateAircraft(idx, "arrival_time", clamp(e.target.value, 0, 50))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-muted-foreground block mb-1">Burst Time</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={aircraft.burst_time}
                    onChange={(e) => updateAircraft(idx, "burst_time", clamp(e.target.value, 1, 20))}
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground block mb-1">Max Need (Runway / Gate / Taxiway)</label>
                <div className="grid grid-cols-3 gap-2">
                  {["R", "G", "T"].map((label, ri) => (
                    <div key={ri} className="flex items-center gap-1">
                      <span className="text-[10px] font-mono text-muted-foreground w-3">{label}</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={aircraft.max_need[ri]}
                        onChange={(e) => updateNeed(idx, ri, e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs font-mono text-destructive">{e}</p>
          ))}
        </div>
      )}

      <button
        onClick={handleStart}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-mono text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Run Simulation
      </button>
    </div>
  );
}
