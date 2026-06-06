from dataclasses import dataclass, field
import heapq


RESOURCE_NAMES = ["Runway", "Gate", "Taxiway"]
RESOURCE_LABELS = ["R", "G", "T"]


@dataclass
class Aircraft:
    aircraft_id: str
    arrival_time: int
    burst_time: int
    priority: int
    max_need: list[int]
    allocation: list[int] = field(default_factory=lambda: [0, 0, 0])
    remaining_time: int = 0
    completed: bool = False

    def __post_init__(self):
        self.remaining_time = self.burst_time

    @property
    def need(self):
        return [
            self.max_need[i] - self.allocation[i]
            for i in range(len(RESOURCE_NAMES))
        ]

    @property
    def has_resources(self):
        return all(self.allocation[i] == self.max_need[i] for i in range(len(RESOURCE_NAMES)))


class AirportResourceManager:
    def __init__(self, available):
        self.available = available
        self.aircraft = []
        self.arrived_aircraft = []

    def add_aircraft(self, aircraft):
        self.aircraft.append(aircraft)

    def mark_arrived(self, aircraft):
        self.arrived_aircraft.append(aircraft)

    def safety_check(self, test_available, test_allocations=None):
        work = test_available[:]
        finish = []
        safe_sequence = []

        for aircraft in self.arrived_aircraft:
            finish.append(aircraft.completed)

        for index, aircraft in enumerate(self.arrived_aircraft):
            if aircraft.completed:
                safe_sequence.append(aircraft.aircraft_id)
                continue

            allocation = aircraft.allocation[:]
            if test_allocations and aircraft.aircraft_id in test_allocations:
                allocation = test_allocations[aircraft.aircraft_id][:]

            need = [
                aircraft.max_need[i] - allocation[i]
                for i in range(len(RESOURCE_NAMES))
            ]

            if all(value == 0 for value in allocation) and all(value == 0 for value in aircraft.max_need):
                finish[index] = True
            aircraft.test_allocation = allocation
            aircraft.test_need = need

        while not all(finish):
            found = False

            for index, aircraft in enumerate(self.arrived_aircraft):
                if finish[index]:
                    continue

                if all(aircraft.test_need[i] <= work[i] for i in range(len(RESOURCE_NAMES))):
                    for i in range(len(RESOURCE_NAMES)):
                        work[i] += aircraft.test_allocation[i]

                    finish[index] = True
                    safe_sequence.append(aircraft.aircraft_id)
                    found = True

            if not found:
                return False, safe_sequence

        return True, safe_sequence

    def request_resources(self, aircraft, request):
        if any(request[i] > aircraft.need[i] for i in range(len(RESOURCE_NAMES))):
            return False, "Request is greater than aircraft's remaining need.", []

        if any(request[i] > self.available[i] for i in range(len(RESOURCE_NAMES))):
            return False, "Requested resources are not currently available.", []

        test_available = [
            self.available[i] - request[i]
            for i in range(len(RESOURCE_NAMES))
        ]

        test_allocation = {
            aircraft.aircraft_id: [
                aircraft.allocation[i] + request[i]
                for i in range(len(RESOURCE_NAMES))
            ]
        }

        safe, safe_sequence = self.safety_check(test_available, test_allocation)

        if not safe:
            return False, "Allocation would make the system unsafe.", safe_sequence

        for i in range(len(RESOURCE_NAMES)):
            self.available[i] -= request[i]
            aircraft.allocation[i] += request[i]

        return True, "Resources allocated safely.", safe_sequence

    def release_resources(self, aircraft):
        released = aircraft.allocation[:]

        for i in range(len(RESOURCE_NAMES)):
            self.available[i] += aircraft.allocation[i]
            aircraft.allocation[i] = 0

        aircraft.completed = True
        return released


def format_resources(resources):
    return ", ".join(
        f"{RESOURCE_NAMES[i]}={resources[i]}"
        for i in range(len(RESOURCE_NAMES))
    )


def format_compact_resources(resources):
    return " ".join(
        f"{RESOURCE_LABELS[i]}={resources[i]}"
        for i in range(len(RESOURCE_LABELS))
    )


def format_triplet(resources):
    return " ".join(str(value) for value in resources)


def print_resource_allocation_matrix(aircraft_list, manager, time):
    print(f"\n===== RESOURCE ALLOCATION MATRIX - T={time} =====")
    print(
        f"{'Aircraft':<12}"
        f"{'Allocation (R/G/T)':<24}"
        f"{'Max Need (R/G/T)':<24}"
        f"{'Remaining Need (R/G/T)':<24}"
    )
    print("-" * 84)

    for aircraft in aircraft_list:
        print(
            f"{aircraft.aircraft_id:<12}"
            f"{format_triplet(aircraft.allocation):<24}"
            f"{format_triplet(aircraft.max_need):<24}"
            f"{format_triplet(aircraft.need):<24}"
        )

    print(
        f"{'Available':<12}"
        f"{format_triplet(manager.available):<24}"
        f"{'':<24}"
        f"{'':<24}"
    )


def read_int(prompt, minimum=None):
    while True:
        try:
            value = int(input(prompt))
            if minimum is not None and value < minimum:
                print(f"Enter a value greater than or equal to {minimum}.")
                continue
            return value
        except ValueError:
            print("Enter a valid integer.")


