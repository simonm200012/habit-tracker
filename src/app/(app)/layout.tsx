import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { maybeSeedSampleData } from "@/lib/seed";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Seed new users with realistic sample data so the dashboard feels complete on first visit.
  await maybeSeedSampleData();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <Sidebar email={user.email ?? "you"} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
