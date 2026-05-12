import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock,
  Command as CommandIcon,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flame,
  GripVertical,
  Home,
  Lightbulb,
  ListChecks,
  NotebookPen,
  PartyPopper,
  Pencil,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  WalletCards,
  Wrench,
  HeartPulse,
  BriefcaseBusiness,
  FolderKanban,
  X,
} from "lucide-react";

/* ============================================================================
 * Constants & schema
 * ========================================================================== */

const STORAGE_KEY = "life-admin-dashboard-command-session-v2";
const LEGACY_STORAGE_KEY = "life-admin-dashboard-command-session-v1";
const SCHEMA_VERSION = 2;
const HISTORY_LIMIT = 40;
const AUTOSAVE_DEBOUNCE_MS = 250;

const PRIORITIES = ["Critical", "High", "Medium", "Low"];
const STATUS_OPTIONS = [
  "Queued",
  "In Progress",
  "Waiting on info",
  "Blocked",
  "Complete",
];

const initialTasks = [
  {
    id: "pay-bills",
    order: 1,
    title: "Pay Bills First",
    shortTitle: "Bills",
    tab: "life-admin",
    icon: "WalletCards",
    status: "Blocked: bill details needed",
    priority: "Critical",
    dueDate: "",
    lockedReason: "Groceries stay blocked until bills are reviewed.",
    summary:
      "Review due bills, identify name, amount, due date, and priority, then pay must-pay items before groceries.",
    sections: [
      "Bill name",
      "Amount owed",
      "Due date",
      "Minimum payment",
      "Payment priority",
      "Paid / not paid",
    ],
    checklist: [
      { id: "pb-1", text: "Collect bill names, balances, and due dates", done: false },
      { id: "pb-2", text: "Mark bills that must be paid before groceries", done: false },
      { id: "pb-3", text: "Pay critical bills first", done: false },
      { id: "pb-4", text: "Record payment confirmation notes", done: false },
      { id: "pb-5", text: "Calculate remaining safe grocery budget", done: false },
    ],
    notes: "",
  },
  {
    id: "build-groceries",
    order: 2,
    title: "Build Groceries List Before Buying Groceries",
    shortTitle: "Groceries",
    tab: "life-admin",
    icon: "ShoppingCart",
    status: "Waiting on bill review",
    priority: "High",
    dueDate: "",
    lockedReason: "Do not buy groceries until bill review is complete.",
    summary:
      "Build a categorized grocery list first, then buy groceries after the bill situation is reviewed.",
    sections: [
      "Must-have food",
      "Kids’ food",
      "Household essentials",
      "Low-cost filler meals",
      "Optional extras",
    ],
    checklist: [
      { id: "bg-1", text: "Confirm remaining grocery budget after bills", done: false },
      { id: "bg-2", text: "List must-have food", done: false },
      { id: "bg-3", text: "List kids’ food", done: false },
      { id: "bg-4", text: "List household essentials", done: false },
      { id: "bg-5", text: "Add low-cost filler meals", done: false },
      { id: "bg-6", text: "Separate optional extras", done: false },
    ],
    notes: "",
  },
  {
    id: "car-appointment",
    order: 3,
    title: "Make Car Appointment",
    shortTitle: "Car",
    tab: "life-admin",
    icon: "Car",
    status: "Queued",
    priority: "High",
    dueDate: "",
    lockedReason: "Schedule once bill/grocery pressure is stabilized.",
    summary:
      "Call or schedule the car appointment, identify what it is for, and save the appointment details.",
    sections: ["Appointment reason", "Shop", "Date", "Time", "Cost estimate", "Confirmation"],
    checklist: [
      { id: "ca-1", text: "Write what the appointment is for", done: false },
      { id: "ca-2", text: "Choose shop or service location", done: false },
      { id: "ca-3", text: "Call or schedule online", done: false },
      { id: "ca-4", text: "Save date, time, location, and cost estimate", done: false },
    ],
    notes: "",
  },
  {
    id: "bolt-storage",
    order: 4,
    title: "Circle Back to Bolt Storage",
    shortTitle: "Storage",
    tab: "life-admin",
    icon: "Home",
    status: "Queued",
    priority: "High",
    dueDate: "",
    lockedReason: "Clean-out plan starts after balance/deadline are confirmed.",
    summary:
      "Review what is owed, confirm deadline and next action, then build a clean-out and move-out plan after payoff.",
    sections: [
      "Balance owed",
      "Deadline",
      "Next action",
      "Remove",
      "Throw away",
      "Save",
      "Move first",
      "Helpers",
      "Vehicle / supplies",
      "Target timeline",
    ],
    checklist: [
      { id: "bs-1", text: "Confirm current Bolt Storage balance", done: false },
      { id: "bs-2", text: "Confirm deadline", done: false },
      { id: "bs-3", text: "Pay or set payment plan", done: false },
      { id: "bs-4", text: "List what needs to be removed", done: false },
      { id: "bs-5", text: "Sort save / trash / move first", done: false },
      { id: "bs-6", text: "Identify helpers, vehicle, and supplies", done: false },
      { id: "bs-7", text: "Set target move-out timeline", done: false },
    ],
    notes: "",
  },
  {
    id: "coles-birthday",
    order: 5,
    title: "Start Planning Cole’s Birthday Party",
    shortTitle: "Cole’s Birthday",
    tab: "events",
    icon: "PartyPopper",
    status: "Queued",
    priority: "Medium",
    dueDate: "",
    lockedReason: "Start with date, budget, location, and first tasks.",
    summary:
      "Start birthday planning by mapping date options, location, guests, budget, food, cake, gifts, activities, supplies, and first tasks.",
    sections: [
      "Date options",
      "Location options",
      "Guest list",
      "Budget",
      "Food",
      "Cake",
      "Gifts",
      "Activities",
      "Supplies",
      "People to invite",
      "First tasks",
    ],
    checklist: [
      { id: "cb-1", text: "Pick 2–3 possible dates", done: false },
      { id: "cb-2", text: "Pick location options", done: false },
      { id: "cb-3", text: "Draft guest list", done: false },
      { id: "cb-4", text: "Set rough budget", done: false },
      { id: "cb-5", text: "Choose food/cake direction", done: false },
      { id: "cb-6", text: "List activities and supplies", done: false },
    ],
    notes: "",
  },
  {
    id: "idea-dashboard",
    order: 6,
    title: "Create Idea Planning Custom Dashboard",
    shortTitle: "Idea Dashboard",
    tab: "dashboards",
    icon: "Lightbulb",
    status: "Queued",
    priority: "Medium",
    dueDate: "",
    lockedReason: "Build after immediate life-admin pressure is under control.",
    summary:
      "Create a dashboard for capturing rough ideas and turning them into real plans with next actions and status tracking.",
    sections: [
      "Idea title",
      "Goal",
      "Why it matters",
      "Resources needed",
      "Cost",
      "Time required",
      "Risks",
      "Next action",
      "Status",
    ],
    checklist: [
      { id: "id-1", text: "Define dashboard layout", done: false },
      { id: "id-2", text: "Create idea capture card", done: false },
      { id: "id-3", text: "Create planning fields", done: false },
      { id: "id-4", text: "Add status and next action tracking", done: false },
    ],
    notes: "",
  },
  {
    id: "work-hub-dashboard",
    order: 7,
    title: "Create Work Hub Dashboard",
    shortTitle: "Work Hub",
    tab: "dashboards",
    icon: "BriefcaseBusiness",
    status: "Queued",
    priority: "Medium",
    dueDate: "",
    lockedReason: "Use this to organize tickets, notes, follow-ups, and closures.",
    summary:
      "Create a Work Hub dashboard for IT/helpdesk tickets, priorities, follow-ups, and generated ticket notes.",
    sections: [
      "Open tickets",
      "Pending user response",
      "Pending vendor/admin action",
      "Urgent issues",
      "Closures ready to write",
      "Follow-ups",
      "Generated ticket notes",
    ],
    checklist: [
      { id: "wh-1", text: "Define ticket card structure", done: false },
      { id: "wh-2", text: "Create status lanes", done: false },
      { id: "wh-3", text: "Create generated note template area", done: false },
      { id: "wh-4", text: "Add follow-up tracking", done: false },
    ],
    notes: "",
  },
  {
    id: "custom-gpt-training",
    order: 8,
    title: "Learn How to Teach / Train a Custom GPT in ChatGPT 5.5",
    shortTitle: "Custom GPT",
    tab: "learning",
    icon: "Wrench",
    status: "Queued",
    priority: "Medium",
    dueDate: "",
    lockedReason: "Turn notes into reusable hub-training rules later.",
    summary:
      "Learn how to use instructions, files, examples, rules, and workflows to make a custom GPT follow hub rules and avoid drift.",
    sections: [
      "Instructions",
      "Files",
      "Examples",
      "Rules",
      "Repeatable workflows",
      "Hub rule obedience",
      "Formatting preferences",
      "Drift prevention",
      "Reusable notes",
    ],
    checklist: [
      { id: "cg-1", text: "Create plain-language notes", done: false },
      { id: "cg-2", text: "Define file-vs-instruction rules", done: false },
      { id: "cg-3", text: "Create examples library", done: false },
      { id: "cg-4", text: "Create drift-prevention checklist", done: false },
    ],
    notes: "",
  },
  {
    id: "va-playbook",
    order: 9,
    title: "Set Up VA Playbook / Dashboard",
    shortTitle: "VA Playbook",
    tab: "dashboards",
    icon: "ShieldCheck",
    status: "Queued",
    priority: "Medium",
    dueDate: "",
    lockedReason: "Organize claims, evidence, appointments, deadlines, and next actions.",
    summary:
      "Create a VA Playbook or dashboard for VA tasks, documents, claims, benefits, appointments, deadlines, and next actions.",
    sections: [
      "Claims",
      "Evidence",
      "Appointments",
      "Benefits",
      "Documents needed",
      "Open questions",
      "Next actions",
      "Deadlines",
    ],
    checklist: [
      { id: "va-1", text: "Create claims section", done: false },
      { id: "va-2", text: "Create evidence/document tracker", done: false },
      { id: "va-3", text: "Create appointment/deadline tracker", done: false },
      { id: "va-4", text: "Create open questions and next actions list", done: false },
    ],
    notes: "",
  },
  {
    id: "mental-health-dashboard",
    order: 10,
    title: "Create Mental Health Dashboard",
    shortTitle: "Mental Health",
    tab: "dashboards",
    icon: "HeartPulse",
    status: "Queued",
    priority: "Medium",
    dueDate: "",
    lockedReason: "Keep it practical and lightweight.",
    summary:
      "Create a practical stability dashboard for stress, sleep, food, routines, overload, warning signs, grounding, support, and next small step.",
    sections: [
      "Current status",
      "Stress level",
      "Sleep",
      "Food",
      "Medication / health routines if applicable",
      "Overwhelm level",
      "Warning signs",
      "Grounding actions",
      "Support contacts",
      "Next small step",
    ],
    checklist: [
      { id: "mh-1", text: "Create daily status card", done: false },
      { id: "mh-2", text: "Create overload check", done: false },
      { id: "mh-3", text: "Create grounding actions panel", done: false },
      { id: "mh-4", text: "Create next small step field", done: false },
    ],
    notes: "",
  },
  {
    id: "event-tab-life-hub",
    order: 11,
    title: "Add Event Tab to Life Hub Dashboard",
    shortTitle: "Event Tab",
    tab: "events",
    icon: "CalendarDays",
    status: "Queued",
    priority: "Medium",
    dueDate: "",
    lockedReason: "Use for birthdays, BBQs, school events, family events, and special events.",
    summary:
      "Add an Event tab to the Life Hub Dashboard for planning birthdays, BBQs, parties, school events, family events, and special events.",
    sections: [
      "Event name",
      "Date",
      "Location",
      "Budget",
      "Guest list",
      "Food",
      "Supplies",
      "Tasks",
      "Deadlines",
      "Reminders",
      "Who is helping",
      "Status",
    ],
    checklist: [
      { id: "et-1", text: "Define reusable event card", done: false },
      { id: "et-2", text: "Create event planning fields", done: false },
      { id: "et-3", text: "Create task/deadline/reminder fields", done: false },
      { id: "et-4", text: "Create status tracker", done: false },
    ],
    notes: "",
  },
];

