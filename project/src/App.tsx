import React, { useEffect, useMemo, useState } from "react";

type Frequency = "napi" | "heti" | "havi";
type ViewMode = "mai" | "összes";
type RoomType =
  | "konyha"
  | "nappali"
  | "fürdőszoba"
  | "wc"
  | "hálószoba"
  | "gyerekszoba"
  | "előszoba"
  | "kamra"
  | "mosókonyha"
  | "terasz"
  | "udvar";

type TaskType =
  | "rendrakás"
  | "portörlés"
  | "felület"
  | "konyhai"
  | "padló"
  | "vizes";

type Priority = "magas" | "közepes" | "alacsony";
type FlowType = "start" | "normal" | "finish";

type Room = {
  id: string;
  type: RoomType;
  name: string;
  sizeM2: number | null;
};

type TaskTemplate = {
  roomType: RoomType;
  name: string;
  baseFrequency: Frequency;
  taskType: TaskType;
  estimatedMinutes: number;
  basePriority: Priority;
  flowType: FlowType;
  scaleByPeople?: boolean;
};

type Task = {
  id: string;
  roomId: string;
  roomName: string;
  name: string;
  done: boolean;
  source: "ajánlott" | "egyéni";
  baseFrequency: Frequency;
  manualFrequency: Frequency | null;
  scaleByPeople: boolean;
  basePriority: Priority;
  manualPriority: Priority | null;
  flowType: FlowType;
  taskType: TaskType;
  estimatedMinutes: number;
};

type HouseholdProfile = {
  adults: number;
  children: number;
  totalPeople: number;
  weekdayMinutes: number;
  weekendMinutes: number;
};

type SavedData = {
  onboardingCompleted: boolean;
  householdProfile: HouseholdProfile | null;
  rooms: Room[];
  tasks: Task[];
  viewMode: ViewMode;
  includeWeeklyInToday: boolean;
};

const STORAGE_KEY = "pureplan-web-clean-v1";

const ROOM_LIBRARY: { type: RoomType; label: string; icon: string }[] = [
  { type: "konyha", label: "Konyha", icon: "🍳" },
  { type: "nappali", label: "Nappali", icon: "🛋️" },
  { type: "fürdőszoba", label: "Fürdőszoba", icon: "🚿" },
  { type: "wc", label: "WC", icon: "🚽" },
  { type: "hálószoba", label: "Hálószoba", icon: "🛏️" },
  { type: "gyerekszoba", label: "Gyerekszoba", icon: "🧸" },
  { type: "előszoba", label: "Előszoba", icon: "🚪" },
  { type: "kamra", label: "Kamra", icon: "📦" },
  { type: "mosókonyha", label: "Mosókonyha", icon: "🧺" },
  { type: "terasz", label: "Terasz", icon: "🌿" },
  { type: "udvar", label: "Udvar", icon: "🌳" },
];

