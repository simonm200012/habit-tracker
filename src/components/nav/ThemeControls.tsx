"use client";

import { useTheme, ACCENTS } from "@/components/ThemeProvider";

const MODES = [
  {
    id: "light" as const,
    label: "Light",
    icon: "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
    extra: { type: "circle", cx: 12, cy: 12, r: 4 },
  },
  {
    id: "system" as const,
    label: "Auto",
    icon: "M9 17v3M15 17v3M5 21h14M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
  },
  {
    id: "dark" as const,
    label: "Dark",
    icon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  },
];

export function ThemeControls() {
  const { mode, setMode, accent, setAccent } = useTheme();

  return (
    <div className="space-y-3">
      {/* Mode segmented control */}
      <div className="flex p-0.5 rounded-lg bg-slate-100 ring-1 ring-slate-200/70">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.label}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${
              mode === m.id
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={m.icon} />
              {m.extra?.type === "circle" && (
                <circle cx={m.extra.cx} cy={m.extra.cy} r={m.extra.r} />
              )}
            </svg>
            {m.label}
          </button>
        ))}
      </div>

      {/* Accent swatches */}
      <div className="flex items-center gap-1.5">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAccent(a.id)}
            title={a.label}
            aria-label={`Set accent to ${a.label}`}
            className={`w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-white transition ${
              accent === a.id ? "ring-slate-900 scale-110" : "ring-transparent hover:scale-110"
            }`}
            style={{ backgroundColor: a.hex }}
          />
        ))}
      </div>
    </div>
  );
}
