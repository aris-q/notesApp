import { Priority } from "@prisma/client";

export interface PriorityStyle {
  label: string;
  hex: string;
  tailwindBg: string;
  tailwindText: string;
  tailwindBorder: string;
  tailwindLight: string;
}

export const PRIORITY_CONFIG: Record<Priority, PriorityStyle> = {
  URGENT: {
    label: "Urgent",
    hex: "#ef5b6a",
    tailwindBg: "bg-red-500",
    tailwindText: "text-red-400",
    tailwindBorder: "border-red-500",
    tailwindLight: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  HIGH: {
    label: "High",
    hex: "#f58a47",
    tailwindBg: "bg-orange-400",
    tailwindText: "text-orange-400",
    tailwindBorder: "border-orange-400",
    tailwindLight: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  },
  MEDIUM: {
    label: "Medium",
    hex: "#f5c847",
    tailwindBg: "bg-yellow-400",
    tailwindText: "text-yellow-300",
    tailwindBorder: "border-yellow-400",
    tailwindLight: "bg-yellow-400/10 text-yellow-300 border-yellow-400/20",
  },
  LOW: {
    label: "Low",
    hex: "#8a92a6",
    tailwindBg: "bg-slate-500",
    tailwindText: "text-slate-400",
    tailwindBorder: "border-slate-500",
    tailwindLight: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

export const PRIORITY_ORDER: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