const TASK_LIBRARY: TaskTemplate[] = [
  { roomType: "konyha", name: "Mosogatógép indítása / kiürítése", baseFrequency: "heti", taskType: "konyhai", estimatedMinutes: 4, basePriority: "magas", flowType: "start", scaleByPeople: true },
  { roomType: "konyha", name: "Konyhapult letörlése", baseFrequency: "napi", taskType: "felület", estimatedMinutes: 2, basePriority: "magas", flowType: "normal" },
  { roomType: "konyha", name: "Mosogató áttörlése", baseFrequency: "napi", taskType: "konyhai", estimatedMinutes: 2, basePriority: "magas", flowType: "normal" },
  { roomType: "konyha", name: "Hűtő gyors átnézése", baseFrequency: "heti", taskType: "felület", estimatedMinutes: 5, basePriority: "közepes", flowType: "normal", scaleByPeople: true },
  { roomType: "konyha", name: "Porszívózás / felmosás", baseFrequency: "heti", taskType: "vizes", estimatedMinutes: 12, basePriority: "közepes", flowType: "finish" },

  { roomType: "nappali", name: "Gyors rendrakás", baseFrequency: "napi", taskType: "rendrakás", estimatedMinutes: 5, basePriority: "magas", flowType: "normal", scaleByPeople: true },
  { roomType: "nappali", name: "Párnák és plédek rendezése", baseFrequency: "napi", taskType: "rendrakás", estimatedMinutes: 2, basePriority: "közepes", flowType: "normal" },
  { roomType: "nappali", name: "Portörlés", baseFrequency: "heti", taskType: "portörlés", estimatedMinutes: 6, basePriority: "közepes", flowType: "normal" },
  { roomType: "nappali", name: "Porszívózás", baseFrequency: "heti", taskType: "padló", estimatedMinutes: 10, basePriority: "közepes", flowType: "finish", scaleByPeople: true },

  { roomType: "fürdőszoba", name: "Mosdó áttörlése", baseFrequency: "napi", taskType: "felület", estimatedMinutes: 3, basePriority: "magas", flowType: "normal" },
  { roomType: "fürdőszoba", name: "Tükör tisztítása", baseFrequency: "heti", taskType: "portörlés", estimatedMinutes: 4, basePriority: "közepes", flowType: "normal" },
  { roomType: "fürdőszoba", name: "Felmosás", baseFrequency: "heti", taskType: "vizes", estimatedMinutes: 8, basePriority: "közepes", flowType: "finish", scaleByPeople: true },
  { roomType: "fürdőszoba", name: "Zuhany / kád áttörlése", baseFrequency: "heti", taskType: "vizes", estimatedMinutes: 8, basePriority: "közepes", flowType: "finish" },

  { roomType: "wc", name: "WC gyors tisztítása", baseFrequency: "napi", taskType: "vizes", estimatedMinutes: 3, basePriority: "magas", flowType: "finish", scaleByPeople: true },
  { roomType: "wc", name: "Kézmosó áttörlése", baseFrequency: "napi", taskType: "felület", estimatedMinutes: 2, basePriority: "közepes", flowType: "normal" },
  { roomType: "wc", name: "WC alaposabb fertőtlenítése", baseFrequency: "heti", taskType: "vizes", estimatedMinutes: 6, basePriority: "közepes", flowType: "finish" },
  { roomType: "wc", name: "Felmosás", baseFrequency: "heti", taskType: "vizes", estimatedMinutes: 4, basePriority: "közepes", flowType: "finish", scaleByPeople: true },

  { roomType: "hálószoba", name: "Ágyazás", baseFrequency: "napi", taskType: "rendrakás", estimatedMinutes: 2, basePriority: "közepes", flowType: "normal" },
  { roomType: "hálószoba", name: "Gyors rendrakás", baseFrequency: "napi", taskType: "rendrakás", estimatedMinutes: 3, basePriority: "közepes", flowType: "normal" },
  { roomType: "hálószoba", name: "Ágyneműcsere", baseFrequency: "heti", taskType: "felület", estimatedMinutes: 10, basePriority: "közepes", flowType: "normal" },
  { roomType: "hálószoba", name: "Portörlés", baseFrequency: "heti", taskType: "portörlés", estimatedMinutes: 5, basePriority: "alacsony", flowType: "normal" },

  { roomType: "gyerekszoba", name: "Játékok összeszedése", baseFrequency: "napi", taskType: "rendrakás", estimatedMinutes: 6, basePriority: "magas", flowType: "normal", scaleByPeople: true },
  { roomType: "gyerekszoba", name: "Gyors rendrakás", baseFrequency: "napi", taskType: "rendrakás", estimatedMinutes: 4, basePriority: "magas", flowType: "normal" },
  { roomType: "gyerekszoba", name: "Polcok rendezése", baseFrequency: "heti", taskType: "portörlés", estimatedMinutes: 8, basePriority: "közepes", flowType: "normal" },
  { roomType: "gyerekszoba", name: "Porszívózás", baseFrequency: "heti", taskType: "padló", estimatedMinutes: 8, basePriority: "közepes", flowType: "finish", scaleByPeople: true },

  { roomType: "előszoba", name: "Cipők rendezése", baseFrequency: "napi", taskType: "rendrakás", estimatedMinutes: 3, basePriority: "közepes", flowType: "normal" },
  { roomType: "előszoba", name: "Porszívózás", baseFrequency: "heti", taskType: "padló", estimatedMinutes: 5, basePriority: "közepes", flowType: "finish", scaleByPeople: true },

  { roomType: "kamra", name: "Polcok gyors átnézése", baseFrequency: "heti", taskType: "rendrakás", estimatedMinutes: 5, basePriority: "alacsony", flowType: "normal" },
  { roomType: "mosókonyha", name: "Mosósarok rendbetétele", baseFrequency: "heti", taskType: "rendrakás", estimatedMinutes: 6, basePriority: "közepes", flowType: "normal" },
  { roomType: "terasz", name: "Gyors lesöprés", baseFrequency: "heti", taskType: "padló", estimatedMinutes: 8, basePriority: "alacsony", flowType: "finish" },
  { roomType: "udvar", name: "Gyors rendrakás", baseFrequency: "heti", taskType: "rendrakás", estimatedMinutes: 10, basePriority: "alacsony", flowType: "normal" },
];

