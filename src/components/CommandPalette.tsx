import { Command } from 'cmdk';
import { useEffect, useState, useRef } from 'react';
import { addDays, addWeeks, format, startOfDay, nextDay, getDay } from 'date-fns';
import { useTaskStore } from '../store/taskStore';

// Date suggestion types and helpers for schedule mode
interface DateSuggestion {
  id: string;
  label: string;
  date: Date | null;
  description: string;
  icon: 'sun' | 'calendar' | 'week' | 'clear' | 'someday';
  isSomeday?: boolean;
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DAY_ABBREVIATIONS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTH_ABBREVIATIONS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Natural language date parsing for task input
interface ParsedTaskInput {
  title: string;
  scheduledDate: Date | null;
  datePhrase: string | null;
}

function parseDateFromText(text: string): ParsedTaskInput {
  const today = startOfDay(new Date());
  
  // Patterns to match (order matters - more specific first)
  const patterns: Array<{ regex: RegExp; getDate: (match: RegExpMatchArray) => Date | null }> = [
    // "next week"
    {
      regex: /\bnext\s+week\b/i,
      getDate: () => addWeeks(today, 1),
    },
    // "next monday", "next tue", etc.
    {
      regex: /\bnext\s+(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i,
      getDate: (match) => {
        const dayStr = match[1].toLowerCase();
        for (const [abbrev, dayIndex] of Object.entries(DAY_ABBREVIATIONS)) {
          if (dayStr === abbrev || dayStr.startsWith(abbrev)) {
            return getNextDayOccurrence(dayIndex, 1); // Skip to the one after next
          }
        }
        return null;
      },
    },
    // "21 jun", "21 june", "21st june", "21jun", etc.
    {
      regex: /\b(\d{1,2})(?:st|nd|rd|th)?\s*(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,
      getDate: (match) => {
        const day = parseInt(match[1], 10);
        const monthStr = match[2].toLowerCase();
        let monthIndex = -1;
        for (const [abbrev, idx] of Object.entries(MONTH_ABBREVIATIONS)) {
          if (monthStr === abbrev || monthStr.startsWith(abbrev.slice(0, 3))) {
            monthIndex = idx;
            break;
          }
        }
        if (monthIndex === -1 || day < 1 || day > 31) return null;
        
        const year = new Date().getFullYear();
        let date = new Date(year, monthIndex, day);
        // If the date has passed, use next year
        if (date < today) {
          date = new Date(year + 1, monthIndex, day);
        }
        return startOfDay(date);
      },
    },
    // "jun 21", "june 21st", "jun21", etc.
    {
      regex: /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{1,2})(?:st|nd|rd|th)?\b/i,
      getDate: (match) => {
        const monthStr = match[1].toLowerCase();
        const day = parseInt(match[2], 10);
        let monthIndex = -1;
        for (const [abbrev, idx] of Object.entries(MONTH_ABBREVIATIONS)) {
          if (monthStr === abbrev || monthStr.startsWith(abbrev.slice(0, 3))) {
            monthIndex = idx;
            break;
          }
        }
        if (monthIndex === -1 || day < 1 || day > 31) return null;
        
        const year = new Date().getFullYear();
        let date = new Date(year, monthIndex, day);
        // If the date has passed, use next year
        if (date < today) {
          date = new Date(year + 1, monthIndex, day);
        }
        return startOfDay(date);
      },
    },
    // Day names: "monday", "mon", "tue", etc.
    {
      regex: /\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?)\b/i,
      getDate: (match) => {
        const dayStr = match[1].toLowerCase();
        for (const [abbrev, dayIndex] of Object.entries(DAY_ABBREVIATIONS)) {
          if (dayStr === abbrev) {
            return getNextDayOccurrence(dayIndex, 0);
          }
        }
        return null;
      },
    },
    // "today", "tod"
    {
      regex: /\b(today|tod)\b/i,
      getDate: () => today,
    },
    // "tomorrow", "tom", "tmr", "tmrw"
    {
      regex: /\b(tomorrow|tom|tmr|tmrw)\b/i,
      getDate: () => addDays(today, 1),
    },
  ];
  
  for (const { regex, getDate } of patterns) {
    const match = text.match(regex);
    if (match) {
      const date = getDate(match);
      if (date) {
        // Remove the matched phrase from the title
        const cleanedTitle = text.replace(regex, '').replace(/\s+/g, ' ').trim();
        return {
          title: cleanedTitle,
          scheduledDate: date,
          datePhrase: match[0],
        };
      }
    }
  }
  
  return {
    title: text,
    scheduledDate: null,
    datePhrase: null,
  };
}

function getNextDayOccurrence(dayIndex: number, weeksAhead: number = 0): Date {
  const today = startOfDay(new Date());
  const todayDay = getDay(today);
  
  // If it's the same day of the week, get next week's occurrence
  if (todayDay === dayIndex) {
    return addWeeks(today, 1 + weeksAhead);
  }
  
  // Get the next occurrence of this day
  const next = nextDay(today, dayIndex as 0 | 1 | 2 | 3 | 4 | 5 | 6);
  return addWeeks(next, weeksAhead);
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  return t.startsWith(q) || t.includes(q);
}

function getDateSuggestions(query: string): DateSuggestion[] {
  const q = query.toLowerCase().trim();
  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(new Date(), 1));
  const nextWeek = startOfDay(addWeeks(new Date(), 1));
  
