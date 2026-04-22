import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isBefore,
  startOfDay,
  getDay,
} from "date-fns";
import { RecurrenceType } from "@prisma/client";

const DAY_NAMES: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

interface RecurrableTask {
  deadline: Date | null;
  recurrenceType: RecurrenceType;
  recurrenceInterval: number | null;
  recurrenceDays: string[];
  recurrenceUnit: string | null;
  recurrenceEndDate: Date | null;
}

export function expandRecurrence(
  task: RecurrableTask,
  windowEnd: Date
): Date[] {
  if (!task.deadline || task.recurrenceType === "NONE") return [];

  const start = startOfDay(task.deadline);
  const end = task.recurrenceEndDate
    ? new Date(Math.min(task.recurrenceEndDate.getTime(), windowEnd.getTime()))
    : windowEnd;

  const dates: Date[] = [];

  switch (task.recurrenceType) {
    case "DAILY": {
      let cur = addDays(start, 1);
      while (!isAfter(cur, end)) {
        dates.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      break;
    }
    case "WEEKLY": {
      let cur = addWeeks(start, 1);
      while (!isAfter(cur, end)) {
        dates.push(new Date(cur));
        cur = addWeeks(cur, 1);
      }
      break;
    }
    case "MONTHLY": {
      let cur = addMonths(start, 1);
      while (!isAfter(cur, end)) {
        dates.push(new Date(cur));
        cur = addMonths(cur, 1);
      }
      break;
    }
    case "YEARLY": {
      let cur = addYears(start, 1);
      while (!isAfter(cur, end)) {
        dates.push(new Date(cur));
        cur = addYears(cur, 1);
      }
      break;
    }
    case "CUSTOM_INTERVAL": {
      const interval = task.recurrenceInterval ?? 1;
      const unit = task.recurrenceUnit ?? "day";
      const advance = unit === "week"
        ? (d: Date) => addWeeks(d, interval)
        : (d: Date) => addDays(d, interval);
      let cur = advance(start);
      while (!isAfter(cur, end)) {
        dates.push(new Date(cur));
        cur = advance(cur);
      }
      break;
    }
    case "CUSTOM_DAYS": {
      if (!task.recurrenceDays.length) break;
      const targetDays = task.recurrenceDays.map((d) => DAY_NAMES[d] ?? -1);
      let cur = addDays(start, 1);
      while (!isAfter(cur, end)) {
        if (targetDays.includes(getDay(cur))) {
          dates.push(new Date(cur));
        }
        cur = addDays(cur, 1);
      }
      break;
    }
  }

  return dates.filter((d) => isBefore(start, d));
}
