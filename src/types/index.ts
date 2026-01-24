export interface Recurrence {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;        // every N (days/weeks/months/years)
  weekdays?: number[];     // for weekly: [1,3,5] = Mon/Wed/Fri (0=Sun, 6=Sat)
}

export interface Area {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  completedAt: Date | null; // timestamp when task was completed (null = not completed)
  projectId: string | null; // null = inbox or area-only
  areaId: string | null;    // for tasks directly under an area (no project)
  tags: string[];
  createdAt: Date;
  scheduledDate: Date | null; // null = unscheduled
  deadline: Date | null; // null = no deadline
  someday: boolean; // true = in Someday list
  recurrence: Recurrence | null; // null = not recurring
  timeSpent: number; // accumulated time in milliseconds
  timerStartedAt: Date | null; // timestamp when timer started (null = paused/stopped)
  url: string | null; // extracted URL for the task
  xp: number; // XP awarded on completion, default 5
}

// XP Gamification Types
export interface XpEvent {
  id: string;
  taskId: string;
  taskTitle: string;  // snapshot for historical display
  xp: number;         // positive for earned, negative for revoked
  timestamp: Date;
  levelAtTime: number; // user's level when event occurred
}

export interface UserProgress {
  totalXp: number;
  level: number;
  xpHistory: XpEvent[];
}

export interface BossCard {
  image: string | null;    // URL path to image (e.g., /api/images/boss-xxx.jpg)
  description: string;     // boss description/backstory
}

export interface Project {
  id: string;
  name: string;
  color: string;
  areaId: string | null; // null = no area
  boss: boolean; // Boss projects give 2x XP
  bossCard?: BossCard; // optional boss card with image and description
}

export type View = 'inbox' | 'today' | 'upcoming' | 'someday' | 'project' | 'tag' | 'area';

export interface AppState {
  tasks: Task[];
  projects: Project[];
  areas: Area[];
  tags: string[];
  currentView: View;
  currentProjectId: string | null;
  currentAreaId: string | null;
  selectedTaskId: string | null;
}
