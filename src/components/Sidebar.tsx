import { isSameDay } from 'date-fns';
import { useTaskStore } from '../store/taskStore';

interface NavItemProps {
  label: string;
  shortcut: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  color?: string;
}

function NavItem({ label, shortcut, count, active, onClick, color }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {color && (
        <span 
          className="w-3 h-3 rounded-full flex-shrink-0" 
          style={{ backgroundColor: color }}
        />
      )}
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-gray-400">{count}</span>
      )}
      <span className="text-xs text-gray-400 font-mono">{shortcut}</span>
    </button>
  );
}

export function Sidebar() {
  const { 
    currentView, 
    currentProjectId, 
    setView, 
    projects, 
    tasks 
  } = useTaskStore();

  const inboxCount = tasks.filter(t => t.projectId === null && !t.completed).length;
  const today = new Date();
  const todayCount = tasks.filter(t => t.scheduledDate && isSameDay(t.scheduledDate, today)).length;

  const getProjectCount = (projectId: string) => 
    tasks.filter(t => t.projectId === projectId && !t.completed).length;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
        <p className="text-xs text-gray-500 mt-1">Press any key to search</p>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavItem
          label="Inbox"
          shortcut="gi"
          count={inboxCount}
          active={currentView === 'inbox'}
          onClick={() => setView('inbox')}
        />
        <NavItem
          label="Today"
          shortcut="gt"
          count={todayCount}
          active={currentView === 'today'}
          onClick={() => setView('today')}
        />
        
        {projects.length > 0 && (
          <div className="pt-4">
            <h2 className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Projects
            </h2>
            {projects.map(project => (
              <NavItem
                key={project.id}
                label={project.name}
                shortcut=""
                count={getProjectCount(project.id)}
                active={currentView === 'project' && currentProjectId === project.id}
                onClick={() => setView('project', project.id)}
                color={project.color}
              />
            ))}
          </div>
        )}
      </nav>
      
      <div className="p-3 border-t border-gray-200">
        <div className="text-xs text-gray-400 space-y-1">
          <div><kbd className="font-mono">n</kbd> new task</div>
          <div><kbd className="font-mono">space</kbd> task actions</div>
          <div><kbd className="font-mono">⌘k</kbd> command palette</div>
        </div>
      </div>
    </aside>
  );
}
