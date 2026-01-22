import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Task, Project, View } from '../types';

interface TaskStore {
  // State
  tasks: Task[];
  projects: Project[];
  tags: string[];
  currentView: View;
  currentProjectId: string | null;
  selectedTaskId: string | null;
  
  // Task actions
  addTask: (title: string, projectId?: string | null) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  moveTask: (id: string, projectId: string | null) => void;
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
  getTaskById: (id: string) => Task | undefined;
  getProjectById: (id: string) => Project | undefined;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
];

// ============================================
// Sample Data for Testing
// ============================================

// Project IDs (pre-generated for task references)
const PROJECT_IDS = {
  gamifiedTracker: 'proj_gt1',
  platformerGame: 'proj_pg2',
  portfolio: 'proj_pf3',
  llmFinetune: 'proj_llm4',
  aiImageGen: 'proj_ai5',
  frieren: 'proj_fr6',
  soloLeveling: 'proj_sl7',
};

const SAMPLE_PROJECTS: Project[] = [
  // Development
  { id: PROJECT_IDS.gamifiedTracker, name: 'Gamified Tracker', color: '#3b82f6' },
  { id: PROJECT_IDS.platformerGame, name: '2D Platformer Game', color: '#22c55e' },
  { id: PROJECT_IDS.portfolio, name: 'Portfolio Website', color: '#8b5cf6' },
  // AI
  { id: PROJECT_IDS.llmFinetune, name: 'LLM Fine-tuning Experiments', color: '#f97316' },
  { id: PROJECT_IDS.aiImageGen, name: 'AI Image Generator', color: '#ec4899' },
  // Anime
  { id: PROJECT_IDS.frieren, name: 'Frieren: Beyond Journey\'s End', color: '#14b8a6' },
  { id: PROJECT_IDS.soloLeveling, name: 'Solo Leveling', color: '#ef4444' },
];

// Helper to create tasks with staggered dates
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

