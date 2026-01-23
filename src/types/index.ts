export interface Recurrence {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;        // every N (days/weeks/months/years)
  weekdays?: number[];     // for weekly: [1,3,5] = Mon/Wed/Fri (0=Sun, 6=Sat)
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  projectId: string | null; // null = inbox
  tags: string[];
  createdAt: Date;
  scheduledDate: Date | null; // null = unscheduled
  deadline: Date | null; // null = no deadline
  someday: boolean; // true = in Someday list
  recurrence: Recurrence | null; // null = not recurring
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export type View = 'inbox' | 'today' | 'upcoming' | 'someday' | 'project';

export interface AppState {
  tasks: Task[];
  projects: Project[];
  tags: string[];
  currentView: View;
  currentProjectId: string | null;
  selectedTaskId: string | null;
}
