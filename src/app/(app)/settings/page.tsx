import { createClient } from "@/lib/supabase/server";
import { AccountNameForm } from "@/components/AccountNameForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const currentName: string =
    (profile?.display_name as string | null) ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-3xl mx-auto">
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-600 text-sm mt-1">Account preferences.</p>
      </div>

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Account name</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              How you appear in greetings, the sidebar, and to partners.
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-700">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
        <AccountNameForm currentName={currentName} />
      </section>

      <section className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-6">
        <h2 className="text-base font-bold text-slate-900 tracking-tight mb-1">Email</h2>
        <p className="text-sm text-slate-700 font-medium tabular-nums">{user.email}</p>
        <p className="text-xs text-slate-500 mt-1">
          Email changes aren&apos;t supported here yet — manage in Supabase.
        </p>
      </section>
    </main>
  );
}
