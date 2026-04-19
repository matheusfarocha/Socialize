import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { ArrowRight, Compass, Coffee, QrCode, Users } from "lucide-react";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Dashboard | Socialize",
  description: "A lighter visual landing page for Socialize.",
};

const steps = [
  {
    number: "01",
    title: "Scan",
    body: "Open the venue in one tap.",
    icon: QrCode,
  },
  {
    number: "02",
    title: "See",
    body: "Read the room before it disappears.",
    icon: Compass,
  },
  {
    number: "03",
    title: "Join",
    body: "Walk to the right table and connect.",
    icon: Users,
  },
];

const signals = [
  { value: "24", label: "live tables" },
  { value: "63", label: "conversations" },
  { value: "+22%", label: "repeat visits" },
];

export default function DashboardPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#fff8ef_0%,#f6eee1_40%,#eee2d4_100%)] text-on-surface">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-4rem] h-80 w-80 rounded-full bg-[rgba(195,122,31,0.16)] blur-3xl" />
        <div className="absolute right-[-8rem] top-20 h-96 w-96 rounded-full bg-[rgba(114,155,118,0.12)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[rgba(255,255,255,0.34)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1500px] px-5 pb-16 pt-5 md:px-10 md:pb-20">
        {/* ── Header ── */}
        <header className="flex items-center justify-between border-b border-primary/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Coffee size={16} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary/70">Socialize</p>
              <p className="text-[11px] text-on-surface-variant">Cafe presence, minus the friction.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-4 py-2 text-sm font-semibold text-on-surface backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5"
            >
              Explore map
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-transform duration-200 hover:-translate-y-0.5"
            >
              Open Socialize
              <ArrowRight size={14} />
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="grid min-h-[80vh] items-center gap-10 border-b border-primary/10 py-10 lg:grid-cols-[0.88fr_1.12fr] lg:py-12">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-primary/70">
              Live room for cafes
            </p>
            {/* ↓ Reduced max from 8.2rem → 6.4rem; tightened leading slightly */}
            <h1
              className={`${fraunces.className} mt-4 text-[clamp(2.8rem,6.5vw,6.4rem)] font-medium leading-[0.90] tracking-[-0.04em] text-on-surface`}
            >
              Turn a cafe into a room people can read.
            </h1>
            {/* ↓ Reduced max from 3.2rem → 2.4rem */}
            <p className={`${fraunces.className} mt-4 text-[clamp(1.4rem,2.4vw,2.4rem)] italic leading-[1.05] text-primary`}>
              Scan. See. Sit together.
            </p>
            <p className="mt-6 max-w-xl text-base leading-7 text-on-surface-variant">
              Guests find the right people. Venues get repeat energy. That is the whole pitch.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-on-primary shadow-[0_14px_30px_rgba(134,83,0,0.2)] transition-transform duration-200 hover:-translate-y-1"
              >
                Open Socialize
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-white/72 px-5 py-3.5 text-sm font-semibold text-on-surface backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1"
              >
                Explore cafe map
                <Compass size={15} />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant/60">
              <span>third places</span>
              <span>presence</span>
              <span>anonymous-first</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-[8%] top-[6%] h-[78%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0)_72%)] blur-2xl" />
            <div className="relative mx-auto aspect-[5/4] w-full max-w-4xl overflow-hidden rounded-[34%_66%_42%_58%_/_28%_36%_64%_72%] border border-white/55 bg-white/28 shadow-[0_35px_90px_rgba(74,70,64,0.12)] backdrop-blur-xl">
              <Image
                src="/dashboard-cafe-hero.svg"
                alt="Warm cafe illustration"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* ── Steps ── */}
        <section className="border-b border-primary/10 py-10 md:py-14">
          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article key={step.number} className="border-t border-primary/12 pt-5">
                  <div className="flex items-center gap-3">
                    {/* ↓ Step number reduced from text-4xl → text-3xl */}
                    <span className={`${fraunces.className} text-3xl font-medium leading-none text-primary/85`}>
                      {step.number}
                    </span>
                    <Icon size={15} className="text-primary/70" />
                  </div>
                  {/* ↓ Step title reduced from text-3xl → text-2xl */}
                  <h2 className={`${fraunces.className} mt-3 text-2xl font-medium leading-snug text-on-surface`}>
                    {step.title}
                  </h2>
                  <p className="mt-2.5 text-sm leading-6 text-on-surface-variant">{step.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── Room signal ── */}
        <section className="grid gap-10 border-b border-primary/10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-14">
          <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-[3rem] border border-white/55 bg-white/26 shadow-[0_30px_80px_rgba(74,70,64,0.1)] backdrop-blur-xl">
            <Image
              src="/dashboard-room-signal.svg"
              alt="Live room and people signal illustration"
              fill
              className="object-cover"
            />
          </div>

          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-primary/70">
              Main crux
            </p>
            {/* ↓ Reduced from text-5xl → text-4xl */}
            <h2 className={`${fraunces.className} mt-3 text-4xl font-medium leading-[0.94] tracking-[-0.03em] text-on-surface`}>
              The room becomes legible.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-on-surface-variant">
              People know who is around. Owners know what keeps the room alive.
            </p>

            <div className="mt-8 grid gap-6 border-t border-primary/12 pt-6 md:grid-cols-3">
              {signals.map((signal) => (
                <div key={signal.label}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary/65">
                    {signal.label}
                  </p>
                  {/* ↓ Reduced from text-4xl/5xl → text-3xl/4xl */}
                  <p className={`${fraunces.className} mt-2.5 text-3xl font-medium leading-none text-on-surface md:text-4xl`}>
                    {signal.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why it matters ── */}
        <section className="grid gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-14">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-primary/70">
              Why it matters
            </p>
            {/* ↓ Reduced from text-5xl → text-4xl */}
            <h2 className={`${fraunces.className} mt-3 text-4xl font-medium leading-[0.94] tracking-[-0.03em] text-on-surface`}>
              Better than another loyalty punch card.
            </h2>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">
              Socialize gives cafes a memory. Not just more software.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold text-on-primary shadow-[0_14px_30px_rgba(134,83,0,0.2)] transition-transform duration-200 hover:-translate-y-1"
              >
                Open Socialize
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-white/72 px-5 py-3.5 text-sm font-semibold text-on-surface backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1"
              >
                Explore the map
                <Compass size={15} />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-[38%_62%_44%_56%_/_38%_28%_72%_62%] border border-white/55 bg-white/28 shadow-[0_35px_90px_rgba(74,70,64,0.12)] backdrop-blur-xl">
            <Image
              src="/dashboard-coffee-signal.svg"
              alt="Coffee cup and signal illustration"
              fill
              className="object-cover"
            />
          </div>
        </section>
      </div>
    </main>
  );
}