  const baseSuggestions: DateSuggestion[] = [
    {
      id: 'today',
      label: 'Today',
      date: today,
      description: format(today, 'EEE, MMM d'),
      icon: 'sun',
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      date: tomorrow,
      description: format(tomorrow, 'EEE, MMM d'),
      icon: 'calendar',
    },
    {
      id: 'next-week',
      label: 'Next Week',
      date: nextWeek,
      description: format(nextWeek, 'EEE, MMM d'),
      icon: 'week',
    },
    {
      id: 'no-date',
      label: 'No Date',
      date: null,
      description: 'Remove scheduled date',
      icon: 'clear',
    },
    {
      id: 'someday',
      label: 'Someday',
      date: null,
      description: 'Do it eventually',
      icon: 'someday',
      isSomeday: true,
    },
  ];
  
  // If no query, return base suggestions
  if (!q) {
    return baseSuggestions;
  }
  
  const results: DateSuggestion[] = [];
  
  // Check for keyword matches
  if (fuzzyMatch(q, 'today')) {
    results.push(baseSuggestions[0]);
  }
  if (fuzzyMatch(q, 'tomorrow') || fuzzyMatch(q, 'tom')) {
    results.push(baseSuggestions[1]);
  }
  if (fuzzyMatch(q, 'next week') || fuzzyMatch(q, 'next') || fuzzyMatch(q, 'week')) {
    results.push(baseSuggestions[2]);
  }
  if (fuzzyMatch(q, 'no date') || fuzzyMatch(q, 'none') || fuzzyMatch(q, 'clear') || fuzzyMatch(q, 'remove')) {
    results.push(baseSuggestions[3]);
  }
  if (fuzzyMatch(q, 'someday') || fuzzyMatch(q, 'later') || fuzzyMatch(q, 'eventually')) {
    results.push(baseSuggestions[4]);
  }
  
  // Check for day name matches
  for (const [abbrev, dayIndex] of Object.entries(DAY_ABBREVIATIONS)) {
    if (abbrev.startsWith(q) || q === abbrev) {
      const dayName = DAY_NAMES[dayIndex];
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      // Get next occurrence
      const firstOccurrence = getNextDayOccurrence(dayIndex, 0);
      const secondOccurrence = getNextDayOccurrence(dayIndex, 1);
      
      // Add first occurrence if not already in results
      const firstId = `${dayName}-1`;
      if (!results.some(r => r.id === firstId)) {
        results.push({
          id: firstId,
          label: capitalizedDay,
          date: firstOccurrence,
          description: format(firstOccurrence, 'MMM d'),
          icon: 'calendar',
        });
      }
      
      // Add second occurrence
      const secondId = `${dayName}-2`;
      if (!results.some(r => r.id === secondId)) {
        results.push({
          id: secondId,
          label: capitalizedDay,
          date: secondOccurrence,
          description: format(secondOccurrence, 'MMM d'),
          icon: 'calendar',
        });
      }
      
      // Only match one day abbreviation
      break;
    }
  }
  