const iconMap = {
  WalletCards,
  ShoppingCart,
  Car,
  Home,
  PartyPopper,
  Lightbulb,
  BriefcaseBusiness,
  Wrench,
  ShieldCheck,
  HeartPulse,
  CalendarDays,
  FolderKanban,
  ClipboardList,
};
const iconNames = Object.keys(iconMap);

const tabs = [
  { id: "command", label: "Command Center", icon: FolderKanban },
  { id: "life-admin", label: "Life Admin", icon: ClipboardList },
  { id: "dashboards", label: "Dashboards", icon: Lightbulb },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "learning", label: "Learning", icon: Wrench },
  { id: "notes", label: "Notes + Export", icon: NotebookPen },
];

const priorityClass = {
  Critical: "border-red-400/40 bg-red-500/10 text-red-100",
  High: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  Medium: "border-sky-400/40 bg-sky-500/10 text-sky-100",
  Low: "border-slate-400/40 bg-slate-500/10 text-slate-100",
};

const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/* ============================================================================
 * Pure helpers
 * ========================================================================== */

const cx = (...classes) => classes.filter(Boolean).join(" ");

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
  `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isComplete = (task) =>
  task.checklist.length > 0 && task.checklist.every((item) => item.done);

const isBlocked = (task) => {
  const s = (task.status || "").toLowerCase();
  return s.includes("block") || s.includes("wait");
};

const progressFor = (task) => {
  if (!task.checklist.length) return 0;
  const done = task.checklist.filter((item) => item.done).length;
  return Math.round((done / task.checklist.length) * 100);
};

const dueState = (task) => {
  if (!task.dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return null;
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86_400_000);
  if (diff < 0) return { kind: "overdue", days: Math.abs(diff) };
  if (diff === 0) return { kind: "today", days: 0 };
  if (diff <= 3) return { kind: "soon", days: diff };
  return { kind: "future", days: diff };
};

const formatDateTime = (d = new Date()) =>
  d.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const statusCounts = (tasks) => {
  const complete = tasks.filter(isComplete).length;
  const blocked = tasks.filter(isBlocked).length;
  const critical = tasks.filter((t) => t.priority === "Critical").length;
  const overdue = tasks.filter((t) => dueState(t)?.kind === "overdue").length;
  return { total: tasks.length, complete, blocked, critical, overdue };
};

const normalizeOrders = (taskList) =>
  taskList.map((task, index) => ({ ...task, order: index + 1 }));

const sortByOrder = (a, b) => a.order - b.order;

/* ============================================================================
 * Markdown / JSON export
 * ========================================================================== */

function buildMarkdown(tasks, savedNotes, globalNotes) {
  const sorted = [...tasks].sort(sortByOrder);
  const lines = [];
  lines.push("# Life Admin + Dashboard Build Command Session");
  lines.push("");
  lines.push(`Exported: ${formatDateTime()}`);
  lines.push("");
  const c = statusCounts(tasks);
  lines.push(
    `Snapshot: ${c.complete}/${c.total} complete · ${c.blocked} blocked · ${c.critical} critical · ${c.overdue} overdue`
  );
  lines.push("");
  lines.push("## Current Priority Order");
  lines.push("");
  sorted.forEach((task, index) => {
    const due = task.dueDate ? ` — due ${task.dueDate}` : "";
    lines.push(`${index + 1}. ${task.title} — ${task.status} — ${task.priority}${due}`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");

  sorted.forEach((task, index) => {
    lines.push(`## ${index + 1}. ${task.title}`);
    lines.push("");
    lines.push(`- Priority: ${task.priority}`);
    lines.push(`- Status: ${task.status}`);
    if (task.dueDate) lines.push(`- Due: ${task.dueDate}`);
    lines.push(`- Progress: ${progressFor(task)}%`);
    lines.push(`- Summary: ${task.summary}`);
    lines.push(`- Guardrail: ${task.lockedReason}`);
    lines.push("");
    if (task.sections?.length) {
      lines.push("### Sections");
      task.sections.forEach((section) => lines.push(`- ${section}`));
      lines.push("");
    }
    lines.push("### Checklist");
    task.checklist.forEach((item) =>
      lines.push(`- [${item.done ? "x" : " "}] ${item.text}`)
    );
    lines.push("");
    lines.push("### Task Notes");
    lines.push(task.notes?.trim() ? task.notes.trim() : "No task notes yet.");
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  lines.push("## Global Notes");
  lines.push("");
  lines.push(globalNotes?.trim() ? globalNotes.trim() : "No global notes yet.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Saved Notes");
  lines.push("");
  if (!savedNotes.length) {
    lines.push("No saved notes yet.");
  } else {
    savedNotes.forEach((note, index) => {
      lines.push(`### ${index + 1}. ${note.title || "Untitled Note"}`);
      lines.push("");
      lines.push(`- Category: ${note.category}`);
      lines.push(`- Created: ${note.createdAt}`);
      lines.push("");
      lines.push(note.body?.trim() || "No note body.");
      lines.push("");
    });
  }
  return lines.join("\n");
}

