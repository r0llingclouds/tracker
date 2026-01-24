import { useState } from 'react';
import { isSameDay, startOfDay } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { useTaskStore } from '../store/taskStore';
import { useTimer } from '../hooks/useTimer';
import { XpHistory } from './tasks/XpHistory';
import { ProjectDetail } from './tasks/ProjectDetail';
import type { AppMode } from '../App';
import type { Task } from '../types';

function XpProgressBar() {
  const { userProgress, getXpToNextLevel } = useTaskStore();
  const [showHistory, setShowHistory] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const { current, required, progress } = getXpToNextLevel();
  
  return (
    <>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              Lv.{userProgress.level}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {userProgress.totalXp} XP
            </span>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title="View XP History"
          >
            {showHistory ? 'Hide' : 'History'}
          </button>
        </div>
        <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
          {current} / {required} to next level
        </div>
        
        {showHistory && (
          <div className="mt-3 max-h-48 overflow-y-auto">
            <div className="space-y-1">
              {userProgress.xpHistory.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                  No XP earned yet. Complete tasks to gain XP!
                </p>
              ) : (
                <>
                  {[...userProgress.xpHistory].reverse().slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className={`text-xs flex items-center gap-2 px-2 py-1 rounded ${
                        event.xp > 0 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' 
                          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      }`}
                    >
                      <span className="font-mono">
                        {event.xp > 0 ? '+' : ''}{event.xp}
                      </span>
                      <span className="flex-1 truncate">{event.taskTitle}</span>
                    </div>
                  ))}
                  {userProgress.xpHistory.length > 10 && (
                    <button
                      onClick={() => setShowFullHistory(true)}
                      className="w-full text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 py-2 text-center"
                    >
                      View all {userProgress.xpHistory.length} events
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      
      <XpHistory open={showFullHistory} onClose={() => setShowFullHistory(false)} />
    </>
  );
}

interface NavItemProps {
  label: string;
  shortcut: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  color?: string;
  indent?: boolean;
  droppableId?: string; // Optional droppable ID for drag-and-drop targets
}

function NavItem({ label, shortcut, count, active, onClick, color, indent, droppableId }: NavItemProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: droppableId ?? `nav-${label}`,
    disabled: !droppableId,
  });
  
  return (
    <button
      ref={droppableId ? setNodeRef : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        indent ? 'pl-6' : ''
      } ${
        isOver && droppableId
          ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500'
          : active 
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
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{shortcut}</span>
      )}
    </button>
  );
}

function ActiveTimerItem({ task }: { task: Task }) {
  const { formattedTime } = useTimer(task.timeSpent, task.timerStartedAt);
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm">
      <span>⏱️</span>
      <span className="font-mono text-blue-600 dark:text-blue-400">{formattedTime}</span>
      <span className="flex-1 truncate text-gray-700 dark:text-gray-300">{task.title}</span>
    </div>
  );
}

type SidebarProps = {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
};

