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
}

export interface Project {
  id: string;
  name: string;
  color: string;
  areaId: string | null; // null = no area
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