function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function downloadMarkdown(tasks, savedNotes, globalNotes) {
  triggerDownload(
    "life-admin-command-session.md",
    buildMarkdown(tasks, savedNotes, globalNotes),
    "text/markdown;charset=utf-8"
  );
}

function downloadJSON(state) {
  triggerDownload(
    "life-admin-command-session.json",
    JSON.stringify({ schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), state }, null, 2),
    "application/json;charset=utf-8"
  );
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================================
 * Persistence + migration
 * ========================================================================== */

const defaultPrefs = {
  activeTab: "command",
  activeTaskId: "pay-bills",
  globalNotes: "",
  noteDraft: { title: "", category: "General", body: "" },
  savedNotes: [],
  focusMode: true,
  sortMode: "manual", // manual | priority | progress | due
  filters: { priority: "All", status: "All", search: "" },
};

function loadInitialState() {
  const fallback = { tasks: initialTasks, ...defaultPrefs };
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const tasks =
      Array.isArray(parsed.tasks) && parsed.tasks.length
        ? parsed.tasks.map((t) => ({ dueDate: "", ...t }))
        : initialTasks;
    return { ...fallback, ...parsed, tasks };
  } catch {
    return fallback;
  }
}

/* ============================================================================
 * Reducer with history (undo/redo)
 * ========================================================================== */

const MUTATING_TYPES = new Set([
  "UPDATE_TASK",
  "TOGGLE_CHECK",
  "ADD_CHECK",
  "REMOVE_CHECK",
  "RENAME_CHECK",
  "ADD_TASK",
  "DELETE_TASK",
  "MOVE_TASK",
  "REORDER_TASK",
  "SET_TASKS",
  "RESET",
  "BULK_COMPLETE",
  "ADD_NOTE",
  "DELETE_NOTE",
  "SET_GLOBAL_NOTES",
  "IMPORT",
]);

function pushHistory(history, snapshot) {
  const next = [...history.past, snapshot];
  if (next.length > HISTORY_LIMIT) next.shift();
  return { past: next, future: [] };
}

function snapshotOf(s) {
  return {
    tasks: s.tasks,
    globalNotes: s.globalNotes,
    savedNotes: s.savedNotes,
    noteDraft: s.noteDraft,
  };
}

function reducer(state, action) {
  if (MUTATING_TYPES.has(action.type)) {
    state = {
      ...state,
      history: pushHistory(state.history, snapshotOf(state)),
    };
  }

  switch (action.type) {
    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_ACTIVE_TASK":
      return { ...state, activeTaskId: action.id };
    case "SET_FOCUS_MODE":
      return { ...state, focusMode: action.value };
    case "SET_SORT_MODE":
      return { ...state, sortMode: action.value };
    case "SET_FILTERS":
      return { ...state, filters: { ...state.filters, ...action.value } };
    case "SET_NOTE_DRAFT":
      return { ...state, noteDraft: action.value };

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch } : t
        ),
      };

    case "TOGGLE_CHECK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                checklist: t.checklist.map((c) =>
                  c.id === action.checkId ? { ...c, done: !c.done } : c
                ),
              }
            : t
        ),
      };

    case "ADD_CHECK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                checklist: [
                  ...t.checklist,
                  { id: uid(), text: action.text, done: false },
                ],
              }
            : t
        ),
      };

    case "REMOVE_CHECK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, checklist: t.checklist.filter((c) => c.id !== action.checkId) }
            : t
        ),
      };

    case "RENAME_CHECK":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? {
                ...t,
                checklist: t.checklist.map((c) =>
                  c.id === action.checkId ? { ...c, text: action.text } : c
                ),
              }
            : t
        ),
      };

    case "BULK_COMPLETE":
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? { ...t, checklist: t.checklist.map((c) => ({ ...c, done: true })) }
            : t
        ),
      };

    case "ADD_TASK": {
      const next = [...state.tasks, action.task].map((t, i) => ({
        ...t,
        order: i + 1,
      }));
      return { ...state, tasks: next, activeTaskId: action.task.id };
    }

    case "DELETE_TASK": {
      const next = normalizeOrders(state.tasks.filter((t) => t.id !== action.id));
      const activeTaskId =
        state.activeTaskId === action.id
          ? next[0]?.id || null
          : state.activeTaskId;
      return { ...state, tasks: next, activeTaskId };
    }

    case "MOVE_TASK": {
      const ordered = [...state.tasks].sort(sortByOrder);
      const i = ordered.findIndex((t) => t.id === action.id);
      const target = i + action.direction;
      if (i < 0 || target < 0 || target >= ordered.length) return state;
      const copy = [...ordered];
      const [item] = copy.splice(i, 1);
      copy.splice(target, 0, item);
      return { ...state, tasks: normalizeOrders(copy) };
    }

    case "REORDER_TASK": {
      const ordered = [...state.tasks].sort(sortByOrder);
      const from = ordered.findIndex((t) => t.id === action.draggedId);
      const to = ordered.findIndex((t) => t.id === action.targetId);
      if (from < 0 || to < 0 || from === to) return state;
      const copy = [...ordered];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return {
        ...state,
        tasks: normalizeOrders(copy),
        activeTaskId: action.draggedId,
      };
    }

    case "ADD_NOTE":
      return { ...state, savedNotes: [action.note, ...state.savedNotes] };

    case "DELETE_NOTE":
      return {
        ...state,
        savedNotes: state.savedNotes.filter((n) => n.id !== action.id),
      };

    case "SET_GLOBAL_NOTES":
      return { ...state, globalNotes: action.value };

    case "IMPORT":
      return { ...state, ...action.value };

    case "RESET":
      return {
        ...loadInitialDefaults(),
        history: state.history,
      };

    case "UNDO": {
      const prev = state.history.past[state.history.past.length - 1];
      if (!prev) return state;
      const future = [snapshotOf(state), ...state.history.future];
      return {
        ...state,
        ...prev,
        history: { past: state.history.past.slice(0, -1), future },
      };
    }

    case "REDO": {
      const next = state.history.future[0];
      if (!next) return state;
      const past = [...state.history.past, snapshotOf(state)];
      return {
        ...state,
        ...next,
        history: { past, future: state.history.future.slice(1) },
      };
    }

    default:
      return state;
  }
}

