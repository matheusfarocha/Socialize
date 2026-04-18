"use client";

import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[linear-gradient(180deg,#fffbff_0%,#f5f0eb_100%)] px-6 py-12">
      <section className="w-full max-w-3xl rounded-[2rem] border border-outline-variant/50 bg-surface p-8 text-center shadow-[0_20px_80px_rgba(74,70,64,0.08)] md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
          <AlertTriangle size={28} />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
          Portal Error
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-on-surface md:text-5xl">
          Something went wrong on this page.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-on-surface-variant md:text-lg">
          Refresh the experience with one click, or head back to the main portal.
        </p>
        {error.message ? (
          <p className="mx-auto mt-4 max-w-2xl rounded-2xl bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
            {error.message}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90"
          >
            <RotateCw size={18} />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
          >
            Back To Home
          </Link>
        </div>
      </section>
    </main>
  );
}
