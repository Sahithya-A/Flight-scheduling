export const RESOURCE_NAMES = ["Runway", "Gate", "Taxiway"] as const;

export interface Aircraft {
  aircraft_id: string;
  arrival_time: number;
  burst_time: number;
  priority: number;
  max_need: number[];
  allocation: number[];
  remaining_time: number;
  completed: boolean;
}

export interface SimulationStep {
  time: number;
  event: "arrive" | "allocate" | "run" | "release" | "idle" | "wait" | "safe_check";
  aircraft_id: string | null;
  message: string;
  available: number[];
  gantt_slot: string;
  safe_sequence?: string[];
  allocations: Record<string, number[]>;
  queue: string[];
}

function createAircraft(
  aircraft_id: string,
  arrival_time: number,
  burst_time: number,
  priority: number,
  max_need: number[]
): Aircraft {
  return {
    aircraft_id,
    arrival_time,
    burst_time,
    priority,
    max_need,
    allocation: [0, 0, 0],
    remaining_time: burst_time,
    completed: false,
  };
}

function getNeed(aircraft: Aircraft): number[] {
  return aircraft.max_need.map((m, i) => m - aircraft.allocation[i]);
}

function hasResources(aircraft: Aircraft): boolean {
  return aircraft.allocation.every((a, i) => a === aircraft.max_need[i]);
}

function safetyCheck(
  arrivedAircraft: Aircraft[],
  testAvailable: number[],
  testAllocations?: Record<string, number[]>
): { safe: boolean; sequence: string[] } {
  const work = [...testAvailable];
  const finish: boolean[] = arrivedAircraft.map((a) => a.completed);
  const safeSequence: string[] = [];

  for (const aircraft of arrivedAircraft) {
    if (aircraft.completed) {
      safeSequence.push(aircraft.aircraft_id);
    }
  }

  const testNeed: Record<string, number[]> = {};
  const testAlloc: Record<string, number[]> = {};

  for (const aircraft of arrivedAircraft) {
    const allocation =
      testAllocations && testAllocations[aircraft.aircraft_id]
        ? [...testAllocations[aircraft.aircraft_id]]
        : [...aircraft.allocation];

    testAlloc[aircraft.aircraft_id] = allocation;
    testNeed[aircraft.aircraft_id] = aircraft.max_need.map(
      (m, i) => m - allocation[i]
    );
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < arrivedAircraft.length; i++) {
      if (finish[i]) continue;
      const aircraft = arrivedAircraft[i];
      const need = testNeed[aircraft.aircraft_id];
      if (need.every((n, j) => n <= work[j])) {
        const alloc = testAlloc[aircraft.aircraft_id];
        for (let j = 0; j < 3; j++) {
          work[j] += alloc[j];
        }
        finish[i] = true;
        safeSequence.push(aircraft.aircraft_id);
        changed = true;
      }
    }
  }

  return { safe: finish.every(Boolean), sequence: safeSequence };
}

