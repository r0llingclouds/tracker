import { useTaskStore } from '../store/taskStore';
import { TaskItem } from './TaskItem';

export function TaskList() {
  const { 
    getVisibleTasks, 
    getUpcomingTasksByProject,
    selectedTaskId, 
    selectTask, 
    toggleTask,
    getProjectById,
    currentView,
    currentProjectId,
    projects,
  } = useTaskStore();

  const tasks = getVisibleTasks();
  const upcomingGroups = currentView === 'upcoming' ? getUpcomingTasksByProject() : [];

  const getViewTitle = () => {
    switch (currentView) {
      case 'inbox':
        return 'Inbox';
      case 'today':
        return 'Today';
      case 'upcoming':
        return 'Upcoming';
      case 'project':
        const project = projects.find(p => p.id === currentProjectId);
        return project?.name ?? 'Project';
    }
  };

  const getViewSubtitle = () => {
    if (currentView === 'upcoming') {
      const totalTasks = upcomingGroups.reduce((sum, g) => sum + g.tasks.length, 0);
      if (totalTasks === 0) return 'No scheduled tasks';
      return `${totalTasks} task${totalTasks === 1 ? '' : 's'} scheduled`;
    }
    const incomplete = tasks.filter(t => !t.completed).length;
    const total = tasks.length;
    if (total === 0) return 'No tasks';
    return `${incomplete} remaining`;
  };

  const isEmpty = currentView === 'upcoming' 
    ? upcomingGroups.length === 0 
    : tasks.length === 0;

  return (
    <main className="flex-1 bg-white flex flex-col h-screen overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">{getViewTitle()}</h2>
        <p className="text-sm text-gray-500 mt-1">{getViewSubtitle()}</p>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg">{currentView === 'upcoming' ? 'No scheduled tasks' : 'No tasks yet'}</p>
            <p className="text-sm mt-1">Press <kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">n</kbd> to add one</p>
          </div>
        ) : currentView === 'upcoming' ? (
          <div>
            {upcomingGroups.map(group => (
              <div key={group.projectId ?? 'inbox'} className="mb-2">
                {/* Project header */}
                <div className="sticky top-0 bg-gray-50 px-6 py-2 border-b border-gray-200 flex items-center gap-2">
                  {group.color ? (
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  )}
                  <span className="font-medium text-gray-700">{group.projectName}</span>
                  <span className="text-xs text-gray-400">{group.tasks.length}</span>
                </div>
                {/* Tasks in this group */}
                <div className="divide-y divide-gray-100">
                  {group.tasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      project={task.projectId ? getProjectById(task.projectId) : undefined}
                      selected={task.id === selectedTaskId}
                      onSelect={() => selectTask(task.id)}
                      onToggle={() => toggleTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                project={task.projectId ? getProjectById(task.projectId) : undefined}
                selected={task.id === selectedTaskId}
                onSelect={() => selectTask(task.id)}
                onToggle={() => toggleTask(task.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      <footer className="px-6 py-3 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
        <span><kbd className="font-mono">↑↓</kbd> navigate</span>
        <span><kbd className="font-mono">space+c</kbd> complete</span>
        <span><kbd className="font-mono">space+s</kbd> schedule</span>
        <span><kbd className="font-mono">space+m</kbd> move</span>
        <span><kbd className="font-mono">space+t</kbd> tag</span>
        <span><kbd className="font-mono">space+d</kbd> delete</span>
      </footer>
    </main>
  );
}