export function Sidebar({ appMode, setAppMode }: SidebarProps) {
  const { 
    currentView, 
    currentProjectId,
    currentTagId,
    currentAreaId, 
    setView, 
    projects,
    areas,
    updateArea,
    deleteArea,
    editingProjectId,
    setEditingProject,
    tags, 
    tasks 
  } = useTaskStore();

  // Get tasks with active timers
  const activeTimers = tasks.filter(t => t.timerStartedAt !== null);
  
  const inboxCount = tasks.filter(t => t.projectId === null && t.areaId === null && !t.completed && !t.someday).length;
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayCount = tasks.filter(t => t.scheduledDate && isSameDay(t.scheduledDate, today) && !t.someday).length;
  const upcomingCount = tasks.filter(t => t.scheduledDate && t.scheduledDate >= todayStart && !t.someday).length;
  const somedayCount = tasks.filter(t => t.someday && !t.completed).length;

  const getProjectCount = (projectId: string) => 
    tasks.filter(t => t.projectId === projectId && !t.completed).length;

  const getTagCount = (tag: string) => 
    tasks.filter(t => t.tags.includes(tag) && !t.completed).length;

  const getAreaCount = (areaId: string) => {
    // Count tasks directly in area + tasks in projects belonging to area
    const areaProjects = projects.filter(p => p.areaId === areaId);
    const projectIds = areaProjects.map(p => p.id);
    return tasks.filter(t => 
      !t.completed && (
        t.areaId === areaId || 
        (t.projectId && projectIds.includes(t.projectId))
      )
    ).length;
  };

  // Group projects by area
  const projectsByArea = new Map<string | null, typeof projects>();
  projects.forEach(project => {
    const areaId = project.areaId;
    if (!projectsByArea.has(areaId)) {
      projectsByArea.set(areaId, []);
    }
    projectsByArea.get(areaId)!.push(project);
  });

  const ungroupedProjects = projectsByArea.get(null) || [];

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <select
          value={appMode}
          onChange={(e) => setAppMode(e.target.value as AppMode)}
          className="text-xl font-bold bg-transparent border-none outline-none cursor-pointer text-gray-900 dark:text-gray-100 w-full appearance-none pr-6 bg-no-repeat bg-right"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            backgroundSize: '1.25rem'
          }}
        >
          <option value="tasks">Tasks</option>
          <option value="habits">Habits</option>
          <option value="food">Food</option>
          <option value="workout">Workout</option>
        </select>
        {appMode === 'tasks' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Press any key to search</p>
        )}
      </div>
      
      {appMode === 'tasks' ? (
        <>
          <XpProgressBar />
          
          {activeTimers.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <h2 className="px-0 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Active Timers
              </h2>
              {activeTimers.map(task => (
                <ActiveTimerItem key={task.id} task={task} />
              ))}
            </div>
          )}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <NavItem
              label="Inbox"
              shortcut=""
              count={inboxCount}
              active={currentView === 'inbox'}
              onClick={() => setView('inbox')}
              droppableId="drop-inbox"
            />
            <NavItem
              label="Today"
              shortcut=""
              count={todayCount}
              active={currentView === 'today'}
              onClick={() => setView('today')}
              droppableId="drop-today"
            />
            <NavItem
              label="Upcoming"
              shortcut=""
              count={upcomingCount}
              active={currentView === 'upcoming'}
              onClick={() => setView('upcoming')}
              droppableId="drop-upcoming"
            />
            <NavItem
              label="Someday"
              shortcut=""
              count={somedayCount}
              active={currentView === 'someday'}
              onClick={() => setView('someday')}
              droppableId="drop-someday"
            />
            
            {/* Areas with their projects */}
            {areas.length > 0 && (
              <div className="pt-4">
                <h2 className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Areas
                </h2>
                {areas.map(area => {
                  const areaProjects = projectsByArea.get(area.id) || [];
                  return (
                    <div key={area.id}>
                      <div
                        onDoubleClick={() => {
                          const action = prompt('Type "rename" or "delete":');
                          if (action?.toLowerCase() === 'rename') {
                            const newName = prompt('New name:', area.name);
                            if (newName && newName !== area.name) {
                              updateArea(area.id, { name: newName });
                            }
                          } else if (action?.toLowerCase() === 'delete') {
                            if (confirm(`Delete area "${area.name}"?`)) {
                              deleteArea(area.id);
                            }
                          }
                        }}
                      >
                        <NavItem
                          label={area.name}
                          shortcut=""
                          count={getAreaCount(area.id)}
                          active={currentView === 'area' && currentAreaId === area.id}
                          onClick={() => setView('area', null, null, area.id)}
                          droppableId={`drop-area-${area.id}`}
                        />
                      </div>
                      {/* Projects in this area */}
                      {areaProjects.map(project => (
                        <div
                          key={project.id}
                          onDoubleClick={() => setEditingProject(project.id)}
                        >
                          <NavItem
                            label={`${project.boss ? '👑 ' : ''}${project.name}`}
                            shortcut=""
                            count={getProjectCount(project.id)}
                            active={currentView === 'project' && currentProjectId === project.id}
                            onClick={() => setView('project', project.id)}
                            color={project.color}
                            indent
                            droppableId={`drop-project-${project.id}`}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Ungrouped projects (no area) */}
            {ungroupedProjects.length > 0 && (
              <div className="pt-4">
                <h2 className="px-3 py-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Projects
                </h2>
                {ungroupedProjects.map(project => (
                  <div
                    key={project.id}
                    onDoubleClick={() => setEditingProject(project.id)}
                  >
                    <NavItem
                      label={`${project.boss ? '👑 ' : ''}${project.name}`}
                      shortcut=""
                      count={getProjectCount(project.id)}
                      active={currentView === 'project' && currentProjectId === project.id}
                      onClick={() => setView('project', project.id)}
                      color={project.color}
                      droppableId={`drop-project-${project.id}`}
                    />
                  </div>
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
        </>
      ) : appMode === 'habits' ? (
        <div className="flex-1 p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track your daily habits with a GitHub-style heatmap visualization.
          </p>
        </div>
      ) : appMode === 'food' ? (
        <div className="flex-1 p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track your daily nutrition, water intake, and intermittent fasting.
          </p>
        </div>
      ) : (
        <div className="flex-1 p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track your kettlebell swings and push ups.
          </p>
        </div>
      )}
      
      {/* Project Detail Modal */}
      {editingProjectId && (
        <ProjectDetail
          projectId={editingProjectId}
          open={!!editingProjectId}
          onClose={() => setEditingProject(null)}
        />
      )}
    </aside>
  );
}