function loadInitialDefaults() {
  return {
    tasks: initialTasks,
    ...defaultPrefs,
  };
}

function init() {
  return {
    ...loadInitialState(),
    history: { past: [], future: [] },
  };
}

/* ============================================================================
 * Toast (lightweight)
 * ========================================================================== */

const ToastContext = React.createContext(() => {});
const useToast = () => React.useContext(ToastContext);

function ToastHost({ toasts, dismiss }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={cx(
              "pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur",
              t.tone === "success" &&
                "border-emerald-400/30 bg-emerald-500/15 text-emerald-50",
              t.tone === "error" &&
                "border-red-400/30 bg-red-500/15 text-red-50",
              (!t.tone || t.tone === "info") &&
                "border-white/15 bg-slate-900/85 text-slate-100"
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded-lg p-0.5 text-slate-300 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function useToastHost() {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback(
    (id) => setToasts((s) => s.filter((t) => t.id !== id)),
    []
  );
  const push = useCallback((message, opts = {}) => {
    const id = uid();
    setToasts((s) => [...s, { id, message, tone: opts.tone || "info" }]);
    window.setTimeout(() => {
      setToasts((s) => s.filter((t) => t.id !== id));
    }, opts.duration ?? 2400);
  }, []);
  return { toasts, dismiss, push };
}

/* ============================================================================
 * UI primitives
 * ========================================================================== */

function TaskIcon({ task, className = "h-5 w-5" }) {
  const Icon = iconMap[task?.icon] || ClipboardList;
  return <Icon className={className} aria-hidden="true" />;
}

const Pill = React.memo(function Pill({ children, className = "", as: As = "span", ...rest }) {
  return (
    <As
      {...rest}
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        className
      )}
    >
      {children}
    </As>
  );
});

function StatCard({ label, value, helper, icon: Icon, tone }) {
  return (
    <div
      className={cx(
        "rounded-2xl border p-4 shadow-xl shadow-black/10 backdrop-blur",
        tone === "danger"
          ? "border-red-400/30 bg-red-500/10"
          : tone === "warn"
            ? "border-amber-400/30 bg-amber-500/10"
            : tone === "good"
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-white/10 bg-white/[0.06]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300/80">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-white tabular-nums">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-slate-100">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-300/80">{helper}</p>
    </div>
  );
}

function ProgressBar({ value, label }) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-800"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label || "Progress"}
    >
      <div
        className={cx(
          "h-full rounded-full transition-all duration-300",
          value === 100 ? "bg-emerald-400/90" : "bg-white/80"
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function DueChip({ task }) {
  const due = dueState(task);
  if (!due) return null;
  const map = {
    overdue: { cls: "border-red-400/40 bg-red-500/15 text-red-100", label: `${due.days}d overdue` },
    today: { cls: "border-amber-400/40 bg-amber-500/15 text-amber-100", label: "Due today" },
    soon: { cls: "border-amber-400/30 bg-amber-500/10 text-amber-100", label: `Due in ${due.days}d` },
    future: { cls: "border-slate-400/30 bg-slate-500/10 text-slate-200", label: `Due in ${due.days}d` },
  };
  const { cls, label } = map[due.kind];
  return (
    <Pill className={cls}>
      <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
      {label}
    </Pill>
  );
}

/* ============================================================================
 * Cards / panels
 * ========================================================================== */

const TaskCard = React.memo(function TaskCard({
  task,
  index,
  active,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  dragTarget,
  draggable,
}) {
  const progress = progressFor(task);
  const complete = isComplete(task);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      draggable={draggable}
      onDragStart={(event) => onDragStart(event, task.id)}
      onDragOver={(event) => onDragOver(event, task.id)}
      onDrop={(event) => onDrop(event, task.id)}
      onDragEnd={onDragEnd}
      className={cx(
        "group relative rounded-3xl border p-4 shadow-xl shadow-black/10 transition",
        active
          ? "border-white/30 bg-white/[0.12] ring-2 ring-white/20"
          : "border-white/10 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.09]",
        dragTarget && "ring-2 ring-sky-300/60"
      )}
    >
      {complete && (
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100"
          aria-label="Complete"
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Done
        </span>
      )}
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1 cursor-grab rounded-xl p-2 text-slate-500 group-hover:bg-white/10 group-hover:text-white active:cursor-grabbing"
        >
          <GripVertical className="h-5 w-5" />
        </span>
        <button
          type="button"
          onClick={() => onSelect(task.id)}
          className="min-w-0 flex-1 text-left focus:outline-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-white/40"
          aria-pressed={active}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill className="border-white/10 bg-white/10 text-slate-200">
              #{index + 1}
            </Pill>
            <Pill className={priorityClass[task.priority]}>{task.priority}</Pill>
            <Pill className="border-slate-500/30 bg-slate-500/10 text-slate-200">
              {progress}%
            </Pill>
            <DueChip task={task} />
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="rounded-2xl bg-white/10 p-2 text-white">
              <TaskIcon task={task} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">{task.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{task.summary}</p>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress} label={`${task.title} progress`} />
            <p className="mt-2 text-xs text-slate-500">{task.status}</p>
          </div>
        </button>
        <div className="flex flex-col gap-2 opacity-70 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onMoveUp(task.id)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={`Move ${task.shortTitle} up`}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(task.id)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            aria-label={`Move ${task.shortTitle} down`}
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

function ChecklistRow({ item, onToggle, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);

  useEffect(() => setDraft(item.text), [item.text]);

  function commit() {
    const next = draft.trim();
    if (next && next !== item.text) onRename(next);
    setEditing(false);
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 hover:bg-white/[0.07]">
      <input
        type="checkbox"
        checked={item.done}
        onChange={onToggle}
        aria-label={item.text}
        className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-500 bg-slate-900"
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(item.text);
              setEditing(false);
            }
          }}
          className="flex-1 rounded-lg border border-white/15 bg-slate-950/80 px-2 py-1 text-sm text-slate-100 outline-none focus:border-white/40"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cx(
            "flex-1 text-left text-sm",
            item.done ? "text-slate-500 line-through" : "text-slate-200"
          )}
        >
          {item.text}
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-lg p-1 text-slate-500 hover:text-slate-200"
        aria-label="Rename checklist item"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-lg p-1 text-slate-500 hover:text-red-300"
        aria-label="Remove checklist item"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

function DetailPanel({ task, dispatch, push, setActiveTab }) {
  const [newCheck, setNewCheck] = useState("");
  if (!task) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-white/15 text-sm text-slate-500">
        Nothing selected.
      </div>
    );
  }
  const progress = progressFor(task);

  function addCheck(e) {
    e.preventDefault();
    const text = newCheck.trim();
    if (!text) return;
    dispatch({ type: "ADD_CHECK", taskId: task.id, text });
    setNewCheck("");
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={priorityClass[task.priority]}>{task.priority}</Pill>
            <Pill className="border-white/10 bg-white/10 text-slate-200">
              {progress}% complete
            </Pill>
            <DueChip task={task} />
          </div>
          <input
            value={task.title}
            onChange={(e) =>
              dispatch({ type: "UPDATE_TASK", id: task.id, patch: { title: e.target.value } })
            }
            className="mt-3 w-full bg-transparent text-2xl font-black tracking-tight text-white outline-none focus:border-b focus:border-white/20"
            aria-label="Task title"
          />
          <textarea
            value={task.summary}
            onChange={(e) =>
              dispatch({ type: "UPDATE_TASK", id: task.id, patch: { summary: e.target.value } })
            }
            className="mt-2 w-full resize-none bg-transparent text-sm leading-6 text-slate-300 outline-none"
            rows={2}
            aria-label="Task summary"
          />
        </div>
        <div className="rounded-3xl bg-white/10 p-4 text-white">
          <TaskIcon task={task} className="h-8 w-8" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-400">Priority</span>
          <select
            value={task.priority}
            onChange={(e) =>
              dispatch({ type: "UPDATE_TASK", id: task.id, patch: { priority: e.target.value } })
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-white outline-none focus:border-white/30"
          >
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-400">Status</span>
          <input
            value={task.status}
            onChange={(e) =>
              dispatch({ type: "UPDATE_TASK", id: task.id, patch: { status: e.target.value } })
            }
            list={`status-options-${task.id}`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-white outline-none focus:border-white/30"
          />
          <datalist id={`status-options-${task.id}`}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-400">Tab</span>
          <select
            value={task.tab}
            onChange={(e) =>
              dispatch({ type: "UPDATE_TASK", id: task.id, patch: { tab: e.target.value } })
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-white outline-none focus:border-white/30"
          >
            {tabs
              .filter((t) => t.id !== "command" && t.id !== "notes")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
          </select>
        </label>
        <label className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-slate-400">
          <span className="font-bold uppercase tracking-wider text-slate-400">Due date</span>
          <input
            type="date"
            value={task.dueDate || ""}
            onChange={(e) =>
              dispatch({ type: "UPDATE_TASK", id: task.id, patch: { dueDate: e.target.value } })
            }
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-white outline-none focus:border-white/30"
          />
        </label>
      </div>

      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-100">Guardrail</p>
            <textarea
              value={task.lockedReason}
              onChange={(e) =>
                dispatch({
                  type: "UPDATE_TASK",
                  id: task.id,
                  patch: { lockedReason: e.target.value },
                })
              }
              className="mt-1 w-full resize-none bg-transparent text-sm text-amber-100/90 outline-none"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white">Checklist</h3>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "BULK_COMPLETE", taskId: task.id });
                push("All checklist items marked done", { tone: "success" });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all done
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {task.checklist.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                onToggle={() =>
                  dispatch({ type: "TOGGLE_CHECK", taskId: task.id, checkId: item.id })
                }
                onRename={(text) =>
                  dispatch({ type: "RENAME_CHECK", taskId: task.id, checkId: item.id, text })
                }
                onRemove={() =>
                  dispatch({ type: "REMOVE_CHECK", taskId: task.id, checkId: item.id })
                }
              />
            ))}
            {!task.checklist.length && (
              <p className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-slate-500">
                No checklist items yet.
              </p>
            )}
          </div>
          <form onSubmit={addCheck} className="mt-3 flex gap-2">
            <input
              value={newCheck}
              onChange={(e) => setNewCheck(e.target.value)}
              placeholder="Add checklist item and press Enter"
              className="flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-white/30"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/15"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="font-bold text-white">Required Sections</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.sections.map((section) => (
              <Pill key={section} className="border-slate-500/30 bg-slate-800/70 text-slate-200">
                {section}
              </Pill>
            ))}
          </div>
          <div className="mt-5">
            <label className="text-sm font-bold text-white" htmlFor={`notes-${task.id}`}>
              Task Notes
            </label>
            <textarea
              id={`notes-${task.id}`}
              value={task.notes || ""}
              onChange={(event) =>
                dispatch({
                  type: "UPDATE_TASK",
                  id: task.id,
                  patch: { notes: event.target.value },
                })
              }
              placeholder="Add task-specific notes here. These will be included in the Markdown export."
              className="mt-2 min-h-[180px] w-full rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-white/30"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
          >
            <NotebookPen className="h-4 w-4" aria-hidden="true" />
            Add Export Note
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(
                `${task.title}\n\n${task.summary}\n\nChecklist:\n${task.checklist
                  .map((c) => `- [${c.done ? "x" : " "}] ${c.text}`)
                  .join("\n")}`
              );
              push(ok ? "Task copied as Markdown" : "Clipboard unavailable", {
                tone: ok ? "success" : "error",
              });
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy task
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${task.title}"? This can be undone with Ctrl+Z.`)) {
              dispatch({ type: "DELETE_TASK", id: task.id });
              push("Task deleted. Press Ctrl+Z to undo.", { tone: "info" });
            }
          }}
          className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100 hover:bg-red-500/15"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete task
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
 * Command Center tab (DnD)
 * ========================================================================== */

function CommandTab({
  visibleTasks,
  activeTask,
  dispatch,
  push,
  setActiveTab,
  sortMode,
  filters,
}) {
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = useCallback((event, id) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", id);
    } catch {
      /* noop */
    }
  }, []);

  const handleDragOver = useCallback((event, id) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback(
    (event, targetId) => {
      event.preventDefault();
      const id = draggedId || event.dataTransfer.getData("text/plain");
      setDragOverId(null);
      setDraggedId(null);
      if (!id || id === targetId) return;
      dispatch({ type: "REORDER_TASK", draggedId: id, targetId });
    },
    [draggedId, dispatch]
  );

  const draggable = sortMode === "manual" && !filters.search && filters.priority === "All" && filters.status === "All";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.15fr)]">
      <div className="space-y-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
            {draggable ? "Drag Priority Queue" : "Filtered View"}
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {draggable
              ? "Move cards into the order you want to execute next."
              : "Sorted / filtered — clear filters to drag cards."}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Drag cards or use the up/down buttons. Use{" "}
            <kbd className="rounded bg-white/10 px-1 text-[10px]">Alt</kbd>+
            <kbd className="rounded bg-white/10 px-1 text-[10px]">↑/↓</kbd> to reorder by
            keyboard. Your order saves automatically.
          </p>
        </div>
        <AnimatePresence initial={false}>
          {visibleTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              index={index}
              active={task.id === activeTask?.id}
              onSelect={(id) => dispatch({ type: "SET_ACTIVE_TASK", id })}
              onMoveUp={(id) => dispatch({ type: "MOVE_TASK", id, direction: -1 })}
              onMoveDown={(id) => dispatch({ type: "MOVE_TASK", id, direction: 1 })}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              dragTarget={dragOverId === task.id}
              draggable={draggable}
            />
          ))}
          {!visibleTasks.length && (
            <div className="rounded-3xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">
              No tasks match the current filters.
            </div>
          )}
        </AnimatePresence>
      </div>
      <DetailPanel
        task={activeTask}
        dispatch={dispatch}
        push={push}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

