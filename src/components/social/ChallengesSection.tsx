"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createChallenge, joinChallenge } from "@/app/social/actions";
import { CATEGORIES, categoryMeta } from "@/lib/categories";
import type { Challenge } from "@/lib/types";

type ChallengeRow = {
  challenge: Challenge;
  memberCount: number;
  myProgress: number; // 0..100
  daysLeft: number;
};

export function ChallengesSection({ rows }: { rows: ChallengeRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [pending, startTransition] = useTransition();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    startTransition(async () => {
      try {
        await joinChallenge(joinCode);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't join");
      }
    });
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Group challenges</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {rows.length === 0
              ? "Race friends on a category for a stretch of days"
              : `${rows.length} active challenge${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New
        </button>
      </div>

      <div className="space-y-2 mb-5">
        {rows.length === 0 ? (
          <div className="text-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-600 font-medium">No challenges yet.</p>
            <p className="text-xs text-slate-500 mt-1">Create one or join via a code below.</p>
          </div>
        ) : (
          rows.map(({ challenge, memberCount, myProgress, daysLeft }) => {
            const cat = categoryMeta(challenge.category);
            return (
              <Link
                key={challenge.id}
                href={`/challenges/${challenge.id}`}
                className="block p-4 rounded-xl bg-slate-50 hover:bg-white ring-1 ring-transparent hover:ring-slate-300 hover:shadow-md transition group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${cat.bg} ${cat.ring} shrink-0`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={cat.color}>
                      <path d={cat.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 tracking-tight group-hover:underline">{challenge.name}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${cat.bg} ${cat.color} ring-1 ${cat.ring}`}>
                        {challenge.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium tabular-nums">
                      {memberCount} member{memberCount === 1 ? "" : "s"} ·{" "}
                      {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "ended"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-700 transition-all duration-500"
                          style={{ width: `${myProgress}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 tabular-nums">{myProgress}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Join code */}
      <form
        onSubmit={handleJoin}
        className="p-4 rounded-xl bg-slate-50 ring-1 ring-slate-200 flex gap-2"
      >
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Join with code"
          maxLength={12}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
        >
          Join
        </button>
      </form>

      {createOpen && (
        <CreateChallengeModal onClose={() => setCreateOpen(false)} />
      )}
    </section>
  );
}

function CreateChallengeModal({ onClose }: { onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md ring-1 ring-slate-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">New challenge</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <form
          action={(fd) => {
            startTransition(async () => {
              try {
                await createChallenge(fd);
                // server redirects to /challenges/[id]
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't create");
              }
            });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
              Name
            </label>
            <input
              name="name"
              required
              maxLength={60}
              placeholder="e.g. May Push-up Challenge"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              maxLength={280}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                Category
              </label>
              <select
                name="category"
                defaultValue="Health"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
                Days
              </label>
              <input
                name="days"
                type="number"
                min={1}
                max={180}
                defaultValue={30}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition tabular-nums"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
