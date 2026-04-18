import Link from "next/link";
import { Coffee, MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,#ffe1c8_0%,#fffbff_38%,#f5f0eb_100%)] px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-outline-variant/50 bg-surface p-8 text-center shadow-[0_20px_80px_rgba(74,70,64,0.08)] md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-primary">
          <Coffee size={28} />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          Error 404
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
          We couldn&apos;t find that venue page.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-on-surface-variant md:text-lg">
          The link may be out of date, or the venue may no longer be published here.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <MapPin size={18} />
            Go To Home
          </Link>
        </div>
      </section>
    </main>
  );
}
