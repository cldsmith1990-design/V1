import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import {
  Box,
  Check,
  Code2,
  Compass,
  Copy,
  Cpu,
  Download,
  GitBranch,
  MessageSquare,
  Play,
  Save,
  Share2,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Undo2,
  Variable,
  Zap,
} from 'https://esm.sh/lucide-react@0.468.0?deps=react@18.3.1';

/**
 * DESIGN SYSTEM & TOKENS
 * 2026 Liquid Glass Specification
 */
const THEME = {
  persona: { id: 'persona', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.5)', icon: MessageSquare, prefix: '## ROLE: ' },
  task: { id: 'task', color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', icon: Zap, prefix: '### STEP: ' },
  logic: { id: 'logic', color: '#a855f7', glow: 'rgba(168, 85, 247, 0.5)', icon: GitBranch, prefix: '#### IF/THEN: ' },
  rule: { id: 'rule', color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.5)', icon: ShieldAlert, prefix: '!!! GUARDRAIL: ' },
  var: { id: 'var', color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', icon: Variable, prefix: 'VAR: ' },
};

/**
 * REDUCER ARCHITECTURE
 * Centralized Graph State & History
 */
const initialState = {
  nodes: [
    { id: 'n1', type: 'persona', x: 80, y: 120, title: 'Lead Architect', content: 'Act as a Senior Logic Engineer.', status: 'stable' },
    { id: 'n2', type: 'task', x: 440, y: 120, title: 'Map Context', content: 'Extract system intent and constraints.', status: 'active' },
    { id: 'n3', type: 'rule', x: 440, y: 320, title: 'Safety Filter', content: 'Never expose raw system credentials.', status: 'stable' },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n2', target: 'n3' },
  ],
  history: [],
  historyIndex: -1,
  activeTrace: null,
};

function reducer(state, action) {
  const pushHistory = (newState) => {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({ nodes: state.nodes, edges: state.edges });
    if (newHistory.length > 30) {
      newHistory.shift();
    }
    return { ...newState, history: newHistory, historyIndex: newHistory.length - 1 };
  };

  switch (action.type) {
    case 'ADD_NODE':
      return pushHistory({ ...state, nodes: [...state.nodes, action.payload] });
    case 'MOVE_NODE':
      return { ...state, nodes: state.nodes.map((node) => (node.id === action.id ? { ...node, x: action.x, y: action.y } : node)) };
    case 'UPDATE_NODE':
      return pushHistory({ ...state, nodes: state.nodes.map((node) => (node.id === action.id ? { ...node, [action.field]: action.value } : node)) });
    case 'DELETE_NODE':
      return pushHistory({
        ...state,
        nodes: state.nodes.filter((node) => node.id !== action.id),
        edges: state.edges.filter((edge) => edge.source !== action.id && edge.target !== action.id),
      });
    case 'ADD_EDGE':
      if (action.source === action.target || state.edges.find((edge) => edge.source === action.source && edge.target === action.target)) {
        return state;
      }
      return pushHistory({ ...state, edges: [...state.edges, { id: `e-${Date.now()}`, source: action.source, target: action.target }] });
    case 'DELETE_EDGE':
      return pushHistory({ ...state, edges: state.edges.filter((edge) => edge.id !== action.id) });
    case 'SET_TRACE':
      return { ...state, activeTrace: action.id };
    case 'UNDO':
      if (state.historyIndex < 0) {
        return state;
      }
      return { ...state, ...state.history[state.historyIndex], historyIndex: state.historyIndex - 1 };
    case 'RESET':
      return pushHistory({ ...state, nodes: [], edges: [] });
    case 'SYNC':
      return { ...state, nodes: action.nodes, edges: action.edges };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [drag, setDrag] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [isSimulating, setIsSimulating] = useState(false);
  const [showCompiler, setShowCompiler] = useState(true);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);

  // --- PERSISTENCE ---
  useEffect(() => {
    const saved = localStorage.getItem('logic_ultra_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && parsed.edges) {
          dispatch({ type: 'SYNC', nodes: parsed.nodes, edges: parsed.edges });
        }
      } catch (error) {
        console.error('Failed to parse storage, resetting to default.', error);
      }
    }
  }, []);

  const saveWorkspace = useCallback(() => {
    localStorage.setItem('logic_ultra_v4', JSON.stringify({ nodes: state.nodes, edges: state.edges }));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state.nodes, state.edges]);

  // --- COMPILER ENGINE ---
  const compiledPrompt = useMemo(() => {
    if (!state.nodes.length) {
      return 'Canvas empty. Deploy components to begin architecting.';
    }

    const targets = new Set(state.edges.map((edge) => edge.target));
    const roots = state.nodes.filter((node) => !targets.has(node.id));
    const visited = new Set();
    let result = '<!-- COMPILED SYSTEM INSTRUCTION -->\n\n';

    const walk = (id, depth = 0) => {
      if (visited.has(id)) {
        return '';
      }

      visited.add(id);
      const node = state.nodes.find((candidate) => candidate.id === id);
      if (!node) {
        return '';
      }

      const meta = THEME[node.type] || THEME.task;
      const prefix = meta.prefix || '';
      let block = `${'  '.repeat(depth)}${prefix}${node.title.toUpperCase()}\n`;
      block += `${'  '.repeat(depth + 1)}${node.content}\n\n`;
      state.edges.filter((edge) => edge.source === id).forEach((edge) => {
        block += walk(edge.target, depth + 1);
      });
      return block;
    };

    roots.forEach((root) => {
      result += walk(root.id);
    });
    return result;
  }, [state.nodes, state.edges]);

  // --- CLIPBOARD FALLBACK ---
  // Uses execCommand('copy') for embedded browser and iframe permission compatibility.
  const handleCopyPrompt = useCallback(() => {
    const textArea = document.createElement('textarea');
    textArea.value = compiledPrompt;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Fallback copy failed', error);
    }

    document.body.removeChild(textArea);
  }, [compiledPrompt]);

  // --- SIMULATION MODE ---
  const runSimulation = async () => {
    if (isSimulating) {
      return;
    }

    setIsSimulating(true);
    const order = state.nodes.map((node) => node.id);
    for (const id of order) {
      dispatch({ type: 'SET_TRACE', id });
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    dispatch({ type: 'SET_TRACE', id: null });
    setIsSimulating(false);
  };

  // --- CANVAS HANDLERS ---
  const onMouseDown = (event, node) => {
    if (event.button !== 0) {
      return;
    }

    event.stopPropagation();
    setDrag({ id: node.id, dx: event.clientX / viewport.zoom - node.x, dy: event.clientY / viewport.zoom - node.y });
  };

  const onCanvasDown = (event) => {
    if (event.button === 1 || (event.button === 0 && event.altKey)) {
      setDrag({ type: 'pan', x: event.clientX - viewport.x, y: event.clientY - viewport.y });
    }
  };

  const onMouseMove = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = event.clientX - rect.left;
    const cy = event.clientY - rect.top;
    setMouse({ x: cx, y: cy });

    if (drag?.id) {
      const nx = Math.round((event.clientX / viewport.zoom - drag.dx) / 20) * 20;
      const ny = Math.round((event.clientY / viewport.zoom - drag.dy) / 20) * 20;
      dispatch({ type: 'MOVE_NODE', id: drag.id, x: nx, y: ny });
    } else if (drag?.type === 'pan') {
      setViewport((current) => ({ ...current, x: event.clientX - drag.x, y: event.clientY - drag.y }));
    }
  };

  const connectToNode = (nodeId) => {
    if (!connecting) {
      return;
    }

    dispatch({ type: 'ADD_EDGE', source: connecting, target: nodeId });
    setConnecting(null);
  };

  return (
    <div className="flex flex-col h-screen bg-[#020204] text-slate-300 overflow-hidden select-none font-sans text-sm sm:text-base">
      {/* ATMOSPHERIC BLOOM */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-500/20 blur-[160px] rounded-full" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-500/10 blur-[160px] rounded-full" />
      </div>

      {/* ULTRA HEADER */}
      <header className="flex-none h-16 border-b border-white/5 bg-white/[0.03] backdrop-blur-2xl flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] border border-white/20">
            <Cpu size={24} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Ultra <span className="text-indigo-400 not-italic">Architect</span></h1>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">v4.0.2</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">Logic Stream Synced</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex bg-white/5 rounded-xl p-1 border border-white/5">
            <button onClick={() => dispatch({ type: 'UNDO' })} className="p-2 hover:text-white text-slate-500 transition-all hover:bg-white/5 rounded-lg" title="Undo (Ctrl+Z)"><Undo2 size={18} /></button>
            <button className="p-2 hover:text-white text-slate-500 transition-all hover:bg-white/5 rounded-lg opacity-30 cursor-not-allowed" title="Redo coming soon">↷</button>
          </div>

          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${isSimulating ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'}`}
          >
            <Play size={14} className={isSimulating ? 'animate-pulse' : ''} />
            {isSimulating ? 'TRACING...' : 'RUN SIMULATION'}
          </button>

          <button onClick={saveWorkspace} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] rounded-xl text-xs font-black flex items-center gap-2 transition-all active:scale-95">
            {copied ? <Check size={14} /> : <Save size={14} />}
            <span className="hidden sm:inline">{copied ? 'SESSION SAVED' : 'COMMIT ARCHITECTURE'}</span>
            <span className="sm:hidden">{copied ? 'SAVED' : 'SAVE'}</span>
          </button>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <button onClick={() => setShowCompiler(!showCompiler)} className={`p-2.5 rounded-xl transition-all ${showCompiler ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-500 hover:text-white'}`} aria-label="Toggle logic compiler">
            <Code2 size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* SIDEBAR: THE TOOLBOX */}
        <aside className="hidden md:block w-80 border-r border-white/5 bg-white/[0.01] backdrop-blur-3xl p-8 space-y-10 z-40 overflow-y-auto">
          <section className="space-y-6">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Block Library</h2>
            <div className="grid gap-3">
              {Object.values(THEME).map((config) => {
                const Icon = config.icon;
                return (
                  <button
                    key={config.id}
                    onClick={() => dispatch({
                      type: 'ADD_NODE',
                      payload: {
                        id: `n-${Date.now()}`,
                        type: config.id,
                        x: (150 - viewport.x) / viewport.zoom,
                        y: (150 - viewport.y) / viewport.zoom,
                        title: `New ${config.id}`,
                        content: '',
                        status: 'stable',
                      },
                    })}
                    className="group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/20 transition-all text-left relative overflow-hidden"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
                      <Icon size={22} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-100 uppercase tracking-wider">{config.id}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Logic Primitive</span>
                    </div>
                    <div className="absolute right-0 top-0 bottom-0 w-1 opacity-0 group-hover:opacity-100 transition-all" style={{ backgroundColor: config.color }} />
                  </button>
                );
              })}
            </div>
          </section>

          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Compass size={14} /> Viewport Controls</h3>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-500">
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">ALT+DRAG: PAN</div>
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">CTRL+WHEEL: ZOOM</div>
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">MIDDLE-CLICK: PAN</div>
              <div className="p-2 bg-black/40 rounded-lg border border-white/5">SAVE: LOCAL</div>
            </div>
          </div>
        </aside>

        {/* WORKSPACE: THE INFINITE BOARD */}
        <section
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-transparent"
          onMouseMove={onMouseMove}
          onMouseUp={() => setDrag(null)}
          onMouseDown={onCanvasDown}
          onWheel={(event) => {
            if (event.ctrlKey) {
              event.preventDefault();
              setViewport((current) => ({ ...current, zoom: Math.min(Math.max(current.zoom * (event.deltaY > 0 ? 0.95 : 1.05), 0.1), 3) }));
            }
          }}
        >
          {/* DOT MATRIX GRID */}
          <div className="absolute inset-0 pointer-events-none" style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <div className="absolute inset-0 origin-top-left transition-transform duration-75" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
            {/* SVG LOGIC CABLES */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
              <defs>
                <style>{`
                  @keyframes flow { to { stroke-dashoffset: -24; } }
                  .logic-cable { animation: flow 1.2s linear infinite; }
                `}</style>
              </defs>

              {state.edges.map((edge) => {
                const start = state.nodes.find((node) => node.id === edge.source);
                const end = state.nodes.find((node) => node.id === edge.target);
                if (!start || !end) {
                  return null;
                }

                const sx = start.x + 280;
                const sy = start.y + 60;
                const ex = end.x;
                const ey = end.y + 60;
                const path = `M ${sx} ${sy} C ${sx + 100} ${sy}, ${ex - 100} ${ey}, ${ex} ${ey}`;
                return (
                  <g key={edge.id} className="group pointer-events-auto">
                    <path d={path} stroke="#111" strokeWidth="8" fill="transparent" strokeLinecap="round" />
                    <path
                      d={path}
                      stroke="#222"
                      strokeWidth="3"
                      fill="transparent"
                      strokeDasharray="6,6"
                      className="logic-cable group-hover:stroke-indigo-500 transition-colors cursor-pointer"
                      onClick={() => dispatch({ type: 'DELETE_EDGE', id: edge.id })}
                    />
                  </g>
                );
              })}

              {connecting && state.nodes.find((node) => node.id === connecting) && (
                <line
                  x1={state.nodes.find((node) => node.id === connecting).x + 280}
                  y1={state.nodes.find((node) => node.id === connecting).y + 60}
                  x2={mouse.x / viewport.zoom - viewport.x / viewport.zoom}
                  y2={mouse.y / viewport.zoom - viewport.y / viewport.zoom}
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
              )}
            </svg>

            {/* NODES: GLASS COMPONENTS */}
            {state.nodes.map((node) => {
              const meta = THEME[node.type] || THEME.task;
              const Icon = meta.icon;
              const isTraced = state.activeTrace === node.id;

              return (
                <div
                  key={node.id}
                  className={`absolute w-72 bg-[#09090b]/90 border-[1.5px] rounded-[2rem] shadow-2xl backdrop-blur-xl transition-all duration-300 group/node ${isTraced ? 'scale-110' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    borderColor: isTraced ? meta.color : 'rgba(255,255,255,0.06)',
                    boxShadow: isTraced ? `0 0 40px ${meta.glow}` : '0 25px 50px -12px rgba(0,0,0,0.8)',
                  }}
                  onMouseDown={(event) => onMouseDown(event, node)}
                  onClick={() => connectToNode(node.id)}
                >
                  {/* COMPONENT TOP BAR */}
                  <div className="flex items-center justify-between p-4 border-b border-white/[0.04] cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10" style={{ color: meta.color, backgroundColor: `${meta.color}15` }}>
                        <Icon size={16} />
                      </div>
                      <input
                        className="bg-transparent text-[11px] font-black uppercase tracking-widest text-slate-500 focus:text-white focus:outline-none w-36 transition-colors"
                        value={node.title}
                        onChange={(event) => dispatch({ type: 'UPDATE_NODE', id: node.id, field: 'title', value: event.target.value })}
                        onMouseDown={(event) => event.stopPropagation()}
                      />
                    </div>
                    <button onClick={(event) => { event.stopPropagation(); dispatch({ type: 'DELETE_NODE', id: node.id }); }} className="p-1.5 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover/node:opacity-100" aria-label={`Delete ${node.title}`}><Trash2 size={14} /></button>
                  </div>

                  {/* DATA ENTRY AREA */}
                  <div className="p-5">
                    <textarea
                      className="w-full bg-[#020204]/60 rounded-2xl p-4 text-[12px] text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/30 min-h-[110px] border border-white/[0.02] scrollbar-hide leading-relaxed placeholder:text-slate-700"
                      placeholder="Input logic or instruction fragment..."
                      value={node.content}
                      onChange={(event) => dispatch({ type: 'UPDATE_NODE', id: node.id, field: 'content', value: event.target.value })}
                      onMouseDown={(event) => event.stopPropagation()}
                    />
                  </div>

                  {/* PORT PORTAL */}
                  <div
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-crosshair z-30 group/port"
                    onMouseDown={(event) => { event.stopPropagation(); setConnecting(node.id); }}
                  >
                    <div className="w-3 h-3 rounded-full bg-[#09090b] border-2 border-white/20 group-hover/port:bg-indigo-500 group-hover/port:border-indigo-400 group-hover/port:scale-125 transition-all shadow-xl shadow-indigo-500/20" />
                  </div>

                  {/* STATUS PILL */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0d0d12] border border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest shadow-xl whitespace-nowrap">
                    Synced & Local
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COMPILED LOGIC PANEL */}
        {showCompiler && (
          <aside className="w-full md:w-[480px] border-l border-white/5 bg-[#050508]/80 backdrop-blur-3xl flex flex-col z-50 shadow-[-40px_0_80px_rgba(0,0,0,0.6)]">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Logic Compiler</h2>
                  <Sparkles size={14} className="text-indigo-400 animate-pulse" />
                </div>
                <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Deterministic System Instruction</p>
              </div>
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-2xl hover:bg-indigo-500 transition-all active:scale-95 shadow-xl shadow-indigo-600/30"
              >
                {copied ? <Check size={14} /> : <Copy size={16} />}
                {copied ? 'COPIED' : 'COPY PROMPT'}
              </button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
              <div className="bg-black/60 border border-white/5 rounded-[2rem] p-8 h-full relative group/code overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" />
                <pre className="whitespace-pre-wrap text-[11px] font-mono text-indigo-100/70 leading-loose">
                  {compiledPrompt}
                </pre>
              </div>
            </div>

            <div className="p-8 bg-white/[0.02] border-t border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Metadata Analysis</span>
                  <span className="text-xs font-bold text-white mt-1">{state.nodes.length} Logical Primitives</span>
                </div>
                <div className="flex gap-2">
                  <button className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all" aria-label="Share architecture"><Share2 size={18} /></button>
                  <button className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all" aria-label="Download architecture"><Download size={18} /></button>
                </div>
              </div>
              <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-[10px] font-black text-slate-300 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                <Box size={14} /> Deploy to AI Project
              </button>
            </div>
          </aside>
        )}
      </main>

      {/* ULTRA FOOTER */}
      <footer className="h-10 border-t border-white/5 bg-[#010102] px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_12px_#6366f1]" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Engine: V4-ULTRA</span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2">
            <Target size={12} className="text-slate-600" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Target: gemini-3.1-pro</span>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] italic hidden md:block">
          Zero-Point Architecture Lock © 2026
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