function FilteredTaskGrid({
  tasks,
  filter,
  activeTaskId,
  dispatch,
  push,
  setActiveTab,
}) {
  const visible = useMemo(
    () => tasks.filter((t) => t.tab === filter).sort(sortByOrder),
    [tasks, filter]
  );
  const active =
    visible.find((task) => task.id === activeTaskId) || visible[0];

  useEffect(() => {
    if (visible.length && !visible.some((task) => task.id === activeTaskId)) {
      dispatch({ type: "SET_ACTIVE_TASK", id: visible[0].id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  if (!visible.length) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-sm text-slate-500">
        No tasks in this tab yet. Use the “New Task” button to add one.
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(420px,1.2fr)]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
        {visible.map((task) => (
          <button
            type="button"
            key={task.id}
            onClick={() => dispatch({ type: "SET_ACTIVE_TASK", id: task.id })}
            className={cx(
              "rounded-3xl border p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              active?.id === task.id
                ? "border-white/30 bg-white/[0.12]"
                : "border-white/10 bg-white/[0.05] hover:bg-white/[0.08]"
            )}
            aria-pressed={active?.id === task.id}
          >
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-2 text-white">
                <TaskIcon task={task} className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate font-bold text-white">{task.shortTitle}</h3>
                <p className="text-xs text-slate-400">Priority #{task.order}</p>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={progressFor(task)} label={`${task.title} progress`} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill className={priorityClass[task.priority]}>{task.priority}</Pill>
              <DueChip task={task} />
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-slate-400">{task.summary}</p>
          </button>
        ))}
      </div>
      <DetailPanel
        task={active}
        dispatch={dispatch}
        push={push}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}

/* ============================================================================
 * Notes tab
 * ========================================================================== */

function NotesTab({
  tasks,
  savedNotes,
  globalNotes,
  noteDraft,
  dispatch,
  push,
  fileInputRef,
}) {
  const [query, setQuery] = useState("");

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savedNotes;
    return savedNotes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
    );
  }, [savedNotes, query]);

  function saveNote() {
    if (!noteDraft.title.trim() && !noteDraft.body.trim()) {
      push("Note is empty", { tone: "error" });
      return;
    }
    dispatch({
      type: "ADD_NOTE",
      note: {
        id: uid(),
        title: noteDraft.title.trim() || "Untitled Note",
        category: noteDraft.category,
        body: noteDraft.body.trim(),
        createdAt: formatDateTime(),
      },
    });
    dispatch({
      type: "SET_NOTE_DRAFT",
      value: { title: "", category: "General", body: "" },
    });
    push("Note saved", { tone: "success" });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(420px,1fr)_minmax(360px,0.9fr)]">
      <div className="space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                Notes Workspace
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                Capture notes once. Export everything into one Markdown file.
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Use this for bills, grocery info, appointment details, dashboard ideas, or
                raw thoughts you want preserved.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 text-white">
              <FileText className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_200px]">
            <input
              value={noteDraft.title}
              onChange={(e) =>
                dispatch({
                  type: "SET_NOTE_DRAFT",
                  value: { ...noteDraft, title: e.target.value },
                })
              }
              placeholder="Note title"
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/30"
            />
            <select
              value={noteDraft.category}
              onChange={(e) =>
                dispatch({
                  type: "SET_NOTE_DRAFT",
                  value: { ...noteDraft, category: e.target.value },
                })
              }
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
            >
              {[
                "General",
                "Bills",
                "Groceries",
                "Car",
                "Storage",
                "Birthday",
                "Dashboard Build",
                "VA",
                "Mental Health",
                "Work Hub",
                "Learning",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <textarea
            value={noteDraft.body}
            onChange={(e) =>
              dispatch({
                type: "SET_NOTE_DRAFT",
                value: { ...noteDraft, body: e.target.value },
              })
            }
            placeholder="Paste messy raw info here. Save it, then export everything to Markdown when ready."
            className="mt-3 min-h-[180px] w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-white/30"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveNote}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save Note
            </button>
            <button
              type="button"
              onClick={() => downloadMarkdown(tasks, savedNotes, globalNotes)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export MD
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(
                  buildMarkdown(tasks, savedNotes, globalNotes)
                );
                push(ok ? "Markdown copied to clipboard" : "Clipboard unavailable", {
                  tone: ok ? "success" : "error",
                });
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy MD
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
          <h3 className="font-black text-white">Global Session Notes</h3>
          <p className="mt-1 text-sm text-slate-400">
            This block is always included in the Markdown export.
          </p>
          <textarea
            value={globalNotes}
            onChange={(e) => dispatch({ type: "SET_GLOBAL_NOTES", value: e.target.value })}
            placeholder="Add session-wide notes here."
            className="mt-3 min-h-[170px] w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-white/30"
          />
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-black text-white">Saved Notes</h3>
          <span className="text-xs text-slate-500">{filteredNotes.length} shown</span>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 pl-9 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/30"
          />
        </div>
        <div className="mt-4 space-y-3">
          {!filteredNotes.length && (
            <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-slate-500">
              {savedNotes.length ? "No notes match this search." : "No saved notes yet."}
            </div>
          )}
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Pill className="border-slate-500/30 bg-slate-800/70 text-slate-200">
                    {note.category}
                  </Pill>
                  <h4 className="mt-2 truncate font-bold text-white">{note.title}</h4>
                  <p className="mt-1 text-xs text-slate-500">{note.createdAt}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await copyToClipboard(
                        `# ${note.title}\n\n${note.body}`
                      );
                      push(ok ? "Note copied" : "Clipboard unavailable", {
                        tone: ok ? "success" : "error",
                      });
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                    aria-label="Copy note"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "DELETE_NOTE", id: note.id })}
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-200"
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {note.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * New-task modal
 * ========================================================================== */

function NewTaskModal({ open, onClose, onCreate }) {
  const [draft, setDraft] = useState({
    title: "",
    shortTitle: "",
    tab: "life-admin",
    icon: "ClipboardList",
    priority: "Medium",
    summary: "",
  });
  const titleRef = useRef(null);

  useEffect(() => {
    if (open) {
      setDraft({
        title: "",
        shortTitle: "",
        tab: "life-admin",
        icon: "ClipboardList",
        priority: "Medium",
        summary: "",
      });
      // give the dialog a tick to mount
      window.setTimeout(() => titleRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    onCreate({
      id: uid(),
      order: 9999,
      title: draft.title.trim(),
      shortTitle: draft.shortTitle.trim() || draft.title.trim().slice(0, 18),
      tab: draft.tab,
      icon: draft.icon,
      status: "Queued",
      priority: draft.priority,
      dueDate: "",
      lockedReason: "",
      summary: draft.summary.trim(),
      sections: [],
      checklist: [],
      notes: "",
    });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New task"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Add a new task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1 text-slate-400 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Title
            <input
              ref={titleRef}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Short title
            <input
              value={draft.shortTitle}
              onChange={(e) => setDraft({ ...draft, shortTitle: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tab
              <select
                value={draft.tab}
                onChange={(e) => setDraft({ ...draft, tab: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                {tabs
                  .filter((t) => t.id !== "command" && t.id !== "notes")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Icon
              <select
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                {iconNames.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Priority
              <select
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Summary
            <textarea
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create task
          </button>
        </div>
      </form>
    </div>
  );
}

/* ============================================================================
 * Command palette (Cmd/Ctrl+K)
 * ========================================================================== */

function CommandPalette({ open, onClose, tasks, dispatch, setActiveTab }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ("");
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return tasks.slice().sort(sortByOrder).slice(0, 8);
    return tasks
      .filter(
        (x) =>
          x.title.toLowerCase().includes(t) ||
          x.shortTitle.toLowerCase().includes(t) ||
          x.summary.toLowerCase().includes(t)
      )
      .slice(0, 10);
  }, [q, tasks]);

  if (!open) return null;

  function pick(task) {
    dispatch({ type: "SET_ACTIVE_TASK", id: task.id });
    setActiveTab(task.tab === "command" ? "command" : task.tab);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 pt-24 backdrop-blur"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-white/10 p-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to task…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results[0]) pick(results[0]);
            }}
          />
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">Esc</kbd>
        </div>
        <ul className="max-h-80 overflow-auto p-2">
          {results.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => pick(task)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/10"
              >
                <div className="rounded-lg bg-white/10 p-1.5 text-white">
                  <TaskIcon task={task} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{task.title}</p>
                  <p className="truncate text-xs text-slate-400">
                    {task.priority} · {task.status}
                  </p>
                </div>
                <Pill className="border-white/10 bg-white/5 text-slate-300">#{task.order}</Pill>
              </button>
            </li>
          ))}
          {!results.length && (
            <li className="px-3 py-6 text-center text-sm text-slate-500">No matches.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================================
 * Toolbar (filters / sort / search)
 * ========================================================================== */

function Toolbar({ filters, sortMode, dispatch }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={filters.search}
            onChange={(e) =>
              dispatch({ type: "SET_FILTERS", value: { search: e.target.value } })
            }
            placeholder="Search tasks, notes, summaries…"
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 pl-9 text-sm text-white outline-none placeholder:text-slate-600 focus:border-white/30"
            aria-label="Search tasks"
          />
        </div>
        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" /> Priority
          <select
            value={filters.priority}
            onChange={(e) =>
              dispatch({ type: "SET_FILTERS", value: { priority: e.target.value } })
            }
            className="bg-transparent text-xs font-bold text-white outline-none"
          >
            {["All", ...PRIORITIES].map((p) => (
              <option key={p} className="bg-slate-900">
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" /> Status
          <select
            value={filters.status}
            onChange={(e) =>
              dispatch({ type: "SET_FILTERS", value: { status: e.target.value } })
            }
            className="bg-transparent text-xs font-bold text-white outline-none"
          >
            {["All", "Open", "Blocked", "Complete"].map((s) => (
              <option key={s} className="bg-slate-900">
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Sort
          <select
            value={sortMode}
            onChange={(e) =>
              dispatch({ type: "SET_SORT_MODE", value: e.target.value })
            }
            className="bg-transparent text-xs font-bold text-white outline-none"
          >
            <option value="manual" className="bg-slate-900">Manual</option>
            <option value="priority" className="bg-slate-900">Priority</option>
            <option value="progress" className="bg-slate-900">Least progress</option>
            <option value="due" className="bg-slate-900">Due date</option>
          </select>
        </label>
        {(filters.search || filters.priority !== "All" || filters.status !== "All" || sortMode !== "manual") && (
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "SET_FILTERS", value: { search: "", priority: "All", status: "All" } });
              dispatch({ type: "SET_SORT_MODE", value: "manual" });
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * Error boundary
 * ========================================================================== */

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Dashboard error", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="m-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-6 text-red-100">
          <h2 className="text-lg font-black">Something went wrong</h2>
          <p className="mt-2 text-sm">{String(this.state.error?.message || this.state.error)}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-black text-slate-950"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================================
 * Hooks
 * ========================================================================== */

function useDebouncedEffect(callback, deps, delay) {
  useEffect(() => {
    const handle = window.setTimeout(callback, delay);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function useHotkey(combo, handler, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    function onKey(e) {
      const tag = (e.target?.tagName || "").toLowerCase();
      const editing = ["input", "textarea", "select"].includes(tag) || e.target?.isContentEditable;
      const wantsMeta = combo.includes("mod");
      const metaOk = !wantsMeta || e.metaKey || e.ctrlKey;
      const shiftOk = combo.includes("shift") ? e.shiftKey : !e.shiftKey || combo === "shift+?";
      const altOk = combo.includes("alt") ? e.altKey : true;
      const key = combo.split("+").pop();
      if (!metaOk || !altOk) return;
      if (e.key.toLowerCase() !== key) return;
      if (editing && !wantsMeta && combo !== "escape") return;
      if (combo === "shift+?" && !e.shiftKey) return;
      e.preventDefault();
      handler(e);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [combo, handler, enabled]);
}

/* ============================================================================
 * Root
 * ========================================================================== */

export default function LifeAdminDashboardCommandCenter() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const {
    tasks,
    activeTab,
    activeTaskId,
    globalNotes,
    noteDraft,
    savedNotes,
    focusMode,
    sortMode,
    filters,
    history,
  } = state;

  const { toasts, dismiss, push } = useToastHost();
  const fileInputRef = useRef(null);
  const reducedMotion = useReducedMotion();

  /* persistence (debounced) */
  useDebouncedEffect(
    () => {
      try {
        const { history: _h, ...persistable } = state;
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ schema: SCHEMA_VERSION, ...persistable })
        );
      } catch {
        /* quota errors etc. */
      }
    },
    [state],
    AUTOSAVE_DEBOUNCE_MS
  );

  /* derived */
  const sortedTasks = useMemo(() => [...tasks].sort(sortByOrder), [tasks]);
  const activeTask =
    tasks.find((t) => t.id === activeTaskId) || sortedTasks[0] || null;
  const counts = useMemo(() => statusCounts(tasks), [tasks]);
  const nextTask = useMemo(
    () => sortedTasks.find((t) => !isComplete(t)) || sortedTasks[0] || null,
    [sortedTasks]
  );
  const visibleTabs = useMemo(
    () => (focusMode ? tabs.filter((t) => t.id !== "learning") : tabs),
    [focusMode]
  );

  /* command-view filtered/sorted list */
  const filteredTasks = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (filters.priority !== "All" && t.priority !== filters.priority) return false;
      if (filters.status === "Blocked" && !isBlocked(t)) return false;
      if (filters.status === "Complete" && !isComplete(t)) return false;
      if (filters.status === "Open" && (isBlocked(t) || isComplete(t))) return false;
      if (
        q &&
        ![t.title, t.shortTitle, t.summary, t.status, t.notes]
          .filter(Boolean)
          .some((s) => s.toLowerCase().includes(q))
      )
        return false;
      return true;
    });

    if (sortMode === "priority") {
      list = list.sort(
        (a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] || a.order - b.order
      );
    } else if (sortMode === "progress") {
      list = list.sort((a, b) => progressFor(a) - progressFor(b) || a.order - b.order);
    } else if (sortMode === "due") {
      list = list.sort((a, b) => {
        const ad = a.dueDate || "9999-12-31";
        const bd = b.dueDate || "9999-12-31";
        return ad.localeCompare(bd) || a.order - b.order;
      });
    } else {
      list = list.sort(sortByOrder);
    }
    return list;
  }, [tasks, filters, sortMode]);

  /* actions */
  const setActiveTab = useCallback(
    (tab) => dispatch({ type: "SET_ACTIVE_TAB", tab }),
    []
  );
  const setFocusMode = useCallback(
    (value) => dispatch({ type: "SET_FOCUS_MODE", value }),
    []
  );

  const resetDashboard = useCallback(() => {
    if (!confirm("Reset everything? Notes and progress will be wiped.")) return;
    dispatch({ type: "RESET" });
    push("Dashboard reset", { tone: "info" });
  }, [push]);

  const handleImportFile = useCallback(
    async (file) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const incoming = parsed.state || parsed;
        if (!Array.isArray(incoming.tasks)) throw new Error("Missing tasks array");
        dispatch({
          type: "IMPORT",
          value: {
            tasks: incoming.tasks,
            savedNotes: incoming.savedNotes || [],
            globalNotes: incoming.globalNotes || "",
            noteDraft: incoming.noteDraft || defaultPrefs.noteDraft,
          },
        });
        push("Imported successfully", { tone: "success" });
      } catch (err) {
        push(`Import failed: ${err.message}`, { tone: "error" });
      }
    },
    [push]
  );

  /* command palette */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  useHotkey("mod+k", () => setPaletteOpen(true));
  useHotkey("mod+z", () => dispatch({ type: "UNDO" }));
  useHotkey("mod+shift+z", () => dispatch({ type: "REDO" }));
  useHotkey("mod+y", () => dispatch({ type: "REDO" }));
  useHotkey("mod+e", () => downloadMarkdown(tasks, savedNotes, globalNotes));
  useHotkey("mod+/", () => setFocusMode(!focusMode));
  useHotkey("n", () => setNewTaskOpen(true));
  useHotkey("escape", () => {
    setPaletteOpen(false);
    setNewTaskOpen(false);
  });

  /* Alt+↑/↓ to reorder active task */
  useEffect(() => {
    function onKey(e) {
      if (!e.altKey || !activeTask) return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        dispatch({ type: "MOVE_TASK", id: activeTask.id, direction: -1 });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        dispatch({ type: "MOVE_TASK", id: activeTask.id, direction: 1 });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTask]);

  /* Render */
  return (
    <ToastContext.Provider value={push}>
      <ErrorBoundary>
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#334155_0,#0f172a_36%,#020617_100%)] p-4 text-slate-100 md:p-6">
          <div className="mx-auto max-w-7xl">
            {/* Hero */}
            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur">
              <div className="relative p-5 md:p-8">
                {!reducedMotion && (
                  <>
                    <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-sky-400/20 blur-3xl" />
                    <div className="absolute bottom-0 left-20 h-44 w-44 rounded-full bg-violet-400/10 blur-3xl" />
                  </>
                )}
                <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Pill className="border-white/10 bg-white/10 text-slate-200">
                        Idea Hub
                      </Pill>
                      <Pill className="border-emerald-300/30 bg-emerald-400/10 text-emerald-100">
                        Autosaves locally
                      </Pill>
                      <Pill className="border-amber-300/30 bg-amber-400/10 text-amber-100">
                        Bills before groceries
                      </Pill>
                      <Pill className="border-white/10 bg-white/10 text-slate-200">
                        <CommandIcon className="mr-1 h-3 w-3" aria-hidden="true" />
                        Ctrl/⌘+K
                      </Pill>
                    </div>
                    <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
                      Life Admin + Dashboard Build Command Center
                    </h1>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300 md:text-lg">
                      A movable command dashboard for bills, groceries, car scheduling,
                      storage cleanup, birthday planning, dashboard builds, VA planning,
                      mental health tracking, and event planning.
                    </p>
                    {/* overall progress */}
                    <div className="mt-5 max-w-md">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span>Overall progress</span>
                        <span className="tabular-nums">
                          {counts.total
                            ? Math.round((counts.complete / counts.total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <ProgressBar
                        value={
                          counts.total
                            ? Math.round((counts.complete / counts.total) * 100)
                            : 0
                        }
                        label="Overall completion"
                      />
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                      Next Best Move
                    </p>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="rounded-2xl bg-white/10 p-3 text-white">
                        <TaskIcon task={nextTask} className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-black text-white">
                          {nextTask?.title || "All clear"}
                        </h2>
                        <p className="mt-1 truncate text-sm text-slate-400">
                          {nextTask?.status || "Nothing pending"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!nextTask) return;
                          dispatch({ type: "SET_ACTIVE_TASK", id: nextTask.id });
                          setActiveTab("command");
                        }}
                        disabled={!nextTask}
                        className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200 disabled:opacity-40"
                      >
                        Open Next Task
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          downloadMarkdown(tasks, savedNotes, globalNotes);
                          push("Markdown exported", { tone: "success" });
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Export MD
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Total Items"
                value={counts.total}
                helper="All ideas converted into tracked work cards."
                icon={ClipboardList}
              />
              <StatCard
                tone="good"
                label="Completed"
                value={counts.complete}
                helper="Every checklist item checked."
                icon={CheckCircle2}
              />
              <StatCard
                tone="warn"
                label="Blocked"
                value={counts.blocked}
                helper="Waiting on missing info or dependencies."
                icon={AlertTriangle}
              />
              <StatCard
                tone="danger"
                label="Critical"
                value={counts.critical}
                helper="Must be handled before normal spending."
                icon={WalletCards}
              />
              <StatCard
                tone={counts.overdue ? "danger" : undefined}
                label="Overdue"
                value={counts.overdue}
                helper="Past due-date items."
                icon={Flame}
              />
            </section>

            {/* Tabs + controls */}
            <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-3 shadow-xl shadow-black/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="tablist" aria-label="Dashboard sections" className="flex flex-wrap gap-2">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                          isActive
                            ? "bg-white text-slate-950"
                            : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTaskOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 hover:bg-slate-200"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    New Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 hover:bg-white/10"
                    aria-label="Open command palette"
                  >
                    <CommandIcon className="h-4 w-4" aria-hidden="true" />
                    Jump
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "UNDO" })}
                    disabled={!history.past.length}
                    className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label="Undo"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "REDO" })}
                    disabled={!history.future.length}
                    className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-40"
                    aria-label="Redo"
                  >
                    <Redo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocusMode(!focusMode)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                    aria-pressed={focusMode}
                  >
                    {focusMode ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                    {focusMode ? "Focus On" : "Focus Off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadJSON(state)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                    aria-label="Backup as JSON"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white"
                    aria-label="Restore from JSON"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Import
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={resetDashboard}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300 hover:bg-red-500/10 hover:text-red-100"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <Toolbar filters={filters} sortMode={sortMode} dispatch={dispatch} />
              </div>
            </section>

            {/* Content */}
            <section className="mt-5 pb-12">
              {activeTab === "command" && (
                <CommandTab
                  visibleTasks={filteredTasks}
                  activeTask={activeTask}
                  dispatch={dispatch}
                  push={push}
                  setActiveTab={setActiveTab}
                  sortMode={sortMode}
                  filters={filters}
                />
              )}
              {["life-admin", "dashboards", "events", "learning"].includes(activeTab) && (
                <FilteredTaskGrid
                  tasks={tasks}
                  filter={activeTab}
                  activeTaskId={activeTaskId}
                  dispatch={dispatch}
                  push={push}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === "notes" && (
                <NotesTab
                  tasks={tasks}
                  savedNotes={savedNotes}
                  globalNotes={globalNotes}
                  noteDraft={noteDraft}
                  dispatch={dispatch}
                  push={push}
                />
              )}
            </section>

            <footer className="pb-6 text-center text-xs text-slate-500">
              Local autosave · Press{" "}
              <kbd className="rounded bg-white/10 px-1">⌘/Ctrl+K</kbd> to jump,{" "}
              <kbd className="rounded bg-white/10 px-1">N</kbd> for new task,{" "}
              <kbd className="rounded bg-white/10 px-1">⌘/Ctrl+E</kbd> to export.
            </footer>
          </div>

          {/* Overlays */}
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            tasks={tasks}
            dispatch={dispatch}
            setActiveTab={setActiveTab}
          />
          <NewTaskModal
            open={newTaskOpen}
            onClose={() => setNewTaskOpen(false)}
            onCreate={(task) => {
              dispatch({ type: "ADD_TASK", task });
              setActiveTab(task.tab);
              push("Task created", { tone: "success" });
            }}
          />
          <ToastHost toasts={toasts} dismiss={dismiss} />
        </main>
      </ErrorBoundary>
    </ToastContext.Provider>
  );
}
