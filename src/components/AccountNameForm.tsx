"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateDisplayName } from "@/app/actions";

export function AccountNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();
  const dirty = name.trim() !== currentName.trim();

  return (
    <form
      action={(fd) => {
        startTransition(async () => {
          try {
            await updateDisplayName(fd);
            toast.success("Name updated");
          } catch {
            toast.error("Couldn't save");
          }
        });
      }}
      className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
    >
      <div className="flex-1">
        <label htmlFor="display_name" className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Your name"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        />
        <p className="text-[10px] text-slate-500 mt-1 tabular-nums">{name.length}/40</p>
      </div>
      <button
        type="submit"
        disabled={pending || !dirty}
        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
