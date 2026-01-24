import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../../store/taskStore';
import { useTimer } from '../../hooks/useTimer';
import { SmartTaskInput } from './SmartTaskInput';
import type { ParsedTaskInput } from '../../lib/tasks/parsing';
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
    duplicateTask,
    startTimer,
    stopTimer,
    resetTimer,
    getTaskDecayInfo,
  } = useTaskStore();

  const task = tasks.find(t => t.id === taskId);
  const [url, setUrl] = useState(task?.url || '');
  const [newTag, setNewTag] = useState('');
  const [smartInputValue, setSmartInputValue] = useState(task?.title || '');
  const [editingTime, setEditingTime] = useState(false);
  const [timeInputHours, setTimeInputHours] = useState(0);
  const [timeInputMinutes, setTimeInputMinutes] = useState(0);
  
  // Timer hook - use task values or defaults when task is not yet available
  const { formattedTime, isRunning } = useTimer(
    task?.timeSpent ?? 0,
    task?.timerStartedAt ?? null
  );

  useEffect(() => {
    if (task) {
      setUrl(task.url || '');
      setSmartInputValue(task.title);
    }
  }, [task]);

  // Handle Enter/Escape to close modal when not in an input
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
      
      if (!isInInput && (e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !task) return null;

  // Handle smart input submission - applies all parsed values
  const handleSmartInputSubmit = useCallback((parsed: ParsedTaskInput) => {
    // Update title
    const newTitle = parsed.cleanTitle.trim() || task.title;
    if (newTitle !== task.title) {
      updateTask(taskId, { title: newTitle });
    }

    // Add new tags (don't remove existing ones)
    for (const tag of parsed.tags) {
      if (!task.tags.includes(tag)) {
        addTagToTask(taskId, tag);
      }
    }

    // Set project/area if @ was used
    if (parsed.projectName) {
      const project = projects.find(p => p.name.toLowerCase() === parsed.projectName);
      const area = areas.find(a => a.name.toLowerCase() === parsed.projectName);
      if (project) {
        moveTask(taskId, project.id);
      } else if (area) {
        setTaskArea(taskId, area.id);
      }
    }

    // Set scheduled date if detected
    if (parsed.scheduledDate) {
      setTaskDate(taskId, parsed.scheduledDate);
    }

    // Set deadline if d/ was used
    if (parsed.deadline) {
      setDeadline(taskId, parsed.deadline);
    }

    // Set URL if detected
    if (parsed.url && parsed.url !== task.url) {
      updateTask(taskId, { url: parsed.url });
    }

    // Reset the smart input to just the clean title
    setSmartInputValue(newTitle);

    // Close the modal after applying changes
    onClose();
  }, [task, taskId, projects, areas, updateTask, addTagToTask, moveTask, setTaskArea, setTaskDate, setDeadline, onClose]);

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
      e.preventDefault();
      setUrl(task.url || '');
      (e.target as HTMLInputElement).blur();
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
    if (e.key === 'Escape') {
      e.preventDefault();
      setNewTag('');
      (e.target as HTMLInputElement).blur();
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

  // Time editing handlers
  const initTimeInputs = () => {
    const totalMinutes = Math.floor(task.timeSpent / 60000);
    setTimeInputHours(Math.floor(totalMinutes / 60));
    setTimeInputMinutes(totalMinutes % 60);
    setEditingTime(true);
  };

  const handleTimeSave = () => {
    const newTimeSpent = (timeInputHours * 60 + timeInputMinutes) * 60000;
    updateTask(taskId, { timeSpent: newTimeSpent });
    setEditingTime(false);
  };

  const handleTimeCancel = () => {
    setEditingTime(false);
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTimeSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleTimeCancel();
    }
  };

  const handleDuplicate = () => {
    duplicateTask(taskId);
    onClose();
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
        className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-950 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Edit Task</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Title - Smart Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title
              <span className="ml-2 text-xs font-normal text-zinc-600 dark:text-zinc-400">
                Use # for tags, @ for location, d/ for deadline
              </span>
            </label>
            <SmartTaskInput
              value={smartInputValue}
              onChange={setSmartInputValue}
              onSubmit={handleSmartInputSubmit}
              onCancel={onClose}
              projects={projects}
              areas={areas}
              tags={tags}
              placeholder="Task title... (use #tag @project d/deadline tomorrow)"
              autoFocus={open}
              showPreview={true}
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              />
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm flex items-center gap-1"
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Location
            </label>
            <select
              value={getCurrentLocation()}
              onChange={handleProjectChange}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {task.tags.map(tag => (
                <span 
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm"
                >
                  #{tag}
                  <button
                    onClick={() => removeTagFromTask(taskId, tag)}
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
                className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 text-sm"
                list="tag-suggestions"
              />
              <datalist id="tag-suggestions">
                {tags.filter(t => !task.tags.includes(t)).map(t => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Scheduled
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formatDateForInput(task.scheduledDate)}
                  onChange={handleScheduledDateChange}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />
                {task.scheduledDate && (
                  <button
                    onClick={() => setTaskDate(taskId, null)}
                    className="px-2 py-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                    title="Clear scheduled date"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Deadline
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formatDateForInput(task.deadline)}
                  onChange={handleDeadlineChange}
                  className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                />
                {task.deadline && (
                  <button
                    onClick={() => setDeadline(taskId, null)}
                    className="px-2 py-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                    title="Clear deadline"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Recurrence & Someday & XP */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Repeat
              </label>
              <select
                value={task.recurrence?.type || 'none'}
                onChange={handleRecurrenceChange}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500"
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
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
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
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-gray-600 focus:ring-gray-400"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Someday</span>
              </label>
            </div>
          </div>
          
          {/* Time Tracked */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Time Tracked
            </label>
            <div className="flex items-center gap-3">
              {editingTime ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={timeInputHours}
                    onChange={e => setTimeInputHours(Math.max(0, parseInt(e.target.value) || 0))}
                    onKeyDown={handleTimeKeyDown}
                    className="w-16 px-2 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-center font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                    autoFocus
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">h</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={timeInputMinutes}
                    onChange={e => setTimeInputMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    onKeyDown={handleTimeKeyDown}
                    className="w-16 px-2 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-center font-mono focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
                  />
                  <span className="text-zinc-600 dark:text-zinc-400">m</span>
                  <button
                    onClick={handleTimeSave}
                    className="px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleTimeCancel}
                    className="px-3 py-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={isRunning ? undefined : initTimeInputs}
                  disabled={isRunning}
                  className={`flex-1 px-4 py-3 rounded-lg font-mono text-lg text-left ${
                    isRunning 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-not-allowed' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer'
                  }`}
                  title={isRunning ? 'Stop timer to edit time' : 'Click to edit time'}
                >
                  <div className="flex items-center gap-2">
                    <svg className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formattedTime}
                    {!isRunning && (
                      <svg className="w-3 h-3 ml-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
                  </div>
                </button>
              )}
              
              <button
                onClick={() => isRunning ? stopTimer(taskId) : startTimer(taskId)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isRunning
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900'
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
                  className="px-3 py-3 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              Delete
            </button>
            <button
              onClick={handleDuplicate}
              className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              Duplicate
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