export function runSimulation(
  availableInit: number[],
  aircraftInputs: Array<{
    aircraft_id: string;
    arrival_time: number;
    burst_time: number;
    priority: number;
    max_need: number[];
  }>
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  const available = [...availableInit];

  const aircraftList: Aircraft[] = aircraftInputs
    .map((a) =>
      createAircraft(
        a.aircraft_id,
        a.arrival_time,
        a.burst_time,
        a.priority,
        a.max_need
      )
    )
    .sort((a, b) => a.arrival_time - b.arrival_time);

  const arrivedAircraft: Aircraft[] = [];

  const getAllocations = () => {
    const result: Record<string, number[]> = {};
    for (const a of arrivedAircraft) {
      result[a.aircraft_id] = [...a.allocation];
    }
    return result;
  };

  const getQueue = (readyQueue: Aircraft[]) =>
    readyQueue
      .filter((a) => !a.completed)
      .sort((a, b) =>
        a.priority !== b.priority
          ? a.priority - b.priority
          : a.arrival_time - b.arrival_time
      )
      .map((a) => a.aircraft_id);

  let time = 0;
  let index = 0;
  let completedCount = 0;
  const readyQueue: Aircraft[] = [];

  const maxTime = 200;

  while (completedCount < aircraftList.length && time < maxTime) {
    while (index < aircraftList.length && aircraftList[index].arrival_time <= time) {
      const aircraft = aircraftList[index];
      arrivedAircraft.push(aircraft);
      readyQueue.push(aircraft);
      steps.push({
        time,
        event: "arrive",
        aircraft_id: aircraft.aircraft_id,
        message: `${aircraft.aircraft_id} arrives. Priority ${aircraft.priority}.`,
        available: [...available],
        gantt_slot: "",
        allocations: getAllocations(),
        queue: getQueue(readyQueue),
      });
      index++;
    }

    const pending = readyQueue.filter((a) => !a.completed);
    pending.sort((a, b) =>
      a.priority !== b.priority
        ? a.priority - b.priority
        : a.arrival_time - b.arrival_time
    );

    let selected: Aircraft | null = null;
    const skipped: Aircraft[] = [];

    for (const aircraft of pending) {
      if (hasResources(aircraft)) {
        selected = aircraft;
        break;
      }

      const request = getNeed(aircraft);

      if (request.every((r, i) => r <= available[i])) {
        const testAvail = available.map((a, i) => a - request[i]);
        const testAlloc: Record<string, number[]> = {
          [aircraft.aircraft_id]: aircraft.allocation.map(
            (a, i) => a + request[i]
          ),
        };
        const { safe, sequence } = safetyCheck(arrivedAircraft, testAvail, testAlloc);

        steps.push({
          time,
          event: "safe_check",
          aircraft_id: aircraft.aircraft_id,
          message: `Banker's check for ${aircraft.aircraft_id}: ${safe ? "SAFE" : "UNSAFE"}`,
          available: [...available],
          gantt_slot: "",
          safe_sequence: sequence,
          allocations: getAllocations(),
          queue: getQueue(readyQueue),
        });

        if (safe) {
          for (let i = 0; i < 3; i++) {
            available[i] -= request[i];
            aircraft.allocation[i] += request[i];
          }
          steps.push({
            time,
            event: "allocate",
            aircraft_id: aircraft.aircraft_id,
            message: `Allocated to ${aircraft.aircraft_id}: R=${request[0]} G=${request[1]} T=${request[2]}`,
            available: [...available],
            gantt_slot: "",
            safe_sequence: sequence,
            allocations: getAllocations(),
            queue: getQueue(readyQueue),
          });
          selected = aircraft;
          break;
        } else {
          skipped.push(aircraft);
          steps.push({
            time,
            event: "wait",
            aircraft_id: aircraft.aircraft_id,
            message: `${aircraft.aircraft_id} waits — unsafe to allocate now.`,
            available: [...available],
            gantt_slot: "",
            safe_sequence: sequence,
            allocations: getAllocations(),
            queue: getQueue(readyQueue),
          });
        }
      } else {
        skipped.push(aircraft);
        steps.push({
          time,
          event: "wait",
          aircraft_id: aircraft.aircraft_id,
          message: `${aircraft.aircraft_id} waits — resources unavailable (need R=${getNeed(aircraft)[0]} G=${getNeed(aircraft)[1]} T=${getNeed(aircraft)[2]}, have R=${available[0]} G=${available[1]} T=${available[2]}).`,
          available: [...available],
          gantt_slot: "",
          allocations: getAllocations(),
          queue: getQueue(readyQueue),
        });
      }
    }

    if (selected === null) {
      steps.push({
        time,
        event: "idle",
        aircraft_id: null,
        message: "Airport idle — no aircraft can run.",
        available: [...available],
        gantt_slot: "Idle",
        allocations: getAllocations(),
        queue: getQueue(readyQueue),
      });
      time++;
      continue;
    }

    selected.remaining_time--;
    steps.push({
      time,
      event: "run",
      aircraft_id: selected.aircraft_id,
      message: `${selected.aircraft_id} uses airport resources. Remaining: ${selected.remaining_time}`,
      available: [...available],
      gantt_slot: selected.aircraft_id,
      allocations: getAllocations(),
      queue: getQueue(readyQueue),
    });

    time++;

    if (selected.remaining_time === 0) {
      const released = [...selected.allocation];
      for (let i = 0; i < 3; i++) {
        available[i] += selected.allocation[i];
        selected.allocation[i] = 0;
      }
      selected.completed = true;
      completedCount++;
      steps.push({
        time,
        event: "release",
        aircraft_id: selected.aircraft_id,
        message: `${selected.aircraft_id} completes! Released R=${released[0]} G=${released[1]} T=${released[2]}`,
        available: [...available],
        gantt_slot: "",
        allocations: getAllocations(),
        queue: getQueue(readyQueue.filter((a) => a !== selected)),
      });
    }
  }

  return steps;
}
