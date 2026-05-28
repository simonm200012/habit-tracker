"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark" | "system";
type Accent = "slate" | "emerald" | "sky" | "violet" | "rose" | "amber";

export const ACCENTS: { id: Accent; label: string; hex: string }[] = [
  { id: "slate",   label: "Slate",   hex: "#0f172a" },
  { id: "emerald", label: "Emerald", hex: "#059669" },
  { id: "sky",     label: "Sky",     hex: "#0284c7" },
  { id: "violet",  label: "Violet",  hex: "#7c3aed" },
  { id: "rose",    label: "Rose",    hex: "#e11d48" },
  { id: "amber",   label: "Amber",   hex: "#d97706" },
];

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  resolved: "light" | "dark";
  accent: Accent;
  setAccent: (a: Accent) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

const MODE_KEY = "ht_theme_mode";
const ACCENT_KEY = "ht_theme_accent";

function apply(mode: Mode, accent: Accent): "light" | "dark" {
  const sysDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = mode === "system" ? (sysDark ? "dark" : "light") : mode;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.accent = accent;
  return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("system");
  const [accent, setAccentState] = useState<Accent>("slate");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Init from localStorage
  useEffect(() => {
    const savedMode = (localStorage.getItem(MODE_KEY) as Mode | null) ?? "system";
    const savedAccent = (localStorage.getItem(ACCENT_KEY) as Accent | null) ?? "slate";
    setModeState(savedMode);
    setAccentState(savedAccent);
    setResolved(apply(savedMode, savedAccent));
  }, []);

  // React to system theme changes when in "system" mode
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(apply("system", accent));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, accent]);

  function setMode(m: Mode) {
    setModeState(m);
    localStorage.setItem(MODE_KEY, m);
    setResolved(apply(m, accent));
  }
  function setAccent(a: Accent) {
    setAccentState(a);
    localStorage.setItem(ACCENT_KEY, a);
    apply(mode, a);
  }

  return (
    <ThemeCtx.Provider value={{ mode, setMode, resolved, accent, setAccent }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be inside <ThemeProvider>");
  return ctx;
}

/** Inline boot script — prevents flash of wrong theme on hydration. */
export const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var m = localStorage.getItem("${MODE_KEY}") || "system";
    var a = localStorage.getItem("${ACCENT_KEY}") || "slate";
    var sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = m === "system" ? (sysDark ? "dark" : "light") : m;
    if (resolved === "dark") document.documentElement.classList.add("dark");
    document.documentElement.dataset.accent = a;
  } catch (e) {}
})();
`;