const PRIORITY_ORDER: Record<Priority, number> = {
  magas: 1,
  közepes: 2,
  alacsony: 3,
};

const FLOW_ORDER: Record<FlowType, number> = {
  start: 1,
  normal: 2,
  finish: 3,
};

const TASKTYPE_ORDER: Record<TaskType, number> = {
  rendrakás: 1,
  portörlés: 2,
  felület: 3,
  konyhai: 4,
  padló: 5,
  vizes: 6,
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadInitialData(): SavedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        onboardingCompleted: false,
        householdProfile: null,
        rooms: [],
        tasks: [],
        viewMode: "mai",
        includeWeeklyInToday: true,
      };
    }
    const parsed = JSON.parse(raw) as Partial<SavedData>;
    return {
      onboardingCompleted: parsed.onboardingCompleted ?? false,
      householdProfile: parsed.householdProfile ?? null,
      rooms: parsed.rooms ?? [],
      tasks: parsed.tasks ?? [],
      viewMode: parsed.viewMode ?? "mai",
      includeWeeklyInToday: parsed.includeWeeklyInToday ?? true,
    };
  } catch {
    return {
      onboardingCompleted: false,
      householdProfile: null,
      rooms: [],
      tasks: [],
      viewMode: "mai",
      includeWeeklyInToday: true,
    };
  }
}

function scaleFrequency(baseFrequency: Frequency, totalPeople: number, enabled: boolean): Frequency {
  if (!enabled) return baseFrequency;
  if (totalPeople >= 8) {
    if (baseFrequency === "heti") return "napi";
    if (baseFrequency === "havi") return "heti";
  }
  if (totalPeople >= 5 && baseFrequency === "havi") return "heti";
  return baseFrequency;
}

function scalePriority(basePriority: Priority, totalPeople: number, enabled: boolean): Priority {
  if (!enabled) return basePriority;
  if (totalPeople >= 8) {
    if (basePriority === "alacsony") return "közepes";
    if (basePriority === "közepes") return "magas";
  }
  if (totalPeople >= 5 && basePriority === "alacsony") return "közepes";
  return basePriority;
}

function effectiveFrequency(task: Task, totalPeople: number): Frequency {
  return task.manualFrequency || scaleFrequency(task.baseFrequency, totalPeople, task.scaleByPeople);
}

function effectivePriority(task: Task, totalPeople: number): Priority {
  return task.manualPriority || scalePriority(task.basePriority, totalPeople, task.scaleByPeople);
}

