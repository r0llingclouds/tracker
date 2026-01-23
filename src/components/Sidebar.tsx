import { isSameDay, startOfDay } from 'date-fns';
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
          ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100' 
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
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
        <span className="text-xs text-gray-400 dark:text-gray-500">{count}</span>
      )}
      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{shortcut}</span>
    </button>
  );
}

export function Sidebar() {
  const { 
    currentView, 
    currentProjectId,
    currentTagId, 
    setView, 
    projects,
    tags, 
    tasks 
  } = useTaskStore();

  const inboxCount = tasks.filter(t => t.projectId === null && !t.completed && !t.someday).length;
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayCount = tasks.filter(t => t.scheduledDate && isSameDay(t.scheduledDate, today) && !t.someday).length;
  const upcomingCount = tasks.filter(t => t.scheduledDate && t.scheduledDate >= todayStart && !t.someday).length;
  const somedayCount = tasks.filter(t => t.someday && !t.completed).length;

  const getProjectCount = (projectId: string) => 
    tasks.filter(t => t.projectId === projectId && !t.completed).length;

  const getTagCount = (tag: string) => 
    tasks.filter(t => t.tags.includes(tag) && !t.completed).length;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tasks</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Press any key to search</p>
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
        <NavItem
          label="Upcoming"
          shortcut="gu"
          count={upcomingCount}
          active={currentView === 'upcoming'}
          onClick={() => setView('upcoming')}
        />
        <NavItem
          label="Someday"
          shortcut="gs"
          count={somedayCount}
          active={currentView === 'someday'}
          onClick={() => setView('someday')}
        />
        
        {projects.length > 0 && (
          <div className="pt-4">
            <h2 className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
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
        
        {tags.length > 0 && (
          <div className="pt-4">
            <h2 className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Tags
            </h2>
            {tags.map(tag => (
              <NavItem
                key={tag}
                label={`#${tag}`}
                shortcut=""
                count={getTagCount(tag)}
                active={currentView === 'tag' && currentTagId === tag}
                onClick={() => setView('tag', null, tag)}
              />
            ))}
          </div>
        )}
      </nav>
      
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
          <div><kbd className="font-mono">space+n</kbd> new task</div>
          <div><kbd className="font-mono">space</kbd> task actions</div>
          <div><kbd className="font-mono">⌘k</kbd> command palette</div>
          <div><kbd className="font-mono">⌘⇧L</kbd> toggle dark mode</div>
        </div>
      </div>
    </aside>
  );
}
