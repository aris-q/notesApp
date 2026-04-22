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
    hex: "#ef4444",
    tailwindBg: "bg-red-500",
    tailwindText: "text-red-600",
    tailwindBorder: "border-red-500",
    tailwindLight: "bg-red-50 text-red-700 border-red-200",
  },
  HIGH: {
    label: "High",
    hex: "#f97316",
    tailwindBg: "bg-orange-500",
    tailwindText: "text-orange-600",
    tailwindBorder: "border-orange-500",
    tailwindLight: "bg-orange-50 text-orange-700 border-orange-200",
  },
  MEDIUM: {
    label: "Medium",
    hex: "#eab308",
    tailwindBg: "bg-yellow-500",
    tailwindText: "text-yellow-600",
    tailwindBorder: "border-yellow-500",
    tailwindLight: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  LOW: {
    label: "Low",
    hex: "#6b7280",
    tailwindBg: "bg-gray-400",
    tailwindText: "text-gray-500",
    tailwindBorder: "border-gray-400",
    tailwindLight: "bg-gray-50 text-gray-600 border-gray-200",
  },
};

export const PRIORITY_ORDER: Priority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
