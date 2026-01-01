export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // ISO Date String
  tags: string[];
  subTasks: SubTask[];
  createdAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: 'AWS' | 'GCP' | 'Azure' | 'Kubernetes' | 'DevOps' | 'General';
  tags: string[];
  createdAt: string;
  isDraft?: boolean;
}

export interface AIBreakdownResponse {
  subtasks: string[];
  suggestedTags: string[];
  prioritySuggestion: string;
}

export type ViewMode = 'DASHBOARD' | 'TASKS' | 'SCHEDULE' | 'KNOWLEDGE' | 'AI_CHAT';