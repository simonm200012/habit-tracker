import { login, signup } from "./actions";
import { Logo } from "@/components/nav/Logo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <LoginForm searchParams={searchParams} />;
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-stone-100 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Logo size={56} />
        </div>
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-900/5 ring-1 ring-slate-200/70 p-8">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Sign in to track your habits.
          </p>

          <form className="space-y-3">
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />
            <input
              type="password"
              name="password"
              placeholder="password (min 6 chars)"
              required
              minLength={6}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition"
            />

            {sp.error && (
              <p className="text-sm font-medium text-rose-700 bg-rose-50 ring-1 ring-rose-200 px-3 py-2 rounded-lg">
                {sp.error}
              </p>
            )}
            {sp.message && (
              <p className="text-sm font-medium text-emerald-800 bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 rounded-lg">
                {sp.message}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                formAction={login}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg shadow-sm transition"
              >
                Log in
              </button>
              <button
                formAction={signup}
                className="flex-1 bg-white hover:bg-slate-50 text-slate-900 font-semibold py-2.5 rounded-lg border border-slate-200 transition"
              >
                Sign up
              </button>
            </div>
          </form>
        </div>
        <p className="text-center text-xs text-slate-500 mt-6">
          Your data stays private — row-level security in Supabase.
        </p>
      </div>
    </main>
  );
}
