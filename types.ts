
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
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

export interface Email {
  id: string;
  senderName: string;
  senderAddress: string;
  subject: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
}

export interface MailConfig {
  protocol: 'IMAP' | 'POP3';
  host: string;
  port: string;
  useSSL: boolean;
  email: string;
  password: string;
}

export interface MailAccount {
  id: string;
  name: string; // e.g. "Work", "Personal"
  config: MailConfig;
  emails: Email[];
  lastUpdated: Date;
  isConnected: boolean;
  latestUid?: string | number; // For incremental sync
}

export interface AIBreakdownResponse {
  subtasks: string[];
  suggestedTags: string[];
  prioritySuggestion: string;
}

export type ViewMode = 'DASHBOARD' | 'TASKS' | 'SCHEDULE' | 'KNOWLEDGE' | 'AI_CHAT' | 'MY_PAGE' | 'MAIL';