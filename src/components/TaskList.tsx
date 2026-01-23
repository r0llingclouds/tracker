import { useTaskStore } from '../store/taskStore';
import { TaskItem } from './TaskItem';

export function TaskList() {
  const { 
    getVisibleTasks, 
    selectedTaskId, 
    selectTask, 
    toggleTask,
    getProjectById,
    currentView,
    currentProjectId,
    projects,
  } = useTaskStore();

  const tasks = getVisibleTasks();

  const getViewTitle = () => {
    switch (currentView) {
      case 'inbox':
        return 'Inbox';
      case 'today':
        return 'Today';
      case 'project':
        const project = projects.find(p => p.id === currentProjectId);
        return project?.name ?? 'Project';
    }
  };

  const getViewSubtitle = () => {
    const incomplete = tasks.filter(t => !t.completed).length;
    const total = tasks.length;
    if (total === 0) return 'No tasks';
    return `${incomplete} remaining`;
  };

  return (
    <main className="flex-1 bg-white flex flex-col h-screen overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">{getViewTitle()}</h2>
        <p className="text-sm text-gray-500 mt-1">{getViewSubtitle()}</p>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg">No tasks yet</p>
            <p className="text-sm mt-1">Press <kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">n</kbd> to add one</p>
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
        <span><kbd className="font-mono">j/k</kbd> navigate</span>
        <span><kbd className="font-mono">space+c</kbd> complete</span>
        <span><kbd className="font-mono">space+s</kbd> schedule</span>
        <span><kbd className="font-mono">space+m</kbd> move</span>
        <span><kbd className="font-mono">space+t</kbd> tag</span>
        <span><kbd className="font-mono">space+d</kbd> delete</span>
      </footer>
    </main>
  );
}
