"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { acceptPartnerInvite, createPartnerInvite, removePartner } from "@/app/social/actions";
import { InviteCodeCard } from "./InviteCodeCard";

type Partner = {
  user_id: string;
  display_name: string | null;
  slug: string | null;
  activeStreaks: number;
};

export function PartnerSection({
  partners,
  myInviteCode,
  baseShareUrl,
}: {
  partners: Partner[];
  myInviteCode: string | null;
  baseShareUrl: string;
}) {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    startTransition(async () => {
      try {
        await acceptPartnerInvite(code);
        toast.success("Partner added!");
        setCode("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't accept invite");
      }
    });
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Accountability partners
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {partners.length === 0
              ? "Connect with someone to see each other's progress"
              : `${partners.length} partner${partners.length === 1 ? "" : "s"} connected`}
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center ring-1 ring-emerald-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            <circle cx="9" cy="7" r="4" />
          </svg>
        </div>
      </div>

      {partners.length > 0 && (
        <ul className="space-y-2 mb-5">
          {partners.map((p) => (
            <li key={p.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-black text-slate-700">
                {(p.display_name ?? p.slug ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{p.display_name ?? p.slug ?? "Anonymous"}</p>
                <p className="text-xs text-slate-500 font-medium">🔥 {p.activeStreaks}-day total active streak</p>
              </div>
              {p.slug && (
                <a
                  href={`/u/${p.slug}`}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition opacity-0 group-hover:opacity-100"
                >
                  View
                </a>
              )}
              <RemoveButton userId={p.user_id} name={p.display_name ?? p.slug ?? "this partner"} />
            </li>
          ))}
        </ul>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Generate my invite */}
        <InviteCodeCard
          code={myInviteCode}
          label="Your invite code"
          description="Send this to a friend. They'll enter it on their /social page to connect."
          shareUrl={baseShareUrl}
          onGenerate={async () => {
            const c = await createPartnerInvite();
            return c;
          }}
          generateLabel="+ Generate partner invite"
        />

        {/* Enter friend's code */}
        <form
          onSubmit={handleAccept}
          className="p-4 rounded-xl bg-slate-50 ring-1 ring-slate-200"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Have a code?
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD1234"
            maxLength={12}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-900 font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full mt-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition disabled:opacity-60"
          >
            {pending ? "Accepting…" : "Accept invite"}
          </button>
        </form>
      </div>
    </section>
  );
}

function RemoveButton({ userId, name }: { userId: string; name: string }) {
  const [, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm(`Remove ${name} as a partner?`)) return;
        startTransition(async () => {
          await removePartner(userId);
          toast(`Removed ${name}`);
        });
      }}
      className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-md hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
    >
      Remove
    </button>
  );
}
