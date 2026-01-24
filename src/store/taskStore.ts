import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { isSameDay, startOfDay, addDays, addWeeks, addMonths, addYears, getDay } from 'date-fns';
import type { Task, Project, View, Recurrence, Area, XpEvent, UserProgress } from '../types';

// XP per level - constant progression
const XP_PER_LEVEL = 500;

// Calculate level from total XP
function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / XP_PER_LEVEL) + 1;
}

// Get XP required for a specific level
function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * XP_PER_LEVEL;
}

// Grace period before decay starts (in days)
const DECAY_GRACE_PERIOD = 14;

// Calculate decay multiplier for a task (1.0 = full XP, 0.25 = minimum)
function getDecayMultiplier(task: Task): number {
  // No decay for completed, someday, or scheduled tasks
  if (task.completed || task.someday || task.scheduledDate) return 1;
  
  const now = new Date();
  const createdAt = new Date(task.createdAt);
  const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  // Grace period: no decay for first 14 days
  if (daysSinceCreation <= DECAY_GRACE_PERIOD) return 1;
  
  // Days into decay period
  const decayDays = daysSinceCreation - DECAY_GRACE_PERIOD;
  
  // Exponential decay: starts at 100%, approaches 25% minimum
  // Formula: 0.25 + 0.75 * e^(-0.046 * days)
  // This gives: Day 0=100%, Day 3=~85%, Day 7=~60%, Day 14=~40%, Day 30=~25%
  const decay = 0.25 + 0.75 * Math.exp(-0.046 * decayDays);
  
  return Math.max(0.25, Math.min(1, decay));
}

// Get effective XP for a task based on its tags, decay, and boss project status
function getEffectiveXp(task: Task, projects?: Project[]): number {
  // 0 XP for overdue tasks (past scheduled date) or past deadline
  if (!task.completed) {
    const today = startOfDay(new Date());
    if (task.scheduledDate && startOfDay(new Date(task.scheduledDate)) < today) {
      return 0;
    }
    if (task.deadline && startOfDay(new Date(task.deadline)) < today) {
      return 0;
    }
  }
  
  // Determine base XP from tags
  let baseXp = 5;
  if (task.tags.includes('hard')) baseXp = 15;
  else if (task.tags.includes('mid')) baseXp = 10;
  else baseXp = task.xp ?? 5;
  
  // Apply decay multiplier
  const decayMultiplier = getDecayMultiplier(task);
  
  // Apply boss project multiplier (2x XP for boss projects)
  let bossMultiplier = 1;
  if (task.projectId && projects) {
    const project = projects.find(p => p.id === task.projectId);
    if (project?.boss) bossMultiplier = 2;
  }
  
  return Math.round(baseXp * decayMultiplier * bossMultiplier);
}

// Helper to calculate next occurrence for recurring tasks
function getNextOccurrence(fromDate: Date, recurrence: Recurrence): Date {
  const date = startOfDay(fromDate);
  
  switch (recurrence.type) {
    case 'daily':
      return addDays(date, recurrence.interval);
      
    case 'weekly':
      if (recurrence.weekdays && recurrence.weekdays.length > 0) {
        // Find next matching weekday
        const currentDay = getDay(date);
        const sortedWeekdays = [...recurrence.weekdays].sort((a, b) => a - b);
        
        // Look for the next weekday in the current week
        for (const wd of sortedWeekdays) {
          if (wd > currentDay) {
            return addDays(date, wd - currentDay);
          }
        }
        
        // If no weekday found in current week, go to first weekday of next interval
        const daysUntilNextWeek = 7 - currentDay + sortedWeekdays[0];
        const weeksToAdd = recurrence.interval - 1;
        return addDays(date, daysUntilNextWeek + (weeksToAdd * 7));
      }
      return addWeeks(date, recurrence.interval);
      
    case 'monthly':
      return addMonths(date, recurrence.interval);
      
    case 'yearly':
      return addYears(date, recurrence.interval);
      
    default:
      return addDays(date, 1);
  }
}

// Type for grouped tasks by project
export interface ProjectTaskGroup {
  projectId: string | null;
  projectName: string;
  color: string | null;
  tasks: Task[];
}

// Type for upcoming view with overdue section
export interface UpcomingData {
  overdueTasks: Task[];
  pastDeadlineTasks: Task[];
  upcomingGroups: ProjectTaskGroup[];
}

const API_URL = 'http://localhost:3001/api';

type Theme = 'light' | 'dark' | 'system';

interface TaskStore {
  // State
  tasks: Task[];
  projects: Project[];
  areas: Area[];
  tags: string[];
  userProgress: UserProgress;
  currentView: View;
  currentProjectId: string | null;
  currentTagId: string | null;
  currentAreaId: string | null;
  selectedTaskId: string | null;
  selectedTaskIds: string[];  // Multi-select support
  lastSelectedTaskId: string | null;  // Anchor for shift-click range selection
  editingTaskId: string | null;
  editingProjectId: string | null;
  isLoading: boolean;
  theme: Theme;
  
  // Data persistence
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  
  // Task actions
  addTask: (title: string, projectId?: string | null, tags?: string[], scheduledDate?: Date | null, deadline?: Date | null, areaId?: string | null, url?: string | null) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  toggleTask: (id: string) => void;
  moveTask: (id: string, projectId: string | null) => void;
  setTaskArea: (taskId: string, areaId: string | null) => void;
  setTaskDate: (taskId: string, date: Date | null) => void;
  setDeadline: (taskId: string, date: Date | null) => void;
  setSomeday: (taskId: string, someday: boolean) => void;
  setRecurrence: (taskId: string, recurrence: Recurrence | null) => void;
  addTagToTask: (taskId: string, tag: string) => void;
  removeTagFromTask: (taskId: string, tag: string) => void;
  
  // Timer actions
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;
  resetTimer: (taskId: string) => void;
  
  // Reorder actions
  reorderTasks: (activeId: string, overId: string) => void;
  