  // Check for day number (1-31)
  const dayNum = parseInt(q, 10);
  if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Try this month first
    let firstDate = new Date(currentYear, currentMonth, dayNum);
    
    // If that day has passed (or is today), use next month
    if (firstDate <= now) {
      firstDate = new Date(currentYear, currentMonth + 1, dayNum);
    }
    
    // Second occurrence is the month after
    const secondDate = new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, dayNum);
    
    // Only add if the date is valid (handles months with fewer days)
    if (firstDate.getDate() === dayNum) {
      results.push({
        id: `day-${dayNum}-1`,
        label: format(firstDate, 'EEEE'),
        date: startOfDay(firstDate),
        description: format(firstDate, 'MMM d'),
        icon: 'calendar',
      });
    }
    
    if (secondDate.getDate() === dayNum) {
      results.push({
        id: `day-${dayNum}-2`,
        label: format(secondDate, 'EEEE'),
        date: startOfDay(secondDate),
        description: format(secondDate, 'MMM d'),
        icon: 'calendar',
      });
    }
  }
  
  return results;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  mode: 'search' | 'move' | 'tag' | 'newTask' | 'schedule' | 'deadline';
  initialValue?: string;
}

export function CommandPalette({ open, onClose, mode, initialValue = '' }: CommandPaletteProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    tasks, 
    projects, 
    tags,
    selectedTaskId,
    addTask, 
    moveTask,
    setTaskDate,
    setDeadline,
    setSomeday,
    addTagToTask,
    removeTagFromTask,
    addProject,
    setView,
    selectTask,
    getTaskById,
  } = useTaskStore();

  useEffect(() => {
    if (open) {
      setInputValue(initialValue);
      // Focus input after a small delay to ensure the dialog is rendered
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open, mode, initialValue]);

  // Detect if user is typing a tag in newTask mode (e.g., "Buy groceries #shop")
  const tagMatch = mode === 'newTask' ? inputValue.match(/#(\w*)$/) : null;
  const isTypingTag = tagMatch !== null;
  const tagQuery = tagMatch?.[1]?.toLowerCase() || '';
  
  // Filter tags based on the query after #
  const filteredTags = isTypingTag
    ? tags.filter(t => t.toLowerCase().includes(tagQuery))
    : [];

  // Parse all tags from input for display
  const parsedTags = inputValue.match(/#(\w+)/g)?.map(t => t.slice(1).toLowerCase()) || [];
  
  // Get clean title (without tags) for display
  const titleWithoutTags = inputValue.replace(/#\w+\s*/g, '').trim();
  
  // Parse deadline from d/ syntax (e.g., "d/mon", "d/tom", "d/23jun")
  const deadlineMatch = mode === 'newTask' ? titleWithoutTags.match(/\bd\/(\S+)/i) : null;
  let parsedDeadline: Date | null = null;
  let titleWithoutDeadline = titleWithoutTags;
  
  if (deadlineMatch) {
    const dateStr = deadlineMatch[1];
    const dateResult = parseDateFromText(dateStr);
    parsedDeadline = dateResult.scheduledDate;
    titleWithoutDeadline = titleWithoutTags.replace(/\bd\/\S+\s*/i, '').trim();
  }
  
  // Parse scheduled date from the remaining title (for newTask mode)
  const parsedDate = mode === 'newTask' ? parseDateFromText(titleWithoutDeadline) : null;
  const cleanTitle = parsedDate?.title ?? titleWithoutDeadline;

  const handleSelect = (callback: () => void) => {
    callback();
    onClose();
  };

  // Insert a tag into the input, replacing the partial #query
  const insertTag = (tag: string) => {
    const newValue = inputValue.replace(/#\w*$/, `#${tag} `);
    setInputValue(newValue);
    // Keep focus on input
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'newTask':
        return 'What needs to be done? (use # for tags)';
      case 'move':
        return 'Move to project...';
      case 'tag':
        return 'Add tag...';
      case 'schedule':
        return 'Schedule task...';
      case 'deadline':
        return 'Set deadline...';
      default:
        return 'Search tasks, projects, or type a command...';
    }
  };
  
  // Get selected task for schedule mode
  const selectedTask = selectedTaskId ? getTaskById(selectedTaskId) : null;

  // Create task with parsed tags, date, and deadline
  const createTaskWithTags = () => {
    if (!cleanTitle && parsedTags.length === 0) return;
    const title = cleanTitle || 'Untitled';
    addTask(title, null, parsedTags, parsedDate?.scheduledDate ?? null, parsedDeadline);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Tab to insert selected tag when typing #
    if (mode === 'newTask' && isTypingTag && e.key === 'Tab' && filteredTags.length > 0) {
      e.preventDefault();
      insertTag(filteredTags[0]);
      return;
    }
    
    // Handle Enter for new task creation (only if not selecting a tag)
    if (mode === 'newTask' && e.key === 'Enter' && inputValue.trim() && !isTypingTag) {
      e.preventDefault();
      createTaskWithTags();
      return;
    }
    
    // Note: Tag mode Enter is handled by cmdk's onSelect to allow selecting filtered items
    
    // Handle Enter for new project creation when moving
    if (mode === 'move' && e.key === 'Enter' && inputValue.trim()) {
      // Check if it matches an existing project
      const existingProject = projects.find(
        p => p.name.toLowerCase() === inputValue.trim().toLowerCase()
      );
      if (!existingProject && selectedTaskId) {
        // Create new project and move task to it
        addProject(inputValue.trim());
        // We need to get the new project id after it's created
        // For now, we'll just close - the user can select it from the list
      }
    }
    
    // Note: Removed single-key shortcuts for schedule mode (t/m/w/x) 
    // to allow fuzzy typing. Users can now type "tod", "tom", "mon", etc.
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <Command
        className="relative z-10 w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        loop
        shouldFilter={mode !== 'newTask' && mode !== 'schedule' && mode !== 'deadline'}
      >
        <Command.Input
          ref={inputRef}
          value={inputValue}
          onValueChange={setInputValue}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          className="w-full px-4 py-4 text-lg border-b border-gray-200 outline-none"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-gray-500">
            {mode === 'newTask' 
              ? 'Press Enter to create task' 
              : mode === 'tag'
              ? 'Press Enter to create tag'
              : 'No results found'}
          </Command.Empty>

          {mode === 'search' && (
            <>
              {/* Actions */}
              <Command.Group heading="Actions">
                <Command.Item
                  value="new task"
                  onSelect={() => handleSelect(() => {
                    // Will be handled by parent opening in newTask mode
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <span>New Task</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">n</span>
                </Command.Item>
                <Command.Item
                  value="new project"
                  onSelect={() => {
                    const name = prompt('Project name:');
                    if (name) {
                      addProject(name);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">📁</span>
                  <span>New Project</span>
                </Command.Item>
              </Command.Group>

              {/* Navigation */}
              <Command.Group heading="Navigation">
                <Command.Item
                  value="inbox"
                  onSelect={() => handleSelect(() => setView('inbox'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">📥</span>
                  <span>Go to Inbox</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">gi</span>
                </Command.Item>
                <Command.Item
                  value="today"
                  onSelect={() => handleSelect(() => setView('today'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">📅</span>
                  <span>Go to Today</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">gt</span>
                </Command.Item>
                <Command.Item
                  value="upcoming"
                  onSelect={() => handleSelect(() => setView('upcoming'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">📆</span>
                  <span>Go to Upcoming</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">gu</span>
                </Command.Item>
                <Command.Item
                  value="someday"
                  onSelect={() => handleSelect(() => setView('someday'))}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">💭</span>
                  <span>Go to Someday</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">gs</span>
                </Command.Item>
              </Command.Group>

              {/* Projects */}
              {projects.length > 0 && (
                <Command.Group heading="Projects">
                  {projects.map(project => (
                    <Command.Item
                      key={project.id}
                      value={`project ${project.name}`}
                      onSelect={() => handleSelect(() => setView('project', project.id))}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                    >
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: project.color }}
                      />
                      <span>{project.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Tasks */}
              {tasks.filter(t => !t.completed).length > 0 && (
                <Command.Group heading="Tasks">
                  {tasks.filter(t => !t.completed).map(task => (
                    <Command.Item
                      key={task.id}
                      value={`task ${task.title}`}
                      onSelect={() => handleSelect(() => {
                        if (task.projectId) {
                          setView('project', task.projectId);
                        } else {
                          setView('inbox');
                        }
                        selectTask(task.id);
                      })}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                    >
                      <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      <span className="truncate">{task.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}

          {mode === 'move' && (
            <>
              <Command.Item
                value="inbox"
                onSelect={() => handleSelect(() => {
                  if (selectedTaskId) moveTask(selectedTaskId, null);
                })}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
              >
                <span className="text-lg">📥</span>
                <span>Inbox</span>
              </Command.Item>
              {projects.map(project => (
                <Command.Item
                  key={project.id}
                  value={project.name}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) moveTask(selectedTaskId, project.id);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                </Command.Item>
              ))}
              {inputValue && !projects.some(p => p.name.toLowerCase() === inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    addProject(inputValue);
                    // Move task to the new project - need to do this after project is created
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <span>Create "{inputValue}"</span>
                </Command.Item>
              )}
            </>
          )}

          {mode === 'tag' && (
            <>
              {tags.map(tag => {
                const isOnTask = selectedTask?.tags.includes(tag);
                return (
                  <Command.Item
                    key={tag}
                    value={tag}
                    onSelect={() => handleSelect(() => {
                      if (selectedTaskId) {
                        if (isOnTask) {
                          removeTagFromTask(selectedTaskId, tag);
                        } else {
                          addTagToTask(selectedTaskId, tag);
                        }
                      }
                    })}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                  >
                    <span className="text-gray-400">#</span>
                    <span className="flex-1">{tag}</span>
                    {isOnTask && (
                      <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </Command.Item>
                );
              })}
              {inputValue && !tags.includes(inputValue.toLowerCase()) && (
                <Command.Item
                  value={`create tag ${inputValue}`}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) addTagToTask(selectedTaskId, inputValue);
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <span>Create tag "#{inputValue}"</span>
                </Command.Item>
              )}
            </>
          )}

          {mode === 'newTask' && (
            <>
              {/* Show tag suggestions when typing # */}
              {isTypingTag && filteredTags.length > 0 && (
                <Command.Group heading="Tags">
                  {filteredTags.slice(0, 6).map(tag => (
                    <Command.Item
                      key={tag}
                      value={`tag-${tag}`}
                      onSelect={() => insertTag(tag)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                    >
                      <span className="text-gray-400">#</span>
                      <span>{tag}</span>
                      <span className="ml-auto text-xs text-gray-400">Tab</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              
              {/* Show create new tag option if typing # with no matches */}
              {isTypingTag && tagQuery && !tags.includes(tagQuery) && (
                <Command.Item
                  value={`create-tag-${tagQuery}`}
                  onSelect={() => insertTag(tagQuery)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <span>Create tag "#{tagQuery}"</span>
                </Command.Item>
              )}
              
              {/* Show task preview with parsed tags and date */}
              {inputValue && !isTypingTag && (
                <Command.Item
                  value={inputValue}
                  onSelect={createTaskWithTags}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  <span className="text-lg">+</span>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>Create "{cleanTitle || 'Untitled'}"</span>
                      {parsedTags.map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    {(parsedDate?.scheduledDate || parsedDeadline) && (
                      <div className="flex items-center gap-3 text-xs">
                        {parsedDate?.scheduledDate && (
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{format(parsedDate.scheduledDate, 'EEE, MMM d')}</span>
                          </div>
                        )}
                        {parsedDeadline && (
                          <div className="flex items-center gap-1.5 text-orange-500">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                            <span>Due {format(parsedDeadline, 'EEE, MMM d')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-gray-400">↵</span>
                </Command.Item>
              )}
              
              {/* Hint when input is empty */}
              {!inputValue && (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  Type task name, use <span className="font-mono bg-gray-100 px-1 rounded">#</span> for tags
                  <br />
                  <span className="text-xs text-gray-400">
                    Schedule: "tomorrow", "mon" | Deadline: <span className="font-mono">d/mon</span>, <span className="font-mono">d/23jun</span>
                  </span>
                </div>
              )}
            </>
          )}

          {mode === 'schedule' && (
            <>
              {selectedTask && (
                <div className="px-3 py-2 mb-2 text-sm text-gray-600 border-b border-gray-100">
                  Scheduling: <span className="font-medium">{selectedTask.title}</span>
                  {selectedTask.scheduledDate && (
                    <span className="ml-2 text-gray-400">
                      (currently: {format(selectedTask.scheduledDate, 'MMM d')})
                    </span>
                  )}
                </div>
              )}
              
              {/* Dynamic date suggestions */}
              {getDateSuggestions(inputValue).map(suggestion => (
                <Command.Item
                  key={suggestion.id}
                  value={`${suggestion.label} ${suggestion.description}`}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) {
                      if (suggestion.isSomeday) {
                        setSomeday(selectedTaskId, true);
                      } else {
                        setTaskDate(selectedTaskId, suggestion.date);
                      }
                    }
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  {suggestion.icon === 'sun' && (
                    <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                    </svg>
                  )}
                  {suggestion.icon === 'calendar' && (
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {suggestion.icon === 'week' && (
                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {suggestion.icon === 'clear' && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  {suggestion.icon === 'someday' && (
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  <span className="flex-1">{suggestion.label}</span>
                  <span className="text-xs text-gray-400">{suggestion.description}</span>
                </Command.Item>
              ))}
              
              {/* Show "no results" hint when query doesn't match */}
              {inputValue && getDateSuggestions(inputValue).length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No matching dates. Try "today", "tomorrow", or a day name like "mon"
                </div>
              )}
              
              <Command.Group heading="Pick a Date">
                <div className="px-3 py-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value && selectedTaskId) {
                        const date = new Date(e.target.value + 'T00:00:00');
                        setTaskDate(selectedTaskId, date);
                        onClose();
                      }
                    }}
                  />
                </div>
              </Command.Group>
            </>
          )}

          {mode === 'deadline' && (
            <>
              {selectedTask && (
                <div className="px-3 py-2 mb-2 text-sm text-gray-600 border-b border-gray-100">
                  Setting deadline for: <span className="font-medium">{selectedTask.title}</span>
                  {selectedTask.deadline && (
                    <span className="ml-2 text-gray-400">
                      (currently due: {format(selectedTask.deadline, 'MMM d')})
                    </span>
                  )}
                </div>
              )}
              
              {/* Dynamic date suggestions for deadline */}
              {getDateSuggestions(inputValue).filter(s => !s.isSomeday).map(suggestion => (
                <Command.Item
                  key={suggestion.id}
                  value={`${suggestion.label} ${suggestion.description}`}
                  onSelect={() => handleSelect(() => {
                    if (selectedTaskId) {
                      setDeadline(selectedTaskId, suggestion.date);
                    }
                  })}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer data-[selected=true]:bg-blue-50"
                >
                  {suggestion.icon === 'sun' && (
                    <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  )}
                  {(suggestion.icon === 'calendar' || suggestion.icon === 'week') && (
                    <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                    </svg>
                  )}
                  {suggestion.icon === 'clear' && (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className="flex-1">
                    {suggestion.icon === 'clear' ? 'No Deadline' : `Due ${suggestion.label}`}
                  </span>
                  <span className="text-xs text-gray-400">{suggestion.description}</span>
                </Command.Item>
              ))}
              
              {/* Show "no results" hint when query doesn't match */}
              {inputValue && getDateSuggestions(inputValue).filter(s => !s.isSomeday).length === 0 && (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No matching dates. Try "today", "tomorrow", or a day name like "mon"
                </div>
              )}
              
              <Command.Group heading="Pick a Deadline">
                <div className="px-3 py-2">
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      if (e.target.value && selectedTaskId) {
                        const date = new Date(e.target.value + 'T00:00:00');
                        setDeadline(selectedTaskId, date);
                        onClose();
                      }
                    }}
                  />
                </div>
              </Command.Group>
            </>
          )}
        </Command.List>
        
        <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </Command>
    </div>
  );
}
