import { useTaskStore } from '../../store/taskStore';
import { TaskItem } from './TaskItem';
import { TaskDetail } from './TaskDetail';

export function TaskList() {
  const { 
    getVisibleTasks, 
    getUpcomingTasksWithOverdue,
    selectedTaskId, 
    selectTask, 
    toggleTask,
    getProjectById,
    currentView,
    currentProjectId,
    currentTagId,
    currentAreaId,
    projects,
    areas,
    editingTaskId,
    setEditingTask,
  } = useTaskStore();

  const tasks = getVisibleTasks();
  const upcomingData = currentView === 'upcoming' ? getUpcomingTasksWithOverdue() : { overdueTasks: [], pastDeadlineTasks: [], upcomingGroups: [] };

  // Compute area view grouping
  const areaProjects = currentView === 'area' 
    ? projects.filter(p => p.areaId === currentAreaId)
    : [];
  const directAreaTasks = currentView === 'area'
    ? tasks.filter(t => t.projectId === null)
    : [];
  const getProjectTasksInArea = (projectId: string) => 
    tasks.filter(t => t.projectId === projectId);

  const getViewTitle = () => {
    switch (currentView) {
      case 'inbox':
        return 'Inbox';
      case 'today':
        return 'Today';
      case 'upcoming':
        return 'Upcoming';
      case 'someday':
        return 'Someday';
      case 'project':
        const project = projects.find(p => p.id === currentProjectId);
        return project?.name ?? 'Project';
      case 'tag':
        return `#${currentTagId}`;
      case 'area':
        const area = areas.find(a => a.id === currentAreaId);
        return area?.name ?? 'Area';
    }
  };

  const getViewSubtitle = () => {
    if (currentView === 'upcoming') {
      const overdueCount = upcomingData.overdueTasks.length;
      const pastDeadlineCount = upcomingData.pastDeadlineTasks.length;
      const upcomingCount = upcomingData.upcomingGroups.reduce((sum, g) => sum + g.tasks.length, 0);
      const totalTasks = overdueCount + pastDeadlineCount + upcomingCount;
      if (totalTasks === 0) return 'No scheduled tasks';
      
      const parts: string[] = [];
      if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
      if (pastDeadlineCount > 0) parts.push(`${pastDeadlineCount} past deadline`);
      if (upcomingCount > 0) parts.push(`${upcomingCount} upcoming`);
      
      return parts.join(', ');
    }
    const incomplete = tasks.filter(t => !t.completed).length;
    const total = tasks.length;
    if (total === 0) return 'No tasks';
    return `${incomplete} remaining`;
  };

  const isEmpty = currentView === 'upcoming' 
    ? (upcomingData.overdueTasks.length === 0 && upcomingData.pastDeadlineTasks.length === 0 && upcomingData.upcomingGroups.length === 0)
    : tasks.length === 0;

  return (
    <main className="flex-1 bg-white dark:bg-gray-900 flex flex-col h-screen overflow-hidden">
      <header className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{getViewTitle()}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getViewSubtitle()}</p>
      </header>
      
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg">{currentView === 'upcoming' ? 'No scheduled tasks' : currentView === 'someday' ? 'No someday tasks' : currentView === 'tag' ? 'No tasks with this tag' : currentView === 'area' ? 'No tasks in this area' : 'No tasks yet'}</p>
            <p className="text-sm mt-1">Press <kbd className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">space+n</kbd> to add one</p>
          </div>
        ) : currentView === 'upcoming' ? (
          <div>
            {/* Overdue section */}
            {upcomingData.overdueTasks.length > 0 && (
              <div className="mb-2">
                <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 px-6 py-2 border-b border-gray-300 dark:border-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Overdue</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{upcomingData.overdueTasks.length}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {upcomingData.overdueTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      project={task.projectId ? getProjectById(task.projectId) : undefined}
                      selected={task.id === selectedTaskId}
                      onSelect={() => selectTask(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      onDoubleClick={() => setEditingTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Past Deadline section */}
            {upcomingData.pastDeadlineTasks.length > 0 && (
              <div className="mb-2">
                <div className="sticky top-0 bg-gray-100 dark:bg-gray-800 px-6 py-2 border-b border-gray-300 dark:border-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Past Deadline</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{upcomingData.pastDeadlineTasks.length}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {upcomingData.pastDeadlineTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      project={task.projectId ? getProjectById(task.projectId) : undefined}
                      selected={task.id === selectedTaskId}
                      onSelect={() => selectTask(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      onDoubleClick={() => setEditingTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Upcoming tasks grouped by project */}
            {upcomingData.upcomingGroups.map(group => (
              <div key={group.projectId ?? 'inbox'} className="mb-2">
                {/* Project header */}
                <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  {group.color ? (
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                  ) : (
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-300">{group.projectName}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{group.tasks.length}</span>
                </div>
                {/* Tasks in this group */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.tasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      project={task.projectId ? getProjectById(task.projectId) : undefined}
                      selected={task.id === selectedTaskId}
                      onSelect={() => selectTask(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      onDoubleClick={() => setEditingTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : currentView === 'area' ? (
          <div>
            {/* Direct tasks (no project) */}
            {directAreaTasks.length > 0 && (
              <div className="mb-2">
                <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Tasks</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{directAreaTasks.length}</span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {directAreaTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      selected={task.id === selectedTaskId}
                      onSelect={() => selectTask(task.id)}
                      onToggle={() => toggleTask(task.id)}
                      onDoubleClick={() => setEditingTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tasks grouped by project */}
            {areaProjects.map(project => {
              const projectTasks = getProjectTasksInArea(project.id);
              if (projectTasks.length === 0) return null;
              return (
                <div key={project.id} className="mb-2">
                  <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="font-medium text-gray-700 dark:text-gray-300">{project.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{projectTasks.length}</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {projectTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        project={project}
                        selected={task.id === selectedTaskId}
                        onSelect={() => selectTask(task.id)}
                        onToggle={() => toggleTask(task.id)}
                        onDoubleClick={() => setEditingTask(task.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                project={task.projectId ? getProjectById(task.projectId) : undefined}
                selected={task.id === selectedTaskId}
                onSelect={() => selectTask(task.id)}
                onToggle={() => toggleTask(task.id)}
                onDoubleClick={() => setEditingTask(task.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      <footer className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 flex gap-4">
        <span><kbd className="font-mono">↑↓</kbd> navigate</span>
        <span><kbd className="font-mono">space+e</kbd> edit</span>
        <span><kbd className="font-mono">space+c</kbd> complete</span>
        <span><kbd className="font-mono">space+s</kbd> schedule</span>
        <span><kbd className="font-mono">space+d</kbd> deadline</span>
        <span><kbd className="font-mono">space+m</kbd> move</span>
        <span><kbd className="font-mono">space+t</kbd> tag</span>
        <span><kbd className="font-mono">space+x</kbd> delete</span>
      </footer>

      {/* Task Detail Modal */}
      {editingTaskId && (
        <TaskDetail
          taskId={editingTaskId}
          open={!!editingTaskId}
          onClose={() => setEditingTask(null)}
        />
      )}
    </main>
  );
}
