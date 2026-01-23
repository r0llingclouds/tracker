import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { isSameDay, startOfDay } from 'date-fns';
import type { Task, Project, View } from '../types';

// Type for grouped tasks by project
export interface ProjectTaskGroup {
  projectId: string | null;
  projectName: string;
  color: string | null;
  tasks: Task[];
}

const API_URL = 'http://localhost:3001/api';

interface TaskStore {
  // State
  tasks: Task[];
  projects: Project[];
  tags: string[];
  currentView: View;
  currentProjectId: string | null;
  selectedTaskId: string | null;
  isLoading: boolean;
  
  // Data persistence
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  
  // Task actions
  addTask: (title: string, projectId?: string | null, tags?: string[], scheduledDate?: Date | null) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  moveTask: (id: string, projectId: string | null) => void;
  setTaskDate: (taskId: string, date: Date | null) => void;
  addTagToTask: (taskId: string, tag: string) => void;
  removeTagFromTask: (taskId: string, tag: string) => void;
  
  // Project actions
  addProject: (name: string, color?: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // Navigation
  setView: (view: View, projectId?: string | null) => void;
  selectTask: (id: string | null) => void;
  selectNextTask: () => void;
  selectPrevTask: () => void;
  
  // Computed
  getVisibleTasks: () => Task[];
  getUpcomingTasksByProject: () => ProjectTaskGroup[];
  getTaskById: (id: string) => Task | undefined;
  getProjectById: (id: string) => Project | undefined;
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
    tags: [],
    currentView: 'inbox',
    currentProjectId: null,
    selectedTaskId: null,
    isLoading: true,
    
    // Load data from API
    loadData: async () => {
      try {
        set({ isLoading: true });
        const response = await fetch(`${API_URL}/data`);
        const data = await response.json();
        
        // Convert date strings to Date objects
        const tasks = data.tasks.map((t: Task) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          scheduledDate: t.scheduledDate ? new Date(t.scheduledDate) : null,
        }));
        
        set({ 
          tasks, 
          projects: data.projects, 
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
        const { tasks, projects, tags } = get();
        await fetch(`${API_URL}/data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks, projects, tags }),
        });
      } catch (error) {
        console.error('Failed to save data:', error);
      }
    },
    
    // Task actions
    addTask: (title, projectId = null, taskTags = [], scheduledDate = null) => {
      // Normalize tags and add any new ones to the global tags list
      const normalizedTags = taskTags.map(t => t.toLowerCase().trim());
      const currentTags = get().tags;
      const newGlobalTags = normalizedTags.filter(t => !currentTags.includes(t));
      
      const newTask: Task = {
        id: generateId(),
        title,
        completed: false,
        projectId: projectId ?? (get().currentView === 'project' ? get().currentProjectId : null),
        tags: normalizedTags,
        createdAt: new Date(),
        scheduledDate,
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
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === id ? { ...task, completed: !task.completed } : task
        ),
      }));
    },
    
    moveTask: (id, projectId) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === id ? { ...task, projectId } : task
        ),
      }));
    },
    
    setTaskDate: (taskId, date) => {
      set(state => ({
        tasks: state.tasks.map(task =>
          task.id === taskId ? { ...task, scheduledDate: date } : task
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
    
    // Project actions
    addProject: (name, color) => {
      const newProject: Project = {
        id: generateId(),
        name,
        color: color ?? PROJECT_COLORS[get().projects.length % PROJECT_COLORS.length],
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
    
    // Navigation
    setView: (view, projectId = null) => {
      set({ 
        currentView: view, 
        currentProjectId: view === 'project' ? projectId : null,
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
          tasks = tasks.filter(t => t.projectId === null);
          break;
        case 'today':
          // Show tasks scheduled for today
          const today = new Date();
          tasks = tasks.filter(t => t.scheduledDate && isSameDay(t.scheduledDate, today));
          break;
        case 'upcoming':
          // Show all tasks with a scheduled date >= today
          const todayStart = startOfDay(new Date());
          tasks = tasks.filter(t => t.scheduledDate && t.scheduledDate >= todayStart);
          break;
        case 'project':
          tasks = tasks.filter(t => t.projectId === state.currentProjectId);
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
    
    getTaskById: (id) => get().tasks.find(t => t.id === id),
    
    getProjectById: (id) => get().projects.find(p => p.id === id),
  }))
);

// Auto-save when tasks, projects, or tags change (debounced)
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

useTaskStore.subscribe(
  (state) => ({ tasks: state.tasks, projects: state.projects, tags: state.tags }),
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
