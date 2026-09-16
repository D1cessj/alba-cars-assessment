export default function SetupRequiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <h1 className="text-base font-semibold">Supabase isn&apos;t configured yet</h1>
        <p className="mt-2">
          <code className="rounded bg-amber-100 px-1 py-0.5">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          are missing from your environment. Copy{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">.env.local.example</code>{" "}
          to <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code>, fill
          in your project&apos;s values from the Supabase dashboard
          (Project Settings → API), and restart the dev server.
        </p>
        <p className="mt-2">See README.md &quot;Setup from zero&quot; for the full walkthrough.</p>
      </div>
    </main>
  );
}
