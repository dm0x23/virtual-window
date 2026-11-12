import { useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import {
  $tasks,
  $zenMode,
  addTask,
  toggleTask,
  deleteTask,
} from '../stores/appStore';
import { Check, Trash2, Plus, ListTodo, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-preact';
import { useDraggable } from '../hooks/useDraggable';

export default function TaskList() {
  const tasks = useStore($tasks);
  const zenMode = useStore($zenMode);

  const [inputVal, setInputVal] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { position, handleMouseDown, isDragging, elementRef } = useDraggable({
    storageKey: 'vw_drag_tasks',
    defaultPosition: () => ({ x: 24, y: 80 }),
  });

  const completedCount = tasks.filter((t) => t.completed).length;
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const handleAdd = (e?: Event) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;
    addTask(inputVal.trim());
    setInputVal('');
  };

  if (zenMode) return null;

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
      }}
      className={`z-40 w-80 md:w-88 rounded-[20px] bg-[#1C1D22] border border-white/10 shadow-2xl transition-shadow text-slate-100 flex flex-col max-h-[calc(100vh-180px)] select-none ${
        isDragging ? 'cursor-grabbing shadow-[0_20px_40px_rgba(0,0,0,0.6)]' : 'cursor-grab'
      } ${isCollapsed ? 'h-auto' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 select-none">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <ListTodo size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-white">Tasks</h2>
            <p className="text-[11px] text-slate-400">
              {completedCount} of {tasks.length} completed
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand' : 'Collapse'}
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Add Task Form */}
          <form onSubmit={handleAdd} className="p-3.5 border-b border-white/10 flex gap-2">
            <input
              type="text"
              id="task-input"
              name="task-input"
              value={inputVal}
              onInput={(e) => setInputVal((e.target as HTMLInputElement).value)}
              placeholder="Add a cozy focus task..."
              className="flex-1 bg-[#25272E] text-xs text-white placeholder-slate-500 px-3 py-2 rounded-[12px] border border-white/10 focus:outline-none focus:ring-1 focus:ring-amber-400/60 transition-all"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="p-2 rounded-[12px] bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-medium transition-all shadow-xs"
              title="Add task"
            >
              <Plus size={18} />
            </button>
          </form>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-1.5 text-xs text-slate-400">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-[10px] transition-all ${
                filter === 'all'
                  ? 'bg-[#2D313A] text-white font-medium shadow-xs'
                  : 'hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-2.5 py-1 rounded-[10px] transition-all ${
                filter === 'active'
                  ? 'bg-[#2D313A] text-white font-medium shadow-xs'
                  : 'hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              Active ({tasks.length - completedCount})
            </button>
            <button
              onClick={() => setFilter('done')}
              className={`px-2.5 py-1 rounded-[10px] transition-all ${
                filter === 'done'
                  ? 'bg-[#2D313A] text-white font-medium shadow-xs'
                  : 'hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              Done ({completedCount})
            </button>
          </div>

          {/* Task Items List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-[140px] max-h-[300px]">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                <CheckCircle2 size={32} className="text-emerald-400/40 mb-2" />
                <p className="text-xs font-medium text-slate-300">
                  {filter === 'done'
                    ? 'No completed tasks yet.'
                    : filter === 'active'
                    ? 'No active tasks. Free time!'
                    : 'No tasks yet. Add one above!'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Take a breath & look out the window.</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between gap-3 px-3 py-2.5 rounded-[14px] transition-all duration-200 border ${
                    task.completed
                      ? 'bg-white/5 border-transparent text-slate-500'
                      : 'bg-[#25272E] hover:bg-[#2B2E37] border-white/5 text-slate-200'
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-center justify-center w-5 h-5 rounded-[6px] border transition-all ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-xs'
                        : 'border-white/20 hover:border-amber-400 bg-black/20'
                    }`}
                    title={task.completed ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.completed && <Check size={13} strokeWidth={3} />}
                  </button>

                  <span
                    onClick={() => toggleTask(task.id)}
                    className={`flex-1 text-xs cursor-pointer select-text transition-all leading-relaxed ${
                      task.completed
                        ? 'line-through text-slate-500 italic'
                        : 'text-slate-200 font-normal'
                    }`}
                  >
                    {task.text}
                  </span>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
