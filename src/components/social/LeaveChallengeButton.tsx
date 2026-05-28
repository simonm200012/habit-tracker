"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { leaveChallenge } from "@/app/social/actions";

export function LeaveChallengeButton({ challengeId }: { challengeId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("Leave this challenge?")) return;
        startTransition(async () => {
          try {
            await leaveChallenge(challengeId);
            toast("Left the challenge");
          } catch {
            toast.error("Couldn't leave");
          }
        });
      }}
      disabled={pending}
      className="text-sm font-semibold text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition disabled:opacity-60"
    >
      Leave
    </button>
  );
}
