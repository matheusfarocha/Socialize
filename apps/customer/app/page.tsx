import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Coffee, Store } from "lucide-react";

function createPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export default async function Home() {
  const supabase = createPublicSupabase();

  if (supabase) {
    const { data: venues } = await supabase
      .from("venues")
      .select("slug, name")
      .order("name", { ascending: true })
      .limit(1);

    const firstVenue = venues?.find((venue) => venue.slug);
    if (firstVenue?.slug) {
      redirect(`/v/${firstVenue.slug}`);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,#ffe1c8_0%,#fffbff_38%,#f5f0eb_100%)] px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-outline-variant/50 bg-surface p-8 text-center shadow-[0_20px_80px_rgba(74,70,64,0.08)] md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-primary">
          <Coffee size={28} />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          Customer App
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
          No venue is published yet.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-on-surface-variant md:text-lg">
          This app now opens the first real venue slug it can find. If you see this screen, either
          Supabase env vars are missing or no venue row exists yet.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={process.env.NEXT_PUBLIC_BUSINESS_APP_URL || "http://localhost:3001"}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <Store size={18} />
            Open Business App
          </Link>
        </div>
      </section>
    </main>
  );
}