  // Project actions
  addProject: (name: string, color?: string, areaId?: string | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setProjectArea: (projectId: string, areaId: string | null) => void;
  toggleProjectBoss: (projectId: string) => void;
  
  // Area actions
  addArea: (name: string) => void;
  updateArea: (id: string, updates: Partial<Area>) => void;
  deleteArea: (id: string) => void;
  
  // Navigation
  setView: (view: View, projectId?: string | null, tagId?: string | null, areaId?: string | null) => void;
  selectTask: (id: string | null) => void;
  selectNextTask: () => void;
  selectPrevTask: () => void;
  extendSelectionDown: () => void;  // Shift+ArrowDown
  extendSelectionUp: () => void;    // Shift+ArrowUp
  setEditingTask: (id: string | null) => void;
  setEditingProject: (id: string | null) => void;
  
  // Multi-select actions
  toggleTaskSelection: (id: string, shiftKey: boolean, metaKey: boolean, visibleTaskIds: string[]) => void;
  clearSelection: () => void;
  selectAllTasks: (taskIds: string[]) => void;
  
  // Bulk actions
  bulkMoveToProject: (projectId: string | null) => void;
  bulkMoveToArea: (areaId: string | null) => void;
  bulkAddTag: (tag: string) => void;
  bulkRemoveTag: (tag: string) => void;
  bulkSetDeadline: (date: Date | null) => void;
  bulkSetSchedule: (date: Date | null) => void;
  bulkSetSomeday: (someday: boolean) => void;
  bulkDelete: () => void;
  
  // Computed
  getVisibleTasks: () => Task[];
  getUpcomingTasksByProject: () => ProjectTaskGroup[];
  getUpcomingTasksWithOverdue: () => UpcomingData;
  getTaskById: (id: string) => Task | undefined;
  getProjectById: (id: string) => Project | undefined;
  getAreaById: (id: string) => Area | undefined;
  getTaskDecayInfo: (taskId: string) => { 
    isDecaying: boolean; 
    multiplier: number; 
    daysUntilDecay: number | null;
    effectiveXp: number;
    baseXp: number;
  } | null;
  
  // Theme
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  
  // XP actions
  awardXp: (taskId: string, taskTitle: string, xp: number) => void;
  revokeXp: (taskId: string, taskTitle: string, xp: number) => void;
  getXpToNextLevel: () => { current: number; required: number; progress: number };
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
];

export const useTaskStore = create<TaskStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state (empty until loaded from API)
    tasks: [],
    projects: [],
    areas: [],
    tags: [],
    userProgress: { totalXp: 0, level: 1, xpHistory: [] },
    currentView: 'inbox',
    currentProjectId: null,
    currentTagId: null,
    currentAreaId: null,
    selectedTaskId: null,
    selectedTaskIds: [],  // Multi-select support
    lastSelectedTaskId: null,  // Anchor for shift-click range selection
    editingTaskId: null,
    editingProjectId: null,
    isLoading: true,
    theme: (localStorage.getItem('theme') as Theme) || 'system',
    
    // Load data from API
    loadData: async () => {
      try {
        set({ isLoading: true });
        const response = await fetch(`${API_URL}/data`);
        const data = await response.json();
        
        // Convert date strings to Date objects and ensure fields exist
        // Migrate existing tasks: add xp field with default value of 5, order field
        const tasks = data.tasks.map((t: Task, index: number) => {
          const task = {
            ...t,
            createdAt: new Date(t.createdAt),
            scheduledDate: t.scheduledDate ? new Date(t.scheduledDate) : null,
            deadline: t.deadline ? new Date(t.deadline) : null,
            someday: t.someday ?? false,
            recurrence: t.recurrence ?? null,
            areaId: t.areaId ?? null,
            timeSpent: t.timeSpent ?? 0,
            timerStartedAt: t.timerStartedAt ? new Date(t.timerStartedAt) : null,
            completedAt: t.completedAt ? new Date(t.completedAt) : null,
            url: t.url ?? null,
            xp: t.xp ?? 5, // Default XP for existing tasks
            order: t.order ?? index, // Default order based on array position
          };
          
          // Auto-add/remove decay tag based on decay state
          const isDecaying = getDecayMultiplier(task) < 1;
          const hasDecayTag = task.tags.includes('decay');
          
          if (isDecaying && !hasDecayTag) {
            task.tags = [...task.tags, 'decay'];
          } else if (!isDecaying && hasDecayTag) {
            task.tags = task.tags.filter((tag: string) => tag !== 'decay');
          }
          
          return task;
        });
        
        // Ensure projects have areaId, boss, and bossCard fields
        const projects = (data.projects || []).map((p: Project) => ({
          ...p,
          areaId: p.areaId ?? null,
          boss: p.boss ?? false,
          bossCard: p.bossCard, // optional, only set when defined
        }));
        
        // Load userProgress with migration for existing data
        const userProgress: UserProgress = data.userProgress ?? { totalXp: 0, level: 1, xpHistory: [] };
        // Convert date strings in xpHistory
        if (userProgress.xpHistory) {
          userProgress.xpHistory = userProgress.xpHistory.map((event: XpEvent) => ({
            ...event,
            timestamp: new Date(event.timestamp),
          }));
        }
        // Recalculate level to ensure consistency
        userProgress.level = calculateLevel(userProgress.totalXp);
        
        // Ensure 'decay' tag exists in global tags if any task is decaying
        let globalTags = data.tags || [];
        const hasDecayingTasks = tasks.some((t: Task) => t.tags.includes('decay'));
        if (hasDecayingTasks && !globalTags.includes('decay')) {
          globalTags = [...globalTags, 'decay'];
        }
        
        set({ 
          tasks, 
          projects,
          areas: data.areas || [],
          tags: globalTags,
          userProgress,
          isLoading: false 
        });
      } catch (error) {
        console.error('Failed to load data:', error);
        set({ isLoading: false });
      }
    },
    
