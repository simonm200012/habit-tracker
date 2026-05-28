"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { applyTemplate } from "@/app/actions";
import { categoryMeta } from "@/lib/categories";
import { TEMPLATES, type HabitTemplate } from "@/lib/templates";

export function TemplatePicker() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HabitTemplate | null>(null);
  const [pending, startTransition] = useTransition();

  function apply() {
    if (!selected) return;
    startTransition(async () => {
      try {
        const { inserted } = await applyTemplate(selected.id);
        toast.success(`Added ${inserted} habits from ${selected.name}`);
        setOpen(false);
        setSelected(null);
        // Force the (server) habits page to refetch with the new rows
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add template");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-semibold text-sm shadow-sm ring-1 ring-slate-200 hover:ring-slate-300 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        Templates
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => {
            setOpen(false);
            setSelected(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl ring-1 ring-slate-200 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900">Habit templates</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selected
                    ? `${selected.habits.length} habits will be added`
                    : "Pick a starter pack curated for a specific goal."}
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                }}
                className="text-slate-400 hover:text-slate-700 transition"
                aria-label="close"
              >
                ✕
              </button>
            </div>

            {!selected ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-6 overflow-y-auto">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className="text-left p-4 rounded-xl bg-slate-50 hover:bg-white ring-1 ring-slate-200 hover:ring-slate-900/20 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl ring-1 ring-slate-200">
                        {t.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold tracking-tight text-slate-900">{t.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {t.habits.length} habits
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col overflow-hidden">
                <div className="p-6 overflow-y-auto">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl ring-1 ring-slate-200">
                      {selected.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold tracking-tight text-slate-900">{selected.name}</h4>
                      <p className="text-sm text-slate-600 mt-0.5">{selected.description}</p>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {selected.habits.map((h, i) => {
                      const cat = categoryMeta(h.category);
                      return (
                        <li
                          key={i}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/60 ring-1 ring-slate-200"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ring-1 ${cat.bg} ${cat.ring}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                              <path d={cat.icon} />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900">{h.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {h.category} · {h.frequency} · {h.difficulty}
                              {h.goal_unit && ` · ${h.goal_target} ${h.goal_unit}`}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelected(null)}
                    className="text-sm font-semibold text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={apply}
                    disabled={pending}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-60"
                  >
                    {pending ? "Adding…" : `Add ${selected.habits.length} habits`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
