import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/database.types";

// This dashboard is entirely per-user (RLS-scoped) data behind auth — it
// must never be statically cached across users. Setting this on the
// layout forces every page under it dynamic too.
export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/vehicles", label: "Inventory" },
  { href: "/sales", label: "Sales" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                Alba Cars
              </p>
              <p className="text-sm font-medium text-slate-500">Dealership Dashboard</p>
            </div>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{profile.full_name}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {profile.role}
                </p>
              </div>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