def read_resource_row(prompt):
    while True:
        try:
            values = list(map(int, input(prompt).split()))
        except ValueError:
            print("Enter integers separated by spaces.")
            continue

        if len(values) != len(RESOURCE_NAMES):
            print("Enter exactly 3 values: R G T.")
            continue

        if any(value < 0 for value in values):
            print("Resource values cannot be negative.")
            continue

        return values


def read_aircraft_details():
    aircraft_count = read_int("Enter number of aircraft: ", minimum=1)
    aircraft_list = []

    for index in range(aircraft_count):
        print(f"\nAircraft {index + 1}")

        aircraft_id = input("Aircraft ID: ").strip()
        while not aircraft_id:
            print("Aircraft ID cannot be empty.")
            aircraft_id = input("Aircraft ID: ").strip()

        arrival_time = read_int("Arrival time: ", minimum=0)
        burst_time = read_int("Landing/Takeoff time: ", minimum=1)
        priority = read_int("Priority (1 = highest): ", minimum=1)
        max_need = read_resource_row("Max Need (R G T): ")

        aircraft_list.append(
            Aircraft(
                aircraft_id=aircraft_id,
                arrival_time=arrival_time,
                burst_time=burst_time,
                priority=priority,
                max_need=max_need,
            )
        )

    return aircraft_list


def allocate_before_running(manager, aircraft):
    request = aircraft.need[:]

    print(f"  Resource request from {aircraft.aircraft_id}:")
    for i, resource_name in enumerate(RESOURCE_NAMES):
        print(
            f"    {RESOURCE_LABELS[i]} ({resource_name}): "
            f"requested {request[i]}, available {manager.available[i]}"
        )

    allocated, message, safe_sequence = manager.request_resources(aircraft, request)
    status = "SAFE" if allocated else "UNSAFE"

    print(f"  Banker's check for {aircraft.aircraft_id}: {status} - {message}")
    if safe_sequence:
        print(f"  Safe sequence: {' -> '.join(safe_sequence)}")

    if allocated:
        print(f"  Allocated to {aircraft.aircraft_id}: {format_compact_resources(request)}")
        print(f"  Available after allocation: {format_compact_resources(manager.available)}")

    return allocated

#preemptive 
def select_aircraft(ready_queue, manager):
    skipped = []
    selected = None

    while ready_queue:
        _, _, _, aircraft = heapq.heappop(ready_queue)

        if aircraft.completed:
            continue

        if not aircraft.has_resources and not allocate_before_running(manager, aircraft):
            print(f"  {aircraft.aircraft_id} waits because resources cannot be allocated now.")
            skipped.append(aircraft)
            continue

        selected = aircraft
        break

    for aircraft in skipped:
        heapq.heappush(ready_queue, (aircraft.priority, aircraft.arrival_time, aircraft.aircraft_id, aircraft))

    return selected

#preemptive
def simulate_airport(aircraft_list, manager):
    aircraft_list.sort(key=lambda aircraft: aircraft.arrival_time)
    for aircraft in aircraft_list:
        manager.add_aircraft(aircraft)

    ready_queue = []
    time = 0
    index = 0
    completed_count = 0
    gantt_chart = []

    print("\n===== SIMULATION START =====")
    print(f"Initial airport resources (R/G/T): {format_triplet(manager.available)}")

    while completed_count < len(aircraft_list):
        while index < len(aircraft_list) and aircraft_list[index].arrival_time <= time:
            aircraft = aircraft_list[index]
            manager.mark_arrived(aircraft)
            heapq.heappush(ready_queue, (aircraft.priority, aircraft.arrival_time, aircraft.aircraft_id, aircraft))
            print(f"\nT={time}  + {aircraft.aircraft_id} arrives at the airport.")
            print(f"       Priority recorded: {aircraft.priority} (1 = highest)")
            index += 1

        print(f"\nT={time}  Tower checks ready aircraft.")
        current = select_aircraft(ready_queue, manager)

        if current is None:
            gantt_chart.append("Idle")
            print("       Idle: no aircraft can use resources now.")
            time += 1
            continue

        print(f"       RUN: {current.aircraft_id}")
        current.remaining_time -= 1
        gantt_chart.append(current.aircraft_id)
        print(
            f"       {current.aircraft_id} uses airport resources. "
            f"Remaining: {current.remaining_time}"
        )

        time += 1

        if current.remaining_time == 0:
            released = manager.release_resources(current)
            completed_count += 1
            print(
                f"       {current.aircraft_id} completes! "
                f"Released {format_compact_resources(released)}"
            )
            print(f"       Available after release: {format_compact_resources(manager.available)}")
        else:
            heapq.heappush(ready_queue, (current.priority, current.arrival_time, current.aircraft_id, current))

    print("\n===== PREEMPTIVE PRIORITY GANTT CHART =====")
    for slot, aircraft_id in enumerate(gantt_chart):
        print(f"T={slot} -> T={slot + 1}: {aircraft_id}")

    print_resource_allocation_matrix(aircraft_list, manager, time)


def main():
    print("===== AIRPORT PREEMPTIVE PRIORITY + BANKER'S ALGORITHM =====")
    print("Resource order is always: R G T  (Runway Gate Taxiway)")

    available = read_resource_row("\nTotal available resources (R G T): ")
    aircraft_list = read_aircraft_details()
    manager = AirportResourceManager(available)

    simulate_airport(aircraft_list, manager)


if __name__ == "__main__":
    main()