export default function App() {
  const initial = loadInitialData();

  const [onboardingCompleted, setOnboardingCompleted] = useState(initial.onboardingCompleted);
  const [householdProfile, setHouseholdProfile] = useState<HouseholdProfile | null>(initial.householdProfile);
  const [rooms, setRooms] = useState<Room[]>(initial.rooms);
  const [tasks, setTasks] = useState<Task[]>(initial.tasks);
  const [viewMode, setViewMode] = useState<ViewMode>(initial.viewMode);
  const [includeWeeklyInToday, setIncludeWeeklyInToday] = useState(initial.includeWeeklyInToday);

  const [adultsInput, setAdultsInput] = useState("2");
  const [childrenInput, setChildrenInput] = useState("0");
  const [weekdayMinutesInput, setWeekdayMinutesInput] = useState("20");
  const [weekendMinutesInput, setWeekendMinutesInput] = useState("60");

  const [newTaskName, setNewTaskName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(initial.rooms[0]?.id ?? "");
  const [newTaskFrequency, setNewTaskFrequency] = useState<Frequency>("napi");
  const [newTaskType, setNewTaskType] = useState<TaskType>("rendrakás");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("közepes");
  const [newTaskFlowType, setNewTaskFlowType] = useState<FlowType>("normal");
  const [newTaskMinutes, setNewTaskMinutes] = useState("5");
  const [newTaskScaleByPeople, setNewTaskScaleByPeople] = useState(false);

  useEffect(() => {
    const dataToSave: SavedData = {
      onboardingCompleted,
      householdProfile,
      rooms,
      tasks,
      viewMode,
      includeWeeklyInToday,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [onboardingCompleted, householdProfile, rooms, tasks, viewMode, includeWeeklyInToday]);

  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const totalPeople = householdProfile?.totalPeople ?? 1;

  const todayTasks = useMemo(() => {
    const eligible = tasks.filter((task) => {
      const freq = effectiveFrequency(task, totalPeople);
      if (freq === "napi") return true;
      if (freq === "heti") return includeWeeklyInToday;
      return false;
    });

    const sorted = [...eligible].sort((a, b) => {
      const p = PRIORITY_ORDER[effectivePriority(a, totalPeople)] - PRIORITY_ORDER[effectivePriority(b, totalPeople)];
      if (p !== 0) return p;
      const f = FLOW_ORDER[a.flowType] - FLOW_ORDER[b.flowType];
      if (f !== 0) return f;
      const t = TASKTYPE_ORDER[a.taskType] - TASKTYPE_ORDER[b.taskType];
      if (t !== 0) return t;
      return a.roomName.localeCompare(b.roomName);
    });

    const selected: Task[] = [];
    let used = 0;
    const maxMinutes = householdProfile?.weekdayMinutes ?? 20;

    for (const task of sorted) {
      if (used + task.estimatedMinutes <= maxMinutes || selected.length === 0) {
        selected.push(task);
        used += task.estimatedMinutes;
      }
    }

    return selected;
  }, [tasks, includeWeeklyInToday, householdProfile, totalPeople]);

  const totalTodayMinutes = todayTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);

  function addRoom(type: RoomType) {
    const label = ROOM_LIBRARY.find((room) => room.type === type)?.label || type;
    const count = rooms.filter((room) => room.type === type).length + 1;
    const name = count === 1 ? label : `${label} ${count}`;
    setRooms((prev) => [...prev, { id: uid(), type, name, sizeM2: null }]);
  }

  function removeRoom(id: string) {
    setRooms((prev) => prev.filter((room) => room.id !== id));
    setTasks((prev) => prev.filter((task) => task.roomId !== id));
  }

  function createInitialPlan() {
    const adults = Number(adultsInput);
    const children = Number(childrenInput);
    const weekdayMinutes = Number(weekdayMinutesInput);
    const weekendMinutes = Number(weekendMinutesInput);

    if (rooms.length === 0) {
      alert("Adj hozzá legalább egy helyiséget.");
      return;
    }

    const profile: HouseholdProfile = {
      adults,
      children,
      totalPeople: adults + children,
      weekdayMinutes,
      weekendMinutes,
    };

    const generated: Task[] = [];
    rooms.forEach((room) => {
      const templates = TASK_LIBRARY.filter((task) => task.roomType === room.type);
      templates.forEach((template) => {
        generated.push({
          id: uid(),
          roomId: room.id,
          roomName: room.name,
          name: template.name,
          done: false,
          source: "ajánlott",
          baseFrequency: template.baseFrequency,
          manualFrequency: null,
          scaleByPeople: template.scaleByPeople ?? false,
          basePriority: template.basePriority,
          manualPriority: null,
          flowType: template.flowType,
          taskType: template.taskType,
          estimatedMinutes: template.estimatedMinutes,
        });
      });
    });

    setHouseholdProfile(profile);
    setTasks(generated);
    setOnboardingCompleted(true);
    setViewMode("mai");
    if (rooms[0]) setSelectedRoomId(rooms[0].id);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)));
  }

  function updateRoom(id: string, patch: Partial<Room>) {
    setRooms((prev) => prev.map((room) => (room.id === id ? { ...room, ...patch } : room)));
    setTasks((prev) =>
      prev.map((task) => {
        if (task.roomId !== id) return task;
        const room = rooms.find((r) => r.id === id);
        return { ...task, roomName: patch.name ?? room?.name ?? task.roomName };
      })
    );
  }

  function addCustomTask() {
    if (!selectedRoomId) return;
    const room = rooms.find((r) => r.id === selectedRoomId);
    if (!room) return;

    setTasks((prev) => [
      {
        id: uid(),
        roomId: room.id,
        roomName: room.name,
        name: newTaskName.trim() || "Új egyéni feladat",
        done: false,
        source: "egyéni",
        baseFrequency: newTaskFrequency,
        manualFrequency: null,
        scaleByPeople: newTaskScaleByPeople,
        basePriority: newTaskPriority,
        manualPriority: null,
        flowType: newTaskFlowType,
        taskType: newTaskType,
        estimatedMinutes: Number(newTaskMinutes) || 5,
      },
      ...prev,
    ]);

    setNewTaskName("");
    setNewTaskFrequency("napi");
    setNewTaskType("rendrakás");
    setNewTaskPriority("közepes");
    setNewTaskFlowType("normal");
    setNewTaskMinutes("5");
    setNewTaskScaleByPeople(false);
  }

  if (!onboardingCompleted) {
    return (
      <div className="min-h-screen bg-stone-50 p-6 text-stone-900">
        <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-stone-100 p-3 text-2xl">✨</div>
              <div>
                <h1 className="text-3xl font-semibold">PurePlan Web</h1>
                <p className="text-stone-500">Teljesebb, egyben lévő webes verzió.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 rounded-2xl border p-4">
                <span className="text-sm font-medium">Felnőttek száma</span>
                <input type="number" min="1" value={adultsInput} onChange={(e) => setAdultsInput(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-2 rounded-2xl border p-4">
                <span className="text-sm font-medium">Gyerekek száma</span>
                <input type="number" min="0" value={childrenInput} onChange={(e) => setChildrenInput(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-2 rounded-2xl border p-4">
                <span className="text-sm font-medium">Hétköznapi időkeret (perc)</span>
                <input type="number" min="5" value={weekdayMinutesInput} onChange={(e) => setWeekdayMinutesInput(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
              <label className="grid gap-2 rounded-2xl border p-4">
                <span className="text-sm font-medium">Hétvégi időkeret (perc)</span>
                <input type="number" min="10" value={weekendMinutesInput} onChange={(e) => setWeekendMinutesInput(e.target.value)} className="rounded-xl border px-3 py-2" />
              </label>
            </div>

            <div className="mt-8">
              <h2 className="mb-3 text-xl font-semibold">Helyiségek hozzáadása</h2>
              <p className="mb-4 text-sm text-stone-500">Ugyanaz a helyiségtípus többször is felvehető.</p>
              <div className="flex flex-wrap gap-3">
                {ROOM_LIBRARY.map((room) => (
                  <button key={room.type} onClick={() => addRoom(room.type)} className="flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-stone-100">
                    <span>➕</span>
                    <span>{room.icon}</span>
                    {room.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span>🏠</span>
              <h2 className="text-xl font-semibold">Kiválasztott helyiségek</h2>
            </div>
            <div className="space-y-3">
              {rooms.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-6 text-sm text-stone-500">Még nincs hozzáadott helyiség.</div>
              ) : (
                rooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between rounded-2xl border p-4">
                    <span className="font-medium">{room.name}</span>
                    <button onClick={() => removeRoom(room.id)} className="rounded-xl border p-2 hover:bg-stone-100">🗑️</button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 grid gap-3 rounded-2xl bg-stone-50 p-4 text-sm">
              <div>👥 Összesen: {Number(adultsInput) + Number(childrenInput)} fő</div>
              <div>⏱️ Hétköznap: {weekdayMinutesInput} perc</div>
              <div>⏱️ Hétvége: {weekendMinutesInput} perc</div>
            </div>

            <button onClick={createInitialPlan} disabled={rooms.length === 0} className="mt-6 w-full rounded-2xl bg-stone-900 px-4 py-3 font-medium text-white disabled:opacity-40">
              Webes terv létrehozása
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">PurePlan Web MVP</h1>
            <p className="text-stone-500">Most már benne van a lényegesebb logika is.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode("mai")} className={`rounded-2xl px-4 py-2 ${viewMode === "mai" ? "bg-stone-900 text-white" : "border bg-white"}`}>Mai lista</button>
            <button onClick={() => setViewMode("összes")} className={`rounded-2xl px-4 py-2 ${viewMode === "összes" ? "bg-stone-900 text-white" : "border bg-white"}`}>Összes feladat</button>
          </div>
        </div>

        {viewMode === "mai" && (
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-xl font-semibold">Smart Flow összegzés</h2>
              <div className="space-y-3 text-sm text-stone-600">
                <div><strong>Háztartás:</strong> {totalPeople} fő</div>
                <div><strong>Mai időkeret:</strong> {householdProfile?.weekdayMinutes ?? 0} perc</div>
                <div><strong>Kiválasztott feladatok:</strong> {todayTasks.length}</div>
                <div><strong>Összes mai idő:</strong> {totalTodayMinutes} perc</div>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeWeeklyInToday} onChange={(e) => setIncludeWeeklyInToday(e.target.checked)} />
                Heti feladatok is jelenjenek meg ma
              </label>
              <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">
                <div className="font-medium">Smart Flow sorrend</div>
                <div className="mt-2">Prioritás → Flow → Munkafázis → Időkeret</div>
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Mai feladatlista</h2>
              <div className="space-y-3">
                {todayTasks.map((task, index) => (
                  <div key={task.id} className="flex items-start justify-between gap-4 rounded-2xl border p-4">
                    <button onClick={() => updateTask(task.id, { done: !task.done })} className="flex-1 text-left">
                      <div className="flex items-center gap-2 font-medium">
                        <span>{task.done ? "✅" : "⬜"}</span>
                        <span className={task.done ? "line-through text-stone-400" : ""}>{index + 1}. {task.name}</span>
                      </div>
                      <div className="mt-2 text-sm text-stone-500">
                        {task.roomName} • {task.estimatedMinutes} perc • {effectiveFrequency(task, totalPeople)} • {effectivePriority(task, totalPeople)}
                      </div>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs">{task.flowType}</span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs">{task.taskType}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === "összes" && (
          <div className="grid gap-6">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold">Új egyéni feladat</h2>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="rounded-xl border px-3 py-2">
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
                <input value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} placeholder="Feladat neve" className="rounded-xl border px-3 py-2" />
                <select value={newTaskFrequency} onChange={(e) => setNewTaskFrequency(e.target.value as Frequency)} className="rounded-xl border px-3 py-2">
                  <option value="napi">Napi</option>
                  <option value="heti">Heti</option>
                  <option value="havi">Havi</option>
                </select>
                <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value as Priority)} className="rounded-xl border px-3 py-2">
                  <option value="magas">Magas</option>
                  <option value="közepes">Közepes</option>
                  <option value="alacsony">Alacsony</option>
                </select>
                <select value={newTaskFlowType} onChange={(e) => setNewTaskFlowType(e.target.value as FlowType)} className="rounded-xl border px-3 py-2">
                  <option value="start">Indító</option>
                  <option value="normal">Normál</option>
                  <option value="finish">Befejező</option>
                </select>
                <input type="number" min="1" value={newTaskMinutes} onChange={(e) => setNewTaskMinutes(e.target.value)} className="rounded-xl border px-3 py-2" />
              </div>
              <div className="mt-3 flex items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={newTaskScaleByPeople} onChange={(e) => setNewTaskScaleByPeople(e.target.checked)} />
                  Skálázódjon személyszámhoz
                </label>
              </div>
              <button onClick={addCustomTask} className="mt-4 rounded-2xl border bg-white px-4 py-2 text-sm font-medium">+ Egyéni feladat</button>
            </div>

            {rooms.map((room) => {
              const roomTasks = tasks.filter((task) => task.roomId === room.id);
              return (
                <div key={room.id} className="rounded-3xl border bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold">{room.name}</h2>
                      <input type="number" min="1" placeholder="m²" value={room.sizeM2 ?? ""} onChange={(e) => updateRoom(room.id, { sizeM2: e.target.value === "" ? null : Number(e.target.value) })} className="w-24 rounded-xl border px-3 py-2 text-sm" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {roomTasks.map((task) => (
                      <div key={task.id} className="rounded-2xl border p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <input value={task.name} onChange={(e) => updateTask(task.id, { name: e.target.value })} className="w-full rounded-xl border px-3 py-2 font-medium" />
                          <button onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))} className="rounded-xl border p-2">🗑️</button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-5">
                          <label className="grid gap-1 text-sm">
                            <span>Gyakoriság</span>
                            <select value={task.manualFrequency || "auto"} onChange={(e) => updateTask(task.id, { manualFrequency: e.target.value === "auto" ? null : (e.target.value as Frequency) })} className="rounded-xl border px-3 py-2">
                              <option value="auto">Automatikus</option>
                              <option value="napi">Napi</option>
                              <option value="heti">Heti</option>
                              <option value="havi">Havi</option>
                            </select>
                          </label>

                          <label className="grid gap-1 text-sm">
                            <span>Prioritás</span>
                            <select value={task.manualPriority || "auto"} onChange={(e) => updateTask(task.id, { manualPriority: e.target.value === "auto" ? null : (e.target.value as Priority) })} className="rounded-xl border px-3 py-2">
                              <option value="auto">Automatikus</option>
                              <option value="magas">Magas</option>
                              <option value="közepes">Közepes</option>
                              <option value="alacsony">Alacsony</option>
                            </select>
                          </label>

                          <label className="grid gap-1 text-sm">
                            <span>Flow</span>
                            <select value={task.flowType} onChange={(e) => updateTask(task.id, { flowType: e.target.value as FlowType })} className="rounded-xl border px-3 py-2">
                              <option value="start">Indító</option>
                              <option value="normal">Normál</option>
                              <option value="finish">Befejező</option>
                            </select>
                          </label>

                          <label className="grid gap-1 text-sm">
                            <span>Típus</span>
                            <select value={task.taskType} onChange={(e) => updateTask(task.id, { taskType: e.target.value as TaskType })} className="rounded-xl border px-3 py-2">
                              <option value="rendrakás">Rendrakás</option>
                              <option value="portörlés">Portörlés</option>
                              <option value="felület">Felület</option>
                              <option value="konyhai">Konyhai</option>
                              <option value="padló">Padló</option>
                              <option value="vizes">Vizes</option>
                            </select>
                          </label>

                          <label className="grid gap-1 text-sm">
                            <span>Perc</span>
                            <input type="number" min="1" value={task.estimatedMinutes} onChange={(e) => updateTask(task.id, { estimatedMinutes: Number(e.target.value) })} className="rounded-xl border px-3 py-2" />
                          </label>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-stone-600">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={task.scaleByPeople} onChange={(e) => updateTask(task.id, { scaleByPeople: e.target.checked })} />
                            Skálázódjon személyszámhoz
                          </label>
                          <span>Aktuális gyakoriság: <strong>{effectiveFrequency(task, totalPeople)}</strong></span>
                          <span>Aktuális prioritás: <strong>{effectivePriority(task, totalPeople)}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
