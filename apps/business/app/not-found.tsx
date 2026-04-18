import Link from "next/link";
import { Compass, Home, MenuSquare } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ffddb9_0%,#fdf9f3_38%,#f7f3ed_100%)] px-6 py-12 text-on-surface">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-4xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-outline-variant/40 bg-surface-container-lowest/90 p-8 shadow-[0_20px_80px_rgba(81,68,55,0.08)] backdrop-blur md:p-12">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-on-primary">
            <Compass size={26} />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            Error 404
          </p>
          <h1 className="mt-3 font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            This page isn&apos;t in the dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-on-surface-variant md:text-lg">
            The route may have moved, the link may be stale, or the page was never created.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
            >
              <MenuSquare size={18} />
              Open Menu Dashboard
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface px-5 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
            >
              <Home size={18} />
              Back To Login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
