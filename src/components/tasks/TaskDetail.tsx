import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useTimer } from '../../hooks/useTimer';
import type { Recurrence } from '../../types';

interface TaskDetailProps {
  taskId: string;
  open: boolean;
  onClose: () => void;
}

export function TaskDetail({ taskId, open, onClose }: TaskDetailProps) {
  const {
    tasks,
    projects,
    areas,
    tags,
    updateTask,
    moveTask,
    setTaskArea,
    setTaskDate,
    setDeadline,
    setSomeday,
    setRecurrence,
    addTagToTask,
    removeTagFromTask,
    deleteTask,
    startTimer,
    stopTimer,
    resetTimer,
    getTaskDecayInfo,
  } = useTaskStore();

  const task = tasks.find(t => t.id === taskId);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(task?.title || '');
  const [url, setUrl] = useState(task?.url || '');
  const [newTag, setNewTag] = useState('');
  
  // Timer hook - use task values or defaults when task is not yet available
  const { formattedTime, isRunning } = useTimer(
    task?.timeSpent ?? 0,
    task?.timerStartedAt ?? null
  );

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setUrl(task.url || '');
    }
  }, [task]);

  useEffect(() => {
    if (open && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [open]);

  if (!open || !task) return null;

  const handleTitleBlur = () => {
    if (title.trim() && title !== task.title) {
      updateTask(taskId, { title: title.trim() });
    }
  };

  const handleUrlBlur = () => {
    const trimmedUrl = url.trim();
    if (trimmedUrl !== (task.url || '')) {
      updateTask(taskId, { url: trimmedUrl || null });
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUrlBlur();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setUrl(task.url || '');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setTitle(task.title);
      onClose();
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'inbox') {
      moveTask(taskId, null);
      setTaskArea(taskId, null);
    } else if (value.startsWith('project:')) {
      const projectId = value.replace('project:', '');
      moveTask(taskId, projectId);
    } else if (value.startsWith('area:')) {
      const areaId = value.replace('area:', '');
      setTaskArea(taskId, areaId);
    }
  };

  const getCurrentLocation = () => {
    if (task.projectId) return `project:${task.projectId}`;
    if (task.areaId) return `area:${task.areaId}`;
    return 'inbox';
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      const tag = newTag.trim().toLowerCase().replace(/^#/, '');
      if (!task.tags.includes(tag)) {
        addTagToTask(taskId, tag);
      }
      setNewTag('');
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleScheduledDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTaskDate(taskId, value ? new Date(value + 'T12:00:00') : null);
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDeadline(taskId, value ? new Date(value + 'T23:59:59') : null);
  };

  const handleRecurrenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'none') {
      setRecurrence(taskId, null);
    } else {
      const recurrence: Recurrence = {
        type: value as 'daily' | 'weekly' | 'monthly' | 'yearly',
        interval: 1,
      };
      setRecurrence(taskId, recurrence);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTask(taskId);
      onClose();
    }
  };

  const formatDateForInput = (date: Date | null) => {
    if (!date) return '';
    return format(date, 'yyyy-MM-dd');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Task</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onBlur={handleUrlBlur}
                onKeyDown={handleUrlKeyDown}
                placeholder="https://..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              />
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open
                </a>
              )}
            </div>
          </div>

          {/* Project/Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <select
              value={getCurrentLocation()}
              onChange={handleProjectChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
            >
              <option value="inbox">Inbox</option>
              {projects.length > 0 && (
                <optgroup label="Projects">
                  {projects.map(project => (
                    <option key={project.id} value={`project:${project.id}`}>
                      {project.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {areas.length > 0 && (
                <optgroup label="Areas">
                  {areas.map(area => (
                    <option key={area.id} value={`area:${area.id}`}>
                      {area.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {task.tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                >
                  #{tag}
                  <button
                    onClick={() => removeTagFromTask(taskId, tag)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 text-sm"
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {tags.filter(t => !task.tags.includes(t)).map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Scheduled
              </label>
              <input
                type="date"
                value={formatDateForInput(task.scheduledDate)}
                onChange={handleScheduledDateChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={formatDateForInput(task.deadline)}
                onChange={handleDeadlineChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              />
            </div>
          </div>

          {/* Recurrence & Someday & XP */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Repeat
              </label>
              <select
                value={task.recurrence?.type || 'none'}
                onChange={handleRecurrenceChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                XP Reward
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={task.xp ?? 5}
                onChange={e => {
                  const value = parseInt(e.target.value) || 5;
                  updateTask(taskId, { xp: Math.max(1, Math.min(100, value)) });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500"
              />
              {(() => {
                const decayInfo = getTaskDecayInfo(taskId);
                if (!decayInfo) return null;
                
                if (decayInfo.isDecaying) {
                  return (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                        <span className="font-medium">Decaying: {Math.round(decayInfo.multiplier * 100)}%</span>
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Effective XP: <span className="font-bold">{decayInfo.effectiveXp}</span> (was {decayInfo.baseXp})
                      </div>
                      <div className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                        Schedule this task or mark as Someday to stop decay.
                      </div>
                    </div>
                  );
                } else if (decayInfo.daysUntilDecay !== null && decayInfo.daysUntilDecay <= 7) {
                  return (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Decay starts in {decayInfo.daysUntilDecay} day{decayInfo.daysUntilDecay !== 1 ? 's' : ''} if not scheduled.
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.someday}
                  onChange={e => setSomeday(taskId, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-600 focus:ring-gray-400"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Someday</span>
              </label>
            </div>
          </div>
          
          {/* Time Tracked */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Time Tracked
            </label>
            <div className="flex items-center gap-3">
              <div className={`flex-1 px-4 py-3 rounded-lg font-mono text-lg ${
                isRunning 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                <div className="flex items-center gap-2">
                  <svg className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formattedTime}
                </div>
              </div>
              
              <button
                onClick={() => isRunning ? stopTimer(taskId) : startTimer(taskId)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isRunning
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900'
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    Stop
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Start
                  </span>
                )}
              </button>
              
              {(task.timeSpent > 0 || isRunning) && (
                <button
                  onClick={() => {
                    if (confirm('Reset timer to 0:00?')) {
                      resetTimer(taskId);
                    }
                  }}
                  className="px-3 py-3 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  title="Reset timer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Delete task
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
