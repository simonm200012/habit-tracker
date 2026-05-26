import { login, signup } from "./actions";

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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-sky-50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold mb-1">habit-tracker</h1>
        <p className="text-sm text-neutral-500 mb-6">Sign in to track your habits.</p>

        <form className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <input
            type="password"
            name="password"
            placeholder="password (min 6 chars)"
            required
            minLength={6}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {sp.error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{sp.error}</p>
          )}
          {sp.message && (
            <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              {sp.message}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              formAction={login}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg transition"
            >
              Log in
            </button>
            <button
              formAction={signup}
              className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-medium py-2 rounded-lg transition"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
