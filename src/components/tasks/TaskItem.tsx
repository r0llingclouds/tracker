import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task, Project, Recurrence } from '../../types';
import { useTimer } from '../../hooks/useTimer';
import { useTaskStore } from '../../store/taskStore';

interface TaskItemProps {
  task: Task;
  project?: Project;
  selected: boolean;
  multiSelected?: boolean;  // Part of multi-selection
  onSelect: (e: React.MouseEvent) => void;
  onToggle: () => void;
  onDoubleClick: () => void;
}

function formatScheduledDate(date: Date): { text: string; isOverdue: boolean } {
  const today = startOfDay(new Date());
  const scheduledDay = startOfDay(date);
  
  if (isToday(date)) {
    return { text: 'Today', isOverdue: false };
  }
  if (isTomorrow(date)) {
    return { text: 'Tomorrow', isOverdue: false };
  }
  if (isPast(scheduledDay) && scheduledDay < today) {
    return { text: format(date, 'MMM d'), isOverdue: true };
  }
  // Within the same week, show day name
  const daysUntil = Math.ceil((scheduledDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 7) {
    return { text: format(date, 'EEE'), isOverdue: false };
  }
  // Otherwise show full date
  return { text: format(date, 'MMM d'), isOverdue: false };
}

function formatDeadline(date: Date): { text: string; isPastDue: boolean; isUrgent: boolean } {
  const today = startOfDay(new Date());
  const deadlineDay = startOfDay(date);
  const daysUntil = Math.ceil((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (isToday(date)) {
    return { text: 'Due today', isPastDue: false, isUrgent: true };
  }
  if (isTomorrow(date)) {
    return { text: 'Due tomorrow', isPastDue: false, isUrgent: true };
  }
  if (isPast(deadlineDay) && deadlineDay < today) {
    return { text: `Due ${format(date, 'MMM d')}`, isPastDue: true, isUrgent: false };
  }
  // Within the same week, show day name
  if (daysUntil <= 7) {
    return { text: `Due ${format(date, 'EEE')}`, isPastDue: false, isUrgent: daysUntil <= 3 };
  }
  // Otherwise show full date
  return { text: `Due ${format(date, 'MMM d')}`, isPastDue: false, isUrgent: false };
}

function formatRecurrence(recurrence: Recurrence): string {
  const { type, interval, weekdays } = recurrence;
  
  if (type === 'daily') {
    return interval === 1 ? 'Daily' : `Every ${interval} days`;
  }
  
  if (type === 'weekly') {
    if (weekdays && weekdays.length > 0 && weekdays.length < 7) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = weekdays.map(d => dayNames[d]).join('/');
      return interval === 1 ? days : `${days} every ${interval} wks`;
    }
    return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
  }
  
  if (type === 'monthly') {
    return interval === 1 ? 'Monthly' : `Every ${interval} months`;
  }
  
  if (type === 'yearly') {
    return interval === 1 ? 'Yearly' : `Every ${interval} years`;
  }
  
  return 'Repeating';
}

export function TaskItem({ task, project, selected, multiSelected, onSelect, onToggle, onDoubleClick }: TaskItemProps) {
  const scheduledInfo = task.scheduledDate ? formatScheduledDate(task.scheduledDate) : null;
  const deadlineInfo = task.deadline ? formatDeadline(task.deadline) : null;
  const { formattedTime, isRunning } = useTimer(task.timeSpent, task.timerStartedAt);
  const { startTimer, stopTimer, getTaskDecayInfo } = useTaskStore();
  
  const hasTime = task.timeSpent > 0 || isRunning;
  const decayInfo = getTaskDecayInfo(task.id);
  
  // Sortable hook for drag and drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };
  
  const handleTimerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      stopTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };
  
  // Determine selection state styling
  const isMultiSelected = multiSelected && !selected;  // Part of multi-selection but not the primary selected
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`group flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing touch-none ${
        selected 
          ? 'bg-zinc-100 dark:bg-zinc-800 border-l-2 border-zinc-400 dark:border-zinc-500' 
          : isMultiSelected
          ? 'bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-400 dark:border-blue-600'
          : 'hover:bg-zinc-50 dark:hover:bg-zinc-900 border-l-2 border-transparent'
      } ${task.completed ? 'opacity-60' : ''} ${isDragging ? 'bg-zinc-100 dark:bg-zinc-800 shadow-lg' : ''}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transform hover:scale-110 active:scale-95 ${
          task.completed
            ? 'bg-zinc-800 border-zinc-800 text-white dark:bg-zinc-200 dark:border-zinc-200 dark:text-zinc-900'
            : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        {task.url ? (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`truncate block hover:underline ${
              task.completed 
                ? 'text-zinc-400 dark:text-zinc-500 line-through' 
                : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            {task.title}
            <svg className="inline-block w-3 h-3 ml-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <p className={`truncate ${task.completed ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-50'}`}>
            {task.title}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          {scheduledInfo && (
            <span className={`flex items-center gap-1 text-xs ${
              scheduledInfo.isOverdue && !task.completed
                ? 'text-zinc-900 dark:text-zinc-50 font-semibold' 
                : 'text-zinc-600 dark:text-zinc-400'
            }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {scheduledInfo.text}
            </span>
          )}
          
          {deadlineInfo && (
            <span className={`flex items-center gap-1 text-xs ${
              deadlineInfo.isPastDue && !task.completed
                ? 'text-zinc-900 dark:text-zinc-50 font-bold'
                : deadlineInfo.isUrgent && !task.completed
                ? 'text-zinc-800 dark:text-zinc-200 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              {deadlineInfo.text}
            </span>
          )}
          
          {task.recurrence && (
            <span className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {formatRecurrence(task.recurrence)}
            </span>
          )}
          
          {project && (
            <span className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: project.color }}
              />
              {project.name}
            </span>
          )}
          
          {task.tags.length > 0 && (
            <div className="flex gap-1">
              {task.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          {/* XP indicator with decay */}
          {decayInfo && !task.completed && (
            <span 
              className={`flex items-center gap-1 text-xs font-medium ${
                decayInfo.isDecaying
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-purple-600 dark:text-purple-400'
              }`}
              title={decayInfo.isDecaying 
                ? `Decaying: ${Math.round(decayInfo.multiplier * 100)}% of ${decayInfo.baseXp} XP`
                : decayInfo.daysUntilDecay !== null 
                  ? `${decayInfo.baseXp} XP - Decay starts in ${decayInfo.daysUntilDecay} days`
                  : `${decayInfo.baseXp} XP`
              }
            >
              {decayInfo.isDecaying ? (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                  {decayInfo.effectiveXp} XP
                </>
              ) : (
                <>{decayInfo.baseXp} XP</>
              )}
            </span>
          )}
          
          {hasTime && (
            <span className={`flex items-center gap-1 text-xs font-mono ${
              isRunning 
                ? 'text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-zinc-600 dark:text-zinc-400'
            }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formattedTime}
            </span>
          )}
        </div>
      </div>
      
      {/* Timer play/pause button */}
      <button
        onClick={handleTimerClick}
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          isRunning
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
            : 'opacity-0 group-hover:opacity-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
        }`}
        title={isRunning ? 'Stop timer' : 'Start timer'}
      >
        {isRunning ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-600 dark:text-zinc-400">
        <span className="font-mono">space+c</span> complete
      </div>
    </div>
  );
}
