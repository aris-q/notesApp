import { Priority, RecurrenceType } from "@prisma/client";

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface TaskLink {
  id: string;
  taskId: string;
  title: string;
  url: string;
}

export interface Task {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  deadline: string | null;
  priority: Priority;
  isCompleted: boolean;
  recurrenceType: RecurrenceType;
  recurrenceInterval: number | null;
  recurrenceDays: string[];
  recurrenceUnit: string | null;
  recurrenceEndDate: string | null;
  subtasks: Subtask[];
  links: TaskLink[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskList {
  id: string;
  userId: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  _count?: { tasks: number };
}

export type FilterPriority = Priority | "ALL";
export type FilterDueRange = "ALL" | "OVERDUE" | "TODAY" | "THIS_WEEK" | "THIS_MONTH";
