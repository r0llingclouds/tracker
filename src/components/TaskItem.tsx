import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import type { Task, Project, Recurrence } from '../types';

interface TaskItemProps {
  task: Task;
  project?: Project;
  selected: boolean;
  onSelect: () => void;
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

export function TaskItem({ task, project, selected, onSelect, onToggle, onDoubleClick }: TaskItemProps) {
  const scheduledInfo = task.scheduledDate ? formatScheduledDate(task.scheduledDate) : null;
  const deadlineInfo = task.deadline ? formatDeadline(task.deadline) : null;
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer ${
        selected 
          ? 'bg-gray-100 dark:bg-gray-700 border-l-2 border-gray-400 dark:border-gray-500' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-l-2 border-transparent'
      } ${task.completed ? 'opacity-60' : ''}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transform hover:scale-110 active:scale-95 ${
          task.completed
            ? 'bg-gray-800 border-gray-800 text-white dark:bg-gray-200 dark:border-gray-200 dark:text-gray-900'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={`truncate ${task.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
          {task.title}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          {scheduledInfo && (
            <span className={`flex items-center gap-1 text-xs ${
              scheduledInfo.isOverdue && !task.completed
                ? 'text-gray-900 dark:text-gray-100 font-semibold' 
                : 'text-gray-500 dark:text-gray-400'
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
                ? 'text-gray-900 dark:text-gray-100 font-bold'
                : deadlineInfo.isUrgent && !task.completed
                ? 'text-gray-800 dark:text-gray-200 font-semibold'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              {deadlineInfo.text}
            </span>
          )}
          
          {task.recurrence && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {formatRecurrence(task.recurrence)}
            </span>
          )}
          
          {project && (
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
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
                  className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 dark:text-gray-500">
        <span className="font-mono">space+c</span> complete
      </div>
    </div>
  );
}
