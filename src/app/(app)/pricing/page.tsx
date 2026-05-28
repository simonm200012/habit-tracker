import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSubscription, PRO_FEATURES, FREE_HABIT_LIMIT } from "@/lib/billing";
import { CheckoutButton } from "@/components/CheckoutButton";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sub = await getSubscription(user.id);
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);

  return (
    <main className="px-4 sm:px-6 lg:px-10 py-10 lg:py-16 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-500 mb-3">Pricing</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
          Stay consistent. Forever.
        </h1>
        <p className="text-slate-600 text-base max-w-xl mx-auto">
          Free is generous. Pro unlocks everything — for the price of a coffee a month.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
        {/* Free */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 p-7">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Free</p>
          <p className="text-4xl font-extrabold tracking-tight text-slate-900 mb-1">$0</p>
          <p className="text-xs text-slate-500 mb-6">forever</p>
          <ul className="space-y-2.5 mb-7">
            <Bullet>Up to {FREE_HABIT_LIMIT} habits</Bullet>
            <Bullet>Daily check-offs + streaks</Bullet>
            <Bullet>Achievements + level system</Bullet>
            <Bullet>Calendar + heatmap</Bullet>
            <Bullet>Web push notifications</Bullet>
            <Bullet>Mobile responsive PWA</Bullet>
          </ul>
          {sub.plan === "free" ? (
            <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 py-3 bg-slate-100 rounded-lg">
              Current plan
            </p>
          ) : (
            <Link
              href="/dashboard"
              className="block text-center px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-sm transition"
            >
              Back to dashboard
            </Link>
          )}
        </div>

        {/* Pro */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-lg p-7 text-white relative overflow-hidden">
          <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-400 text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded-full">
            Recommended
          </span>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Pro</p>
          <p className="text-4xl font-extrabold tracking-tight mb-1">
            $4 <span className="text-base font-bold text-slate-400">/ month</span>
          </p>
          <p className="text-xs text-slate-400 mb-6">cancel anytime</p>
          <ul className="space-y-2.5 mb-7">
            <Bullet dark>Everything in Free</Bullet>
            {Object.entries(PRO_FEATURES).map(([k, v]) => (
              <Bullet key={k} dark>{v}</Bullet>
            ))}
          </ul>
          {sub.plan === "pro" ? (
            <p className="text-center text-xs font-bold uppercase tracking-wider text-emerald-400 py-3 bg-white/10 rounded-lg">
              ✓ You&apos;re on Pro
            </p>
          ) : stripeConfigured ? (
            <CheckoutButton />
          ) : (
            <p className="text-center text-xs italic text-slate-400 py-3">
              Stripe not configured on this deploy.
            </p>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-10">
        Questions? Reach out at{" "}
        <a href="mailto:simonm2000@outlook.com" className="text-slate-700 font-semibold hover:underline">
          simonm2000@outlook.com
        </a>
      </p>
    </main>
  );
}

function Bullet({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={dark ? "text-emerald-400 shrink-0 mt-0.5" : "text-emerald-600 shrink-0 mt-0.5"}>✓</span>
      <span className={dark ? "text-slate-200" : "text-slate-700"}>{children}</span>
    </li>
  );
}