    // Save data to API
    saveData: async () => {
      try {
        const { tasks, projects, areas, tags, userProgress } = get();
        await fetch(`${API_URL}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, projects, areas, tags, userProgress }),
        });
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    },
    
    // Task actions
    addTask: (title, projectId = null, taskTags = [], scheduledDate = null, deadline = null, areaId = null, url = null) => {
      // Normalize tags and add any new ones to the global tags list
      const normalizedTags = taskTags.map(t => t.toLowerCase().trim());
      const currentTags = get().tags;
      
      // Determine areaId: use passed areaId, or if in area view and no project, use current area
      const state = get();
      let taskAreaId: string | null = areaId;
      if (!taskAreaId && state.currentView === 'area' && !projectId) {
        taskAreaId = state.currentAreaId;
      }
      
      // Determine the actual project ID
      const actualProjectId = projectId ?? (state.currentView === 'project' ? state.currentProjectId : null);
      
      // Check if the project is a boss project and auto-add boss tag
      const finalTags = [...normalizedTags];
      let newGlobalTags = normalizedTags.filter(t => !currentTags.includes(t));
      
      if (actualProjectId) {
        const project = state.projects.find(p => p.id === actualProjectId);
        if (project?.boss && !finalTags.includes('boss')) {
          finalTags.push('boss');
          // Ensure 'boss' is in global tags
          if (!currentTags.includes('boss') && !newGlobalTags.includes('boss')) {
            newGlobalTags.push('boss');
          }
        }
      }
      
      // Determine XP based on difficulty tags: hard=15, mid=10, default=5
      let taskXp = 5;
      if (finalTags.includes('hard')) taskXp = 15;
      else if (finalTags.includes('mid')) taskXp = 10;
      
      // New tasks get the lowest order (appear at top)
      const minOrder = Math.min(0, ...state.tasks.map(t => t.order));
      
      const newTask: Task = {
        id: generateId(),
        title,
        completed: false,
        completedAt: null,
        projectId: actualProjectId,
        areaId: taskAreaId,
        tags: finalTags,
        createdAt: new Date(),
        scheduledDate,
        deadline,
        someday: false,
        recurrence: null,
        timeSpent: 0,
        timerStartedAt: null,
        url,
        xp: taskXp,
        order: minOrder - 1,
      };
      set(state => ({ 
        tasks: [...state.tasks, newTask],
        tags: newGlobalTags.length > 0 ? [...state.tags, ...newGlobalTags] : state.tags,
      }));
    },
    
    updateTask: (id, updates) => {
      set(state => ({
        tasks: state.tasks.map(task => 
          task.id === id ? { ...task, ...updates } : task
        ),
      }));
    },
    
    deleteTask: (id) => {
      set(state => {
        const visibleTasks = get().getVisibleTasks();
        const visibleIndex = visibleTasks.findIndex(t => t.id === id);
        
        // Select next task if we're deleting the selected one
        let newSelectedId = state.selectedTaskId;
        if (state.selectedTaskId === id) {
          if (visibleIndex < visibleTasks.length - 1) {
            newSelectedId = visibleTasks[visibleIndex + 1]?.id ?? null;
          } else if (visibleIndex > 0) {
            newSelectedId = visibleTasks[visibleIndex - 1]?.id ?? null;
          } else {
            newSelectedId = null;
          }
        }
        
        return {
          tasks: state.tasks.filter(task => task.id !== id),
          selectedTaskId: newSelectedId,
        };
      });
    },
    
    duplicateTask: (id) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) return;
      
      // Get order for new task (place right after original)
      const newOrder = task.order + 0.001;
      
      const newTask: Task = {
        ...task,
        id: generateId(),
        completed: false,
        completedAt: null,
        createdAt: new Date(),
        timeSpent: 0,
        timerStartedAt: null,
        order: newOrder,
      };
      
      set(state => ({
        tasks: [...state.tasks, newTask],
        selectedTaskId: newTask.id, // Select the new duplicate
      }));
    },
    
    toggleTask: (id) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) return;
      
      const isCompleting = !task.completed;
      const taskXp = getEffectiveXp(task, get().projects); // XP based on tags and boss project status
      
      // Handle recurring tasks: when completing, create a new instance
      if (isCompleting && task.recurrence) {
        // Use task's scheduled date or today as base for calculating next occurrence
        const baseDate = task.scheduledDate || startOfDay(new Date());
        const nextDate = getNextOccurrence(baseDate, task.recurrence);
        // New recurring instance keeps the same order as the original task
        const newTask: Task = {
          ...task,
          id: generateId(),
          completed: false,
          completedAt: null,
          scheduledDate: nextDate,
          createdAt: new Date(),
          timeSpent: 0,
          timerStartedAt: null,
          order: task.order,
        };
        
        set(state => ({
          tasks: [
            ...state.tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: new Date() } : t),
            newTask
          ],
        }));
        
        // Award XP for completing recurring task
        get().awardXp(id, task.title, taskXp);
        return;
      }
      
      // Normal toggle for non-recurring tasks or uncompleting
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === id ? { 
            ...t, 
            completed: !t.completed,
            completedAt: !t.completed ? new Date() : null // Set when completing, clear when uncompleting
          } : t
        ),
      }));
      
      // Award or revoke XP based on completion state
      if (isCompleting) {
        get().awardXp(id, task.title, taskXp);
      } else {
        get().revokeXp(id, task.title, taskXp);
      }
    },
    
    moveTask: (id, projectId) => {
      set(state => {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return state;
        
        // Check if destination project is a boss project
        const destProject = projectId ? state.projects.find(p => p.id === projectId) : null;
        const isDestBoss = destProject?.boss ?? false;
        
        // Check if source project was a boss project
        const srcProject = task.projectId ? state.projects.find(p => p.id === task.projectId) : null;
        const wasSrcBoss = srcProject?.boss ?? false;
        
        // Determine new tags: add or remove 'boss' tag based on destination
        let newTags = task.tags;
        if (isDestBoss && !task.tags.includes('boss')) {
          newTags = [...task.tags, 'boss'];
        } else if (!isDestBoss && wasSrcBoss && task.tags.includes('boss')) {
          newTags = task.tags.filter(t => t !== 'boss');
        }
        
        // Ensure 'boss' exists in global tags if needed
        let globalTags = state.tags;
        if (isDestBoss && !state.tags.includes('boss')) {
          globalTags = [...state.tags, 'boss'];
        }
        
        return {
          tasks: state.tasks.map(t =>
            t.id === id ? { ...t, projectId, areaId: null, tags: newTags } : t
          ),
          tags: globalTags,
        };
      });
    },
    
    setTaskArea: (taskId, areaId) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId
            ? { ...task, areaId, projectId: null }  // Clear project when moving to area
            : task
        ),
      }));
    },
    
    setTaskDate: (taskId, date) => {
      set(state => ({
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task;
          // Remove decay tag if scheduling (stops decay)
          const tags = date ? task.tags.filter(t => t !== 'decay') : task.tags;
          return { ...task, scheduledDate: date, someday: date ? false : task.someday, tags };
        }),
      }));
    },
    
    setDeadline: (taskId, date) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, deadline: date } : task
        ),
      }));
    },
    
    setSomeday: (taskId, someday) => {
      set(state => ({
        tasks: state.tasks.map(task => {
          if (task.id !== taskId) return task;
          // Remove decay tag if marking as someday (stops decay)
          const tags = someday ? task.tags.filter(t => t !== 'decay') : task.tags;
          return { ...task, someday, scheduledDate: someday ? null : task.scheduledDate, tags };
        }),
      }));
    },
    
    setRecurrence: (taskId, recurrence) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? { 
            ...task, 
            recurrence,
            // Auto-schedule to today if adding recurrence and not scheduled
            scheduledDate: recurrence && !task.scheduledDate ? startOfDay(new Date()) : task.scheduledDate,
            someday: recurrence ? false : task.someday // Clear someday if recurring
          } : task
        ),
      }));
    },
    
    addTagToTask: (taskId, tag) => {
      const normalizedTag = tag.toLowerCase().trim();
      set(state => {
        const newTags = state.tags.includes(normalizedTag) 
          ? state.tags 
          : [...state.tags, normalizedTag];
        
        return {
          tags: newTags,
          tasks: state.tasks.map(task =>
            task.id === taskId && !task.tags.includes(normalizedTag)
              ? { ...task, tags: [...task.tags, normalizedTag] }
              : task
          ),
        };
      });
    },
    
    removeTagFromTask: (taskId, tag) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId
            ? { ...task, tags: task.tags.filter(t => t !== tag) }
            : task
        ),
      }));
    },
    
    // Timer actions
    startTimer: (taskId) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId && !task.timerStartedAt
            ? { ...task, timerStartedAt: new Date() }
            : task
        ),
      }));
    },
    
    stopTimer: (taskId) => {
      set(state => ({
        tasks: state.tasks.map(task => {
          if (task.id !== taskId || !task.timerStartedAt) return task;
          
          const elapsed = Date.now() - task.timerStartedAt.getTime();
          return {
            ...task,
            timeSpent: task.timeSpent + elapsed,
            timerStartedAt: null,
          };
        }),
      }));
    },
    
    resetTimer: (taskId) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId
            ? { ...task, timeSpent: 0, timerStartedAt: null }
            : task
        ),
      }));
    },
    
    // Reorder tasks after drag and drop
    reorderTasks: (activeId, overId) => {
      if (activeId === overId) return;
      
      const visibleTasks = get().getVisibleTasks();
      const activeIndex = visibleTasks.findIndex(t => t.id === activeId);
      const overIndex = visibleTasks.findIndex(t => t.id === overId);
      
      if (activeIndex === -1 || overIndex === -1) return;
      
      // Calculate new order value for the moved task
      // It should be between the order values of its new neighbors
      let newOrder: number;
      
      if (overIndex === 0) {
        // Moving to the top: new order is less than the first item
        newOrder = visibleTasks[0].order - 1;
      } else if (overIndex === visibleTasks.length - 1) {
        // Moving to the bottom: new order is greater than the last item
        newOrder = visibleTasks[visibleTasks.length - 1].order + 1;
      } else if (activeIndex < overIndex) {
        // Moving down: place between overIndex and overIndex + 1
        const before = visibleTasks[overIndex].order;
        const after = visibleTasks[overIndex + 1]?.order ?? before + 2;
        newOrder = (before + after) / 2;
      } else {
        // Moving up: place between overIndex - 1 and overIndex
        const before = visibleTasks[overIndex - 1]?.order ?? visibleTasks[overIndex].order - 2;
        const after = visibleTasks[overIndex].order;
        newOrder = (before + after) / 2;
      }
      
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === activeId ? { ...task, order: newOrder } : task
        ),
      }));
    },
    
    // Project actions
    addProject: (name, color, areaId = null) => {
      // If in area view, default to current area
      const effectiveAreaId = areaId ?? (get().currentView === 'area' ? get().currentAreaId : null);
      const newProject: Project = {
        id: generateId(),
        name,
        color: color ?? PROJECT_COLORS[get().projects.length % PROJECT_COLORS.length],
        areaId: effectiveAreaId,
        boss: false,
      };
      set(state => ({ projects: [...state.projects, newProject] }));
    },
    
    updateProject: (id, updates) => {
      set(state => ({
        projects: state.projects.map(project =>
          project.id === id ? { ...project, ...updates } : project
        ),
      }));
    },
    
    deleteProject: (id) => {
      set(state => ({
        projects: state.projects.filter(project => project.id !== id),
        // Move tasks from deleted project to inbox
        tasks: state.tasks.map(task =>
          task.projectId === id ? { ...task, projectId: null } : task
        ),
        // Navigate away if viewing deleted project
        currentView: state.currentProjectId === id ? 'inbox' : state.currentView,
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      }));
    },
    
    setProjectArea: (projectId, areaId) => {
      set(state => ({
        projects: state.projects.map(project =>
          project.id === projectId ? { ...project, areaId } : project
        ),
      }));
    },
    
    toggleProjectBoss: (projectId) => {
      set(state => {
        const project = state.projects.find(p => p.id === projectId);
        if (!project) return state;
        
        const newBossStatus = !project.boss;
        
        // Ensure 'boss' tag exists in global tags if enabling boss mode
        let newTags = state.tags;
        if (newBossStatus && !state.tags.includes('boss')) {
          newTags = [...state.tags, 'boss'];
        }
        
        // Update all tasks in this project: add or remove 'boss' tag
        const updatedTasks = state.tasks.map(task => {
          if (task.projectId !== projectId) return task;
          
          if (newBossStatus) {
            // Add 'boss' tag if not present
            return task.tags.includes('boss') 
              ? task 
              : { ...task, tags: [...task.tags, 'boss'] };
          } else {
            // Remove 'boss' tag
            return task.tags.includes('boss')
              ? { ...task, tags: task.tags.filter(t => t !== 'boss') }
              : task;
          }
        });
        
        return {
          projects: state.projects.map(p =>
            p.id === projectId ? { ...p, boss: newBossStatus } : p
          ),
          tasks: updatedTasks,
          tags: newTags,
        };
      });
    },
    
    // Area actions
    addArea: (name) => {
      const newArea: Area = {
        id: generateId(),
        name,
      };
      set(state => ({ areas: [...state.areas, newArea] }));
    },
    
    updateArea: (id, updates) => {
      set(state => ({
        areas: state.areas.map(area =>
          area.id === id ? { ...area, ...updates } : area
        ),
      }));
    },
    
    deleteArea: (id) => {
      set(state => ({
        areas: state.areas.filter(area => area.id !== id),
        // Remove area from projects
        projects: state.projects.map(project =>
          project.areaId === id ? { ...project, areaId: null } : project
        ),
        // Remove area from tasks
        tasks: state.tasks.map(task =>
          task.areaId === id ? { ...task, areaId: null } : task
        ),
        // Navigate away if viewing deleted area
        currentView: state.currentAreaId === id ? 'inbox' : state.currentView,
        currentAreaId: state.currentAreaId === id ? null : state.currentAreaId,
      }));
    },
    
    // Navigation
    setView: (view, projectId = null, tagId = null, areaId = null) => {
      set({ 
        currentView: view, 
        currentProjectId: view === 'project' ? projectId : null,
        currentTagId: view === 'tag' ? tagId : null,
        currentAreaId: view === 'area' ? areaId : null,
        selectedTaskId: null,
        selectedTaskIds: [],  // Clear multi-selection on view change
        lastSelectedTaskId: null,
      });
    },
    
    selectTask: (id) => {
      set({ selectedTaskId: id });
    },
    
    selectNextTask: () => {
      const visibleTasks = get().getVisibleTasks();
      const currentIndex = visibleTasks.findIndex(t => t.id === get().selectedTaskId);
      
      if (visibleTasks.length === 0) return;
      
      const newId = (currentIndex === -1 || currentIndex === visibleTasks.length - 1)
        ? visibleTasks[0].id
        : visibleTasks[currentIndex + 1].id;
      
      set({ 
        selectedTaskId: newId,
        selectedTaskIds: [newId],
        lastSelectedTaskId: newId,
      });
    },
    
    selectPrevTask: () => {
      const visibleTasks = get().getVisibleTasks();
      const currentIndex = visibleTasks.findIndex(t => t.id === get().selectedTaskId);
      
      if (visibleTasks.length === 0) return;
      
      const newId = (currentIndex === -1 || currentIndex === 0)
        ? visibleTasks[visibleTasks.length - 1].id
        : visibleTasks[currentIndex - 1].id;
      
      set({ 
        selectedTaskId: newId,
        selectedTaskIds: [newId],
        lastSelectedTaskId: newId,
      });
    },
    
    // Shift+ArrowDown: extend or contract selection downward
    extendSelectionDown: () => {
      const visibleTasks = get().getVisibleTasks();
      const { selectedTaskId, selectedTaskIds, lastSelectedTaskId } = get();
      
      if (visibleTasks.length === 0) return;
      
      const visibleTaskIds = visibleTasks.map(t => t.id);
      
      // The anchor is where shift-selection started (lastSelectedTaskId)
      // The cursor is the current position (selectedTaskId)
      const anchorId = lastSelectedTaskId || selectedTaskId;
      const cursorId = selectedTaskId;
      
      const anchorIndex = anchorId ? visibleTaskIds.indexOf(anchorId) : -1;
      const cursorIndex = cursorId ? visibleTaskIds.indexOf(cursorId) : -1;
      
      // If nothing selected, select the first task
      if (cursorIndex === -1) {
        const firstId = visibleTaskIds[0];
        set({ 
          selectedTaskId: firstId, 
          selectedTaskIds: [firstId],
          lastSelectedTaskId: firstId,
        });
        return;
      }
      
      // If at the end, do nothing
      if (cursorIndex >= visibleTasks.length - 1) return;
      
      const newCursorIndex = cursorIndex + 1;
      const newCursorId = visibleTaskIds[newCursorIndex];
      
      // Determine if we're expanding or contracting
      // If cursor is above anchor and moving down -> contracting (deselect current cursor)
      // If cursor is at or below anchor and moving down -> expanding (add new task)
      
      if (anchorIndex !== -1 && cursorIndex < anchorIndex) {
        // Cursor is above anchor, moving down = contracting
        // Remove the current cursor from selection
        const newSelection = selectedTaskIds.filter(id => id !== cursorId);
        
        // Ensure anchor stays selected
        if (!newSelection.includes(anchorId!)) {
          newSelection.push(anchorId!);
        }
        
        set({
          selectedTaskId: newCursorId,
          selectedTaskIds: newSelection.length > 0 ? newSelection : [newCursorId],
          lastSelectedTaskId: anchorId,
        });
      } else {
        // Cursor is at or below anchor, moving down = expanding
        // Add the new task to selection
        const newSelection = new Set(selectedTaskIds);
        newSelection.add(newCursorId);
        
        // Ensure anchor stays selected
        if (anchorId && !newSelection.has(anchorId)) {
          newSelection.add(anchorId);
        }
        
        set({
          selectedTaskId: newCursorId,
          selectedTaskIds: Array.from(newSelection),
          lastSelectedTaskId: anchorId || cursorId,
        });
      }
    },
    
    // Shift+ArrowUp: extend or contract selection upward
    extendSelectionUp: () => {
      const visibleTasks = get().getVisibleTasks();
      const { selectedTaskId, selectedTaskIds, lastSelectedTaskId } = get();
      
      if (visibleTasks.length === 0) return;
      
      const visibleTaskIds = visibleTasks.map(t => t.id);
      
      // The anchor is where shift-selection started (lastSelectedTaskId)
      // The cursor is the current position (selectedTaskId)
      const anchorId = lastSelectedTaskId || selectedTaskId;
      const cursorId = selectedTaskId;
      
      const anchorIndex = anchorId ? visibleTaskIds.indexOf(anchorId) : -1;
      const cursorIndex = cursorId ? visibleTaskIds.indexOf(cursorId) : -1;
      
      // If nothing selected, select the last task
      if (cursorIndex === -1) {
        const lastId = visibleTaskIds[visibleTaskIds.length - 1];
        set({ 
          selectedTaskId: lastId, 
          selectedTaskIds: [lastId],
          lastSelectedTaskId: lastId,
        });
        return;
      }
      
      // If at the beginning, do nothing
      if (cursorIndex <= 0) return;
      
      const newCursorIndex = cursorIndex - 1;
      const newCursorId = visibleTaskIds[newCursorIndex];
      
      // Determine if we're expanding or contracting
      // If cursor is below anchor and moving up -> contracting (deselect current cursor)
      // If cursor is at or above anchor and moving up -> expanding (add new task)
      
      if (anchorIndex !== -1 && cursorIndex > anchorIndex) {
        // Cursor is below anchor, moving up = contracting
        // Remove the current cursor from selection
        const newSelection = selectedTaskIds.filter(id => id !== cursorId);
        
        // Ensure anchor stays selected
        if (!newSelection.includes(anchorId!)) {
          newSelection.push(anchorId!);
        }
        
        set({
          selectedTaskId: newCursorId,
          selectedTaskIds: newSelection.length > 0 ? newSelection : [newCursorId],
          lastSelectedTaskId: anchorId,
        });
      } else {
        // Cursor is at or above anchor, moving up = expanding
        // Add the new task to selection
        const newSelection = new Set(selectedTaskIds);
        newSelection.add(newCursorId);
        
        // Ensure anchor stays selected
        if (anchorId && !newSelection.has(anchorId)) {
          newSelection.add(anchorId);
        }
        
        set({
          selectedTaskId: newCursorId,
          selectedTaskIds: Array.from(newSelection),
          lastSelectedTaskId: anchorId || cursorId,
        });
      }
    },
    
setEditingTask: (id) => {
      set({ editingTaskId: id });
    },
    
    setEditingProject: (id) => {
      set({ editingProjectId: id });
    },
    
    // Multi-select actions
    toggleTaskSelection: (id, shiftKey, metaKey, visibleTaskIds) => {
      set(state => {
        const currentSelection = new Set(state.selectedTaskIds);
        
        if (shiftKey && state.lastSelectedTaskId) {
          // Shift+Click: select range from lastSelectedTaskId to id
          const lastIndex = visibleTaskIds.indexOf(state.lastSelectedTaskId);
          const currentIndex = visibleTaskIds.indexOf(id);
          
          if (lastIndex !== -1 && currentIndex !== -1) {
            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);
            
            // Add all tasks in range to selection
            for (let i = start; i <= end; i++) {
              currentSelection.add(visibleTaskIds[i]);
            }
            
            return {
              selectedTaskIds: Array.from(currentSelection),
              selectedTaskId: id,
              // Keep lastSelectedTaskId as anchor
            };
          }
        }
        
        if (metaKey) {
          // Cmd/Ctrl+Click: toggle individual task in selection
          if (currentSelection.has(id)) {
            currentSelection.delete(id);
          } else {
            currentSelection.add(id);
          }
          
          return {
            selectedTaskIds: Array.from(currentSelection),
            selectedTaskId: currentSelection.size === 1 ? Array.from(currentSelection)[0] : id,
            lastSelectedTaskId: id,
          };
        }
        
        // Plain click: clear selection and select only this task
        return {
          selectedTaskIds: [id],
          selectedTaskId: id,
          lastSelectedTaskId: id,
        };
      });
    },
    
    clearSelection: () => {
      set({ selectedTaskIds: [], lastSelectedTaskId: null });
    },
    
    selectAllTasks: (taskIds) => {
      set({
        selectedTaskIds: taskIds,
        lastSelectedTaskId: taskIds.length > 0 ? taskIds[taskIds.length - 1] : null,
      });
    },
    
    // Bulk actions
    bulkMoveToProject: (projectId) => {
      const { selectedTaskIds, projects } = get();
      if (selectedTaskIds.length === 0) return;
      
      // Check if destination project is a boss project
      const destProject = projectId ? projects.find(p => p.id === projectId) : null;
      const isDestBoss = destProject?.boss ?? false;
      
      set(state => {
        let globalTags = state.tags;
        
        // Ensure 'boss' exists in global tags if needed
        if (isDestBoss && !state.tags.includes('boss')) {
          globalTags = [...state.tags, 'boss'];
        }
        
        const updatedTasks = state.tasks.map(task => {
          if (!selectedTaskIds.includes(task.id)) return task;
          
          // Check if source project was a boss project
          const srcProject = task.projectId ? state.projects.find(p => p.id === task.projectId) : null;
          const wasSrcBoss = srcProject?.boss ?? false;
          
          // Determine new tags
          let newTags = task.tags;
          if (isDestBoss && !task.tags.includes('boss')) {
            newTags = [...task.tags, 'boss'];
          } else if (!isDestBoss && wasSrcBoss && task.tags.includes('boss')) {
            newTags = task.tags.filter(t => t !== 'boss');
          }
          
          return { ...task, projectId, areaId: null, tags: newTags };
        });
        
        return {
          tasks: updatedTasks,
          tags: globalTags,
          selectedTaskIds: [],  // Clear selection after bulk action
        };
      });
    },
    
    bulkMoveToArea: (areaId) => {
      const { selectedTaskIds } = get();
      if (selectedTaskIds.length === 0) return;
      
      set(state => ({
        tasks: state.tasks.map(task =>
          selectedTaskIds.includes(task.id)
            ? { ...task, areaId, projectId: null }
            : task
        ),
        selectedTaskIds: [],  // Clear selection after bulk action
      }));
    },
    
    bulkAddTag: (tag) => {
      const { selectedTaskIds } = get();
      if (selectedTaskIds.length === 0) return;
      
      const normalizedTag = tag.toLowerCase().trim();
      
      set(state => {
        const newTags = state.tags.includes(normalizedTag)
          ? state.tags
          : [...state.tags, normalizedTag];
        
        return {
          tags: newTags,
          tasks: state.tasks.map(task =>
            selectedTaskIds.includes(task.id) && !task.tags.includes(normalizedTag)
              ? { ...task, tags: [...task.tags, normalizedTag] }
              : task
          ),
          selectedTaskIds: [],  // Clear selection after bulk action
        };
      });
    },
    
    bulkRemoveTag: (tag) => {
      const { selectedTaskIds } = get();
      if (selectedTaskIds.length === 0) return;
      
      set(state => ({
        tasks: state.tasks.map(task =>
          selectedTaskIds.includes(task.id)
            ? { ...task, tags: task.tags.filter(t => t !== tag) }
            : task
        ),
        selectedTaskIds: [],  // Clear selection after bulk action
      }));
    },
    
    bulkSetDeadline: (date) => {
      const { selectedTaskIds } = get();
      if (selectedTaskIds.length === 0) return;
      
      set(state => ({
        tasks: state.tasks.map(task =>
          selectedTaskIds.includes(task.id)
            ? { ...task, deadline: date }
            : task
        ),
        selectedTaskIds: [],  // Clear selection after bulk action
      }));
    },
    
    bulkSetSchedule: (date) => {
      const { selectedTaskIds } = get();
      if (selectedTaskIds.length === 0) return;
      
      set(state => ({
        tasks: state.tasks.map(task => {
          if (!selectedTaskIds.includes(task.id)) return task;
          // Remove decay tag if scheduling
          const tags = date ? task.tags.filter(t => t !== 'decay') : task.tags;
          return { ...task, scheduledDate: date, someday: date ? false : task.someday, tags };
        }),
        selectedTaskIds: [],  // Clear selection after bulk action
      }));
    },
    
    bulkSetSomeday: (someday) => {
      const { selectedTaskIds } = get();
      if (selectedTaskIds.length === 0) return;
      
      set(state => ({
        tasks: state.tasks.map(task => {
          if (!selectedTaskIds.includes(task.id)) return task;
          // Remove decay tag if marking as someday
          const tags = someday ? task.tags.filter(t => t !== 'decay') : task.tags;
          return { ...task, someday, scheduledDate: someday ? null : task.scheduledDate, tags };
        }),
        selectedTaskIds: [],  // Clear selection after bulk action
      }));
    },
    
    bulkDelete: () => {
      const { selectedTaskIds, selectedTaskId } = get();
      if (selectedTaskIds.length === 0) return;
      
      set(state => ({
        tasks: state.tasks.filter(task => !selectedTaskIds.includes(task.id)),
        selectedTaskIds: [],
        selectedTaskId: selectedTaskIds.includes(selectedTaskId ?? '') ? null : selectedTaskId,
      }));
    },

    // Computed
    getVisibleTasks: () => {
      const state = get();
      let tasks = state.tasks;
      
      switch (state.currentView) {
        case 'inbox':
          // Inbox: tasks without a project, not someday
          tasks = tasks.filter(t => t.projectId === null && !t.someday);
          break;
        case 'today':
          // Show tasks scheduled for today (not someday)
          const today = new Date();
          tasks = tasks.filter(t => t.scheduledDate && isSameDay(t.scheduledDate, today) && !t.someday);
          break;
        case 'upcoming':
          // Show all tasks with a scheduled date (including overdue, not someday)
          const todayStartUpcoming = startOfDay(new Date());
          tasks = tasks.filter(t => 
            t.scheduledDate && !t.someday && (t.scheduledDate >= todayStartUpcoming || !t.completed)
          );
          break;
        case 'someday':
          // Show all someday tasks
          tasks = tasks.filter(t => t.someday);
          break;
        case 'project':
          // Project view shows all tasks in project (including someday)
          tasks = tasks.filter(t => t.projectId === state.currentProjectId);
          break;
        case 'tag':
          // Tag view shows all tasks with the selected tag
          tasks = tasks.filter(t => state.currentTagId && t.tags.includes(state.currentTagId));
          break;
        case 'area':
          // Area view: tasks directly in area + tasks in projects belonging to area
          const areaProjects = state.projects.filter(p => p.areaId === state.currentAreaId);
          const projectIds = areaProjects.map(p => p.id);
          tasks = tasks.filter(t => 
            t.areaId === state.currentAreaId || 
            (t.projectId && projectIds.includes(t.projectId))
          );
          break;
      }
      
      // Sort: incomplete first, then by order (lower = higher priority)
      return tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.order - b.order;
      });
    },
    
    getUpcomingTasksByProject: () => {
      const state = get();
      const todayStart = startOfDay(new Date());
      
      // Get all upcoming tasks (scheduled date >= today)
      const upcomingTasks = state.tasks.filter(
        t => t.scheduledDate && t.scheduledDate >= todayStart
      );
      
      // Group tasks by project
      const groupMap = new Map<string | null, Task[]>();
      
      for (const task of upcomingTasks) {
        const projectId = task.projectId;
        if (!groupMap.has(projectId)) {
          groupMap.set(projectId, []);
        }
        groupMap.get(projectId)!.push(task);
      }
      
      // Convert to array and sort each group by scheduled date
      const groups: ProjectTaskGroup[] = [];
      
      // Add inbox (null project) first if it has tasks
      if (groupMap.has(null)) {
        const tasks = groupMap.get(null)!.sort((a, b) => 
          (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0)
        );
        groups.push({
          projectId: null,
          projectName: 'Inbox',
          color: null,
          tasks,
        });
      }
      
      // Add other projects in order
      for (const project of state.projects) {
        if (groupMap.has(project.id)) {
          const tasks = groupMap.get(project.id)!.sort((a, b) => 
            (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0)
          );
          groups.push({
            projectId: project.id,
            projectName: project.name,
            color: project.color,
            tasks,
          });
        }
      }
      
      return groups;
    },
    
    getUpcomingTasksWithOverdue: () => {
      const state = get();
      const todayStart = startOfDay(new Date());
      
      // Get overdue tasks (scheduled date < today and not completed, not someday)
      const overdueTasks = state.tasks
        .filter(t => t.scheduledDate && t.scheduledDate < todayStart && !t.completed && !t.someday)
        .sort((a, b) => (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0));
      
      // Get IDs of overdue tasks to exclude from past deadline (avoid duplication)
      const overdueTaskIds = new Set(overdueTasks.map(t => t.id));
      
      // Get past deadline tasks (deadline < today, not completed, not someday, not already in overdue)
      const pastDeadlineTasks = state.tasks
        .filter(t => 
          t.deadline && 
          t.deadline < todayStart && 
          !t.completed && 
          !t.someday && 
          !overdueTaskIds.has(t.id)
        )
        .sort((a, b) => (a.deadline?.getTime() ?? 0) - (b.deadline?.getTime() ?? 0));
      
      // Get upcoming tasks (scheduled date >= today, not someday)
      const upcomingTasks = state.tasks.filter(
        t => t.scheduledDate && t.scheduledDate >= todayStart && !t.someday
      );
      
      // Group upcoming tasks by project
      const groupMap = new Map<string | null, Task[]>();
      
      for (const task of upcomingTasks) {
        const projectId = task.projectId;
        if (!groupMap.has(projectId)) {
          groupMap.set(projectId, []);
        }
        groupMap.get(projectId)!.push(task);
      }
      
      // Convert to array and sort each group by scheduled date
      const upcomingGroups: ProjectTaskGroup[] = [];
      
      // Add inbox (null project) first if it has tasks
      if (groupMap.has(null)) {
        const tasks = groupMap.get(null)!.sort((a, b) => 
          (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0)
        );
        upcomingGroups.push({
          projectId: null,
          projectName: 'Inbox',
          color: null,
          tasks,
        });
      }
      
      // Add other projects in order
      for (const project of state.projects) {
        if (groupMap.has(project.id)) {
          const tasks = groupMap.get(project.id)!.sort((a, b) => 
            (a.scheduledDate?.getTime() ?? 0) - (b.scheduledDate?.getTime() ?? 0)
          );
          upcomingGroups.push({
            projectId: project.id,
            projectName: project.name,
            color: project.color,
            tasks,
          });
        }
      }
      
      return { overdueTasks, pastDeadlineTasks, upcomingGroups };
    },
    
    getTaskById: (id) => get().tasks.find(t => t.id === id),
    
    getProjectById: (id) => get().projects.find(p => p.id === id),
    
    getAreaById: (id) => get().areas.find(a => a.id === id),
    
    getTaskDecayInfo: (taskId) => {
      const task = get().tasks.find(t => t.id === taskId);
      if (!task) return null;
      
      const projects = get().projects;
      
      // Check for overdue/past deadline first
      const today = startOfDay(new Date());
      const isOverdue = !task.completed && task.scheduledDate && startOfDay(new Date(task.scheduledDate)) < today;
      const isPastDeadline = !task.completed && task.deadline && startOfDay(new Date(task.deadline)) < today;
      
      const multiplier = getDecayMultiplier(task);
      const isDecaying = multiplier < 1;
      
      // Calculate days until decay starts (if not decaying yet)
      let daysUntilDecay: number | null = null;
      if (!isDecaying && !task.completed && !task.someday && !task.scheduledDate) {
        const now = new Date();
        const createdAt = new Date(task.createdAt);
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        daysUntilDecay = Math.max(0, DECAY_GRACE_PERIOD - daysSinceCreation);
      }
      
      // Calculate base XP (before decay and boss multiplier)
      let baseXp = 5;
      if (task.tags.includes('hard')) baseXp = 15;
      else if (task.tags.includes('mid')) baseXp = 10;
      else baseXp = task.xp ?? 5;
      
      // Check for boss project multiplier
      let bossMultiplier = 1;
      if (task.projectId) {
        const project = projects.find(p => p.id === task.projectId);
        if (project?.boss) bossMultiplier = 2;
      }
      
      // Effective XP: 0 if overdue/past deadline, otherwise apply decay and boss multiplier
      const effectiveXp = (isOverdue || isPastDeadline) ? 0 : Math.round(baseXp * multiplier * bossMultiplier);
      
      return {
        isDecaying: isDecaying || isOverdue || isPastDeadline,
        multiplier: (isOverdue || isPastDeadline) ? 0 : multiplier,
        daysUntilDecay,
        effectiveXp,
        baseXp: baseXp * bossMultiplier, // Include boss multiplier in displayed base XP
      };
    },
    
    // Theme actions
    setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      set({ theme });
    },
    
    toggleTheme: () => {
      const currentTheme = get().theme;
      const newTheme: Theme = currentTheme === 'light' ? 'dark' : 
                              currentTheme === 'dark' ? 'system' : 'light';
      localStorage.setItem('theme', newTheme);
      set({ theme: newTheme });
    },
    
    // XP actions
    awardXp: (taskId, taskTitle, xp) => {
      set(state => {
        const newTotalXp = state.userProgress.totalXp + xp;
        const newLevel = calculateLevel(newTotalXp);
        
        const xpEvent: XpEvent = {
          id: generateId(),
          taskId,
          taskTitle,
          xp,
          timestamp: new Date(),
          levelAtTime: newLevel,
        };
        
        return {
          userProgress: {
            totalXp: newTotalXp,
            level: newLevel,
            xpHistory: [...state.userProgress.xpHistory, xpEvent],
          },
        };
      });
    },
    
    revokeXp: (taskId, taskTitle, xp) => {
      set(state => {
        const newTotalXp = Math.max(0, state.userProgress.totalXp - xp);
        const newLevel = calculateLevel(newTotalXp);
        
        const xpEvent: XpEvent = {
          id: generateId(),
          taskId,
          taskTitle,
          xp: -xp, // Negative to indicate revocation
          timestamp: new Date(),
          levelAtTime: newLevel,
        };
        
        return {
          userProgress: {
            totalXp: newTotalXp,
            level: newLevel,
            xpHistory: [...state.userProgress.xpHistory, xpEvent],
          },
        };
      });
    },
    
    getXpToNextLevel: () => {
      const { userProgress } = get();
      const currentLevelXp = getXpForLevel(userProgress.level);
      const nextLevelXp = getXpForLevel(userProgress.level + 1);
      const xpInCurrentLevel = userProgress.totalXp - currentLevelXp;
      const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
      
      return {
        current: xpInCurrentLevel,
        required: xpNeededForNextLevel,
        progress: xpNeededForNextLevel > 0 ? xpInCurrentLevel / xpNeededForNextLevel : 1,
      };
    },
  }))
);

// Auto-save when tasks, projects, areas, tags, or userProgress change (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

useTaskStore.subscribe(
  (state) => ({ 
    tasks: state.tasks, 
    projects: state.projects, 
    areas: state.areas, 
    tags: state.tags,
    userProgress: state.userProgress 
  }),
  () => {
    // Don't save while loading
    if (useTaskStore.getState().isLoading) return;
    
    // Debounce saves
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      useTaskStore.getState().saveData();
    }, 500);
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);
