export interface Task {
  id: string;
  title: string;
  completed: boolean;
  projectId: string | null; // null = inbox
  tags: string[];
  createdAt: Date;
  scheduledDate: Date | null; // null = unscheduled
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export type View = 'inbox' | 'today' | 'upcoming' | 'project';

export interface AppState {
  tasks: Task[];
  projects: Project[];
  tags: string[];
  currentView: View;
  currentProjectId: string | null;
  selectedTaskId: string | null;
}
