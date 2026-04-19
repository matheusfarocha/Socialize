"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Coffee,
  LayoutGrid,
  UtensilsCrossed,
  Users,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import { readCart, subscribeCart, type StoredCartItem } from "@/lib/order-storage";
import { createPublicSupabaseClient } from "@/lib/supabase";

const publicSupabase = createPublicSupabaseClient();
const emptyCart: StoredCartItem[] = [];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const [venueName, setVenueName] = useState("");
  const [branchName, setBranchName] = useState("");

  const cartItems = useSyncExternalStore(
    (cb) => subscribeCart(slug, cb),
    () => readCart(slug),
    () => emptyCart,
  );

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  useEffect(() => {
    if (!slug) return;
    publicSupabase
      .from("venues")
      .select("name, branch_name")
      .eq("slug", slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setVenueName(data.name);
          setBranchName(data.branch_name ?? "Main Floor");
        }
      });
  }, [slug]);

  const navItems = [
    { href: `/v/${slug}`, label: "Floor Plan", shortLabel: "Floor", icon: LayoutGrid, exact: true },
    { href: `/v/${slug}/menu`, label: "Menu & Order", shortLabel: "Menu", icon: UtensilsCrossed, exact: false },
    { href: `/people?venue=${encodeURIComponent(slug)}`, label: "People Here", shortLabel: "People", icon: Users, exact: false, external: true },
  ];

  function isActive(href: string, exact: boolean, external = false) {
    if (external) return false;
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">

      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-outline-variant/20 bg-surface-container-low h-full">

        {/* Venue branding */}
        <div className="px-5 py-5 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary flex items-center justify-center shrink-0">
              <Coffee size={20} className="text-on-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-on-surface leading-tight truncate">
                {venueName || "Loading…"}
              </p>
              <p className="text-xs text-on-surface-variant truncate">{branchName}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-on-surface-variant/50 px-3 mb-2">
            Navigate
          </p>
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact, item.external);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all ${
                  active
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <item.icon size={17} strokeWidth={active ? 2.5 : 1.75} />
                <span className="flex-1">{item.label}</span>
                {!active && (
                  <ChevronRight size={13} className="opacity-0 group-hover:opacity-30 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Cart widget */}
        <div className="px-3 pb-4 shrink-0">
          <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-outline-variant/10">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag size={14} className="text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant/70">Cart</span>
              {cartCount > 0 && (
                <span className="ml-auto text-[10px] font-extrabold bg-primary text-on-primary px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </div>
            <p className="text-[22px] font-extrabold text-on-surface mt-1 mb-3 leading-none">
              {formatCurrency(cartTotal)}
            </p>
            <Link
              href={`/v/${slug}/menu`}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-on-primary hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              {cartCount > 0 ? (
                <><ShoppingBag size={14} /> View Cart & Checkout</>
              ) : (
                <><UtensilsCrossed size={14} /> Browse Menu</>
              )}
            </Link>
          </div>
        </div>
      </aside>

      {/* ── Content Area ──────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile top header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-primary text-on-primary shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-on-primary/20 flex items-center justify-center shrink-0">
              <Coffee size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate leading-tight">{venueName || slug}</p>
              <p className="text-[10px] text-on-primary/70">{branchName}</p>
            </div>
          </div>
          <Link
            href={`/v/${slug}/menu`}
            className="flex items-center gap-1.5 bg-on-primary/20 rounded-full px-3 py-1.5 text-[11px] font-bold shrink-0"
          >
            <ShoppingBag size={12} />
            {cartCount > 0 ? `${cartCount} items` : "Menu"}
          </Link>
        </header>

        {/* Page content — each child manages its own scroll */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden flex border-t border-outline-variant/20 bg-surface shrink-0">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact, item.external);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors ${
                  active ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                <item.icon size={21} strokeWidth={active ? 2.5 : 1.75} />
                {item.shortLabel}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