const SAMPLE_TASKS: Task[] = [
  // ---- Gamified Tracker tasks ----
  { id: 'task_gt1', title: 'Implement drag and drop for tasks', completed: false, projectId: PROJECT_IDS.gamifiedTracker, tags: ['feature', 'ui'], createdAt: daysAgo(5) },
  { id: 'task_gt2', title: 'Add dark mode toggle', completed: false, projectId: PROJECT_IDS.gamifiedTracker, tags: ['feature', 'ui'], createdAt: daysAgo(4) },
  { id: 'task_gt3', title: 'Create statistics dashboard', completed: false, projectId: PROJECT_IDS.gamifiedTracker, tags: ['feature'], createdAt: daysAgo(3) },
  { id: 'task_gt4', title: 'Add recurring tasks feature', completed: false, projectId: PROJECT_IDS.gamifiedTracker, tags: ['feature'], createdAt: daysAgo(2) },
  { id: 'task_gt5', title: 'Set up project structure', completed: true, projectId: PROJECT_IDS.gamifiedTracker, tags: ['setup'], createdAt: daysAgo(10) },

  // ---- 2D Platformer Game tasks ----
  { id: 'task_pg1', title: 'Design player sprite', completed: true, projectId: PROJECT_IDS.platformerGame, tags: ['art', 'gamedev'], createdAt: daysAgo(14) },
  { id: 'task_pg2', title: 'Implement jump mechanics', completed: true, projectId: PROJECT_IDS.platformerGame, tags: ['gameplay', 'gamedev'], createdAt: daysAgo(12) },
  { id: 'task_pg3', title: 'Create first level layout', completed: false, projectId: PROJECT_IDS.platformerGame, tags: ['level-design', 'gamedev'], createdAt: daysAgo(7) },
  { id: 'task_pg4', title: 'Add enemy AI pathfinding', completed: false, projectId: PROJECT_IDS.platformerGame, tags: ['ai', 'gamedev'], createdAt: daysAgo(5) },
  { id: 'task_pg5', title: 'Implement save system', completed: false, projectId: PROJECT_IDS.platformerGame, tags: ['feature', 'gamedev'], createdAt: daysAgo(3) },

  // ---- Portfolio Website tasks ----
  { id: 'task_pf1', title: 'Design hero section', completed: true, projectId: PROJECT_IDS.portfolio, tags: ['design', 'ui'], createdAt: daysAgo(20) },
  { id: 'task_pf2', title: 'Add projects showcase section', completed: false, projectId: PROJECT_IDS.portfolio, tags: ['feature'], createdAt: daysAgo(8) },
  { id: 'task_pf3', title: 'Optimize for mobile devices', completed: false, projectId: PROJECT_IDS.portfolio, tags: ['responsive', 'ui'], createdAt: daysAgo(4) },

  // ---- LLM Fine-tuning tasks ----
  { id: 'task_llm1', title: 'Prepare training dataset', completed: true, projectId: PROJECT_IDS.llmFinetune, tags: ['data', 'ml'], createdAt: daysAgo(15) },
  { id: 'task_llm2', title: 'Set up training pipeline', completed: true, projectId: PROJECT_IDS.llmFinetune, tags: ['infra', 'ml'], createdAt: daysAgo(12) },
  { id: 'task_llm3', title: 'Run baseline experiments', completed: false, projectId: PROJECT_IDS.llmFinetune, tags: ['experiment', 'ml'], createdAt: daysAgo(6) },
  { id: 'task_llm4', title: 'Evaluate model performance', completed: false, projectId: PROJECT_IDS.llmFinetune, tags: ['evaluation', 'ml'], createdAt: daysAgo(2) },

  // ---- AI Image Generator tasks ----
  { id: 'task_ai1', title: 'Research diffusion models', completed: true, projectId: PROJECT_IDS.aiImageGen, tags: ['research', 'ml'], createdAt: daysAgo(18) },
  { id: 'task_ai2', title: 'Set up GPU environment', completed: true, projectId: PROJECT_IDS.aiImageGen, tags: ['infra'], createdAt: daysAgo(16) },
  { id: 'task_ai3', title: 'Implement basic inference pipeline', completed: false, projectId: PROJECT_IDS.aiImageGen, tags: ['feature', 'ml'], createdAt: daysAgo(9) },
  { id: 'task_ai4', title: 'Build web UI for generation', completed: false, projectId: PROJECT_IDS.aiImageGen, tags: ['ui', 'feature'], createdAt: daysAgo(4) },

  // ---- Frieren episodes ----
  { id: 'task_fr1', title: 'Episode 1: The Journey\'s End', completed: true, projectId: PROJECT_IDS.frieren, tags: ['anime'], createdAt: daysAgo(30) },
  { id: 'task_fr2', title: 'Episode 2: It Didn\'t Have to Be Magic', completed: true, projectId: PROJECT_IDS.frieren, tags: ['anime'], createdAt: daysAgo(28) },
  { id: 'task_fr3', title: 'Episode 3: Killing Magic', completed: true, projectId: PROJECT_IDS.frieren, tags: ['anime'], createdAt: daysAgo(26) },
  { id: 'task_fr4', title: 'Episode 4: The Land Where Souls Rest', completed: false, projectId: PROJECT_IDS.frieren, tags: ['anime'], createdAt: daysAgo(24) },
  { id: 'task_fr5', title: 'Episode 5: Phantoms of the Dead', completed: false, projectId: PROJECT_IDS.frieren, tags: ['anime'], createdAt: daysAgo(22) },

  // ---- Solo Leveling episodes ----
  { id: 'task_sl1', title: 'Episode 1: I\'m Used to It', completed: true, projectId: PROJECT_IDS.soloLeveling, tags: ['anime'], createdAt: daysAgo(25) },
  { id: 'task_sl2', title: 'Episode 2: If I Had One More Chance', completed: true, projectId: PROJECT_IDS.soloLeveling, tags: ['anime'], createdAt: daysAgo(23) },
  { id: 'task_sl3', title: 'Episode 3: It\'s Like a Game', completed: false, projectId: PROJECT_IDS.soloLeveling, tags: ['anime'], createdAt: daysAgo(21) },
  { id: 'task_sl4', title: 'Episode 4: I\'ve Gotta Get Stronger', completed: false, projectId: PROJECT_IDS.soloLeveling, tags: ['anime'], createdAt: daysAgo(19) },

  // ---- Inbox tasks (no project) ----
  { id: 'task_in1', title: 'Review pull request from team', completed: false, projectId: null, tags: ['code-review'], createdAt: daysAgo(1) },
  { id: 'task_in2', title: 'Update npm packages', completed: false, projectId: null, tags: ['maintenance'], createdAt: daysAgo(2) },
  { id: 'task_in3', title: 'Read Rust documentation', completed: false, projectId: null, tags: ['learning'], createdAt: daysAgo(3) },
  { id: 'task_in4', title: 'Set up new monitor', completed: false, projectId: null, tags: ['hardware'], createdAt: daysAgo(5) },
  { id: 'task_in5', title: 'Reply to emails', completed: false, projectId: null, tags: [], createdAt: daysAgo(1) },
];

// Collect all unique tags from sample tasks
const SAMPLE_TAGS = [...new Set(SAMPLE_TASKS.flatMap(t => t.tags))];

// ============================================

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // Initial state with sample data
      tasks: SAMPLE_TASKS,
      projects: SAMPLE_PROJECTS,
      tags: SAMPLE_TAGS,
      currentView: 'inbox',
      currentProjectId: null,
      selectedTaskId: null,
      
      // Task actions
      addTask: (title, projectId = null) => {
        const newTask: Task = {
          id: generateId(),
          title,
          completed: false,
          projectId: projectId ?? (get().currentView === 'project' ? get().currentProjectId : null),
          tags: [],
          createdAt: new Date(),
        };
        set(state => ({ tasks: [...state.tasks, newTask] }));
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
            // For now, show all incomplete tasks as "today"
            tasks = tasks.filter(t => !t.completed);
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
      
      getTaskById: (id) => get().tasks.find(t => t.id === id),
      
      getProjectById: (id) => get().projects.find(p => p.id === id),
    }),
    {
      name: 'gamified-tracker-storage',
      // Handle Date serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Convert date strings back to Date objects
          if (parsed.state?.tasks) {
            parsed.state.tasks = parsed.state.tasks.map((t: Task) => ({
              ...t,
              createdAt: new Date(t.createdAt),
            }));
          }
          return parsed;
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
