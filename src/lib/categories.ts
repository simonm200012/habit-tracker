import type { HabitCategory } from "./types";

export const CATEGORIES: {
  name: HabitCategory;
  color: string;       // tailwind text color class
  bg: string;          // bg class
  ring: string;        // ring class
  hex: string;         // raw hex for chart fills
  icon: string;        // svg path d-attribute
}[] = [
  {
    name: "Health",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    hex: "#059669",
    icon: "M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10z",
  },
  {
    name: "Fitness",
    color: "text-orange-700",
    bg: "bg-orange-50",
    ring: "ring-orange-200",
    hex: "#ea580c",
    icon: "M6 6l3 3M18 18l-3-3M2 12h4M18 12h4M14.5 14.5l-5-5",
  },
  {
    name: "Focus",
    color: "text-violet-700",
    bg: "bg-violet-50",
    ring: "ring-violet-200",
    hex: "#7c3aed",
    icon: "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  },
  {
    name: "Learning",
    color: "text-sky-700",
    bg: "bg-sky-50",
    ring: "ring-sky-200",
    hex: "#0284c7",
    icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  },
  {
    name: "Finance",
    color: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    hex: "#d97706",
    icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  },
  {
    name: "Mindfulness",
    color: "text-rose-700",
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    hex: "#e11d48",
    icon: "M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zM12 9v.01",
  },
];

export function categoryMeta(name: string) {
  return CATEGORIES.find((c) => c.name === name) ?? CATEGORIES[0];
}
