"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { savePublicProfile, deletePublicProfile } from "@/app/social/actions";
import type { PublicProfile } from "@/lib/types";

export function PublicProfileForm({
  profile,
  baseUrl,
}: {
  profile: PublicProfile | null;
  baseUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(profile?.slug ?? "");

  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Public profile</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {profile
              ? `Live at ${baseUrl}/u/${profile.slug}`
              : "Create a shareable URL to showcase your habits"}
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-700">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
      </div>

      <form
        action={(fd) => {
          startTransition(async () => {
            try {
              await savePublicProfile(fd);
              toast.success("Profile saved");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't save");
            }
          });
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            URL slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">{baseUrl}/u/</span>
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              required
              minLength={3}
              maxLength={31}
              pattern="[a-z0-9][a-z0-9_-]{2,30}"
              placeholder="your-handle"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">3–31 chars · lowercase letters, numbers, - and _</p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            Display name
          </label>
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ""}
            placeholder="Optional"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            Bio
          </label>
          <textarea
            name="bio"
            defaultValue={profile?.bio ?? ""}
            maxLength={280}
            placeholder="One sentence about your habits…"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          {[
            { id: "is_public", label: "Public", default: profile?.is_public ?? true },
            { id: "show_streaks", label: "Show streaks", default: profile?.show_streaks ?? true },
            { id: "show_achievements", label: "Show achievements", default: profile?.show_achievements ?? true },
          ].map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 ring-1 ring-slate-200 hover:bg-slate-100 cursor-pointer transition"
            >
              <input
                type="checkbox"
                name={s.id}
                defaultChecked={s.default}
                className="w-4 h-4 rounded accent-slate-900"
              />
              <span className="text-sm font-semibold text-slate-700">{s.label}</span>
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold shadow-sm transition disabled:opacity-60"
          >
            {pending ? "Saving…" : profile ? "Save changes" : "Create profile"}
          </button>
          {profile && (
            <>
              <a
                href={`/u/${profile.slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-sm font-semibold text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-50"
              >
                View ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  if (!confirm("Delete your public profile?")) return;
                  startTransition(async () => {
                    await deletePublicProfile();
                    toast("Profile deleted");
                  });
                }}
                className="ml-auto px-3 py-2 text-sm font-semibold text-rose-700 rounded-lg border border-rose-200 hover:bg-rose-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
