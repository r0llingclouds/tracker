import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { isSameDay, startOfDay, addDays, addWeeks, addMonths, addYears, getDay } from 'date-fns';
import type { Task, Project, View, Recurrence, Area } from '../types';

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
  currentView: View;
  currentProjectId: string | null;
  currentTagId: string | null;
  currentAreaId: string | null;
  selectedTaskId: string | null;
  isLoading: boolean;
  theme: Theme;
  
  // Data persistence
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  
  // Task actions
  addTask: (title: string, projectId?: string | null, tags?: string[], scheduledDate?: Date | null, deadline?: Date | null, areaId?: string | null, url?: string | null) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
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
  
  // Project actions
  addProject: (name: string, color?: string, areaId?: string | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setProjectArea: (projectId: string, areaId: string | null) => void;
  
  // Area actions
  addArea: (name: string) => void;
  updateArea: (id: string, updates: Partial<Area>) => void;
  deleteArea: (id: string) => void;
  
  // Navigation
  setView: (view: View, projectId?: string | null, tagId?: string | null, areaId?: string | null) => void;
  selectTask: (id: string | null) => void;
  selectNextTask: () => void;
  selectPrevTask: () => void;
  
  // Computed
  getVisibleTasks: () => Task[];
  getUpcomingTasksByProject: () => ProjectTaskGroup[];
  getUpcomingTasksWithOverdue: () => UpcomingData;
  getTaskById: (id: string) => Task | undefined;
  getProjectById: (id: string) => Project | undefined;
  getAreaById: (id: string) => Area | undefined;
  
  // Theme
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
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
    currentView: 'inbox',
    currentProjectId: null,
    currentTagId: null,
    currentAreaId: null,
    selectedTaskId: null,
    isLoading: true,
    theme: (localStorage.getItem('theme') as Theme) || 'system',
    
    // Load data from API
    loadData: async () => {
      try {
        set({ isLoading: true });
        const response = await fetch(`${API_URL}/data`);
        const data = await response.json();
        
        // Convert date strings to Date objects and ensure fields exist
        const tasks = data.tasks.map((t: Task) => ({
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
        }));
        
        // Ensure projects have areaId field
        const projects = (data.projects || []).map((p: Project) => ({
          ...p,
          areaId: p.areaId ?? null,
        }));
        
        set({ 
          tasks, 
          projects,
          areas: data.areas || [],
          tags: data.tags,
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
        const { tasks, projects, areas, tags } = get();
        await fetch(`${API_URL}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, projects, areas, tags }),
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
      const newGlobalTags = normalizedTags.filter(t => !currentTags.includes(t));
      
      // Determine areaId: use passed areaId, or if in area view and no project, use current area
      const state = get();
      let taskAreaId: string | null = areaId;
      if (!taskAreaId && state.currentView === 'area' && !projectId) {
        taskAreaId = state.currentAreaId;
      }
      
      const newTask: Task = {
        id: generateId(),
        title,
        completed: false,
        completedAt: null,
        projectId: projectId ?? (state.currentView === 'project' ? state.currentProjectId : null),
        areaId: taskAreaId,
        tags: normalizedTags,
        createdAt: new Date(),
        scheduledDate,
        deadline,
        someday: false,
        recurrence: null,
        timeSpent: 0,
        timerStartedAt: null,
        url,
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
    
    toggleTask: (id) => {
      const task = get().tasks.find(t => t.id === id);
      
      // Handle recurring tasks: when completing, create a new instance
      if (task && !task.completed && task.recurrence) {
        // Use task's scheduled date or today as base for calculating next occurrence
        const baseDate = task.scheduledDate || startOfDay(new Date());
        const nextDate = getNextOccurrence(baseDate, task.recurrence);
        const newTask: Task = {
          ...task,
          id: generateId(),
          completed: false,
          completedAt: null,
          scheduledDate: nextDate,
          createdAt: new Date(),
          timeSpent: 0,
          timerStartedAt: null,
        };
        
        set(state => ({
          tasks: [
            ...state.tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: new Date() } : t),
            newTask
          ],
        }));
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
    },
    
    moveTask: (id, projectId) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === id ? { ...task, projectId, areaId: null } : task
        ),
      }));
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
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, scheduledDate: date, someday: date ? false : task.someday } : task
        ),
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
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, someday, scheduledDate: someday ? null : task.scheduledDate } : task
        ),
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
    
    // Project actions
    addProject: (name, color, areaId = null) => {
      // If in area view, default to current area
      const effectiveAreaId = areaId ?? (get().currentView === 'area' ? get().currentAreaId : null);
      const newProject: Project = {
        id: generateId(),
        name,
        color: color ?? PROJECT_COLORS[get().projects.length % PROJECT_COLORS.length],
        areaId: effectiveAreaId,
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
      });
    },
    
    selectTask: (id) => {
      set({ selectedTaskId: id });
    },
    
    selectNextTask: () => {
      const visibleTasks = get().getVisibleTasks();
      const currentIndex = visibleTasks.findIndex(t => t.id === get().selectedTaskId);
      
      if (visibleTasks.length === 0) return;
      
      if (currentIndex === -1 || currentIndex === visibleTasks.length - 1) {
        set({ selectedTaskId: visibleTasks[0].id });
      } else {
        set({ selectedTaskId: visibleTasks[currentIndex + 1].id });
      }
    },
    
    selectPrevTask: () => {
      const visibleTasks = get().getVisibleTasks();
      const currentIndex = visibleTasks.findIndex(t => t.id === get().selectedTaskId);
      
      if (visibleTasks.length === 0) return;
      
      if (currentIndex === -1 || currentIndex === 0) {
        set({ selectedTaskId: visibleTasks[visibleTasks.length - 1].id });
      } else {
        set({ selectedTaskId: visibleTasks[currentIndex - 1].id });
      }
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
      
      // Sort: incomplete first, then by creation date
      return tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
      
      return { overdueTasks, upcomingGroups };
    },
    
    getTaskById: (id) => get().tasks.find(t => t.id === id),
    
    getProjectById: (id) => get().projects.find(p => p.id === id),
    
    getAreaById: (id) => get().areas.find(a => a.id === id),
    
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
  }))
);

// Auto-save when tasks, projects, areas, or tags change (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

useTaskStore.subscribe(
  (state) => ({ tasks: state.tasks, projects: state.projects, areas: state.areas, tags: state.tags }),
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
