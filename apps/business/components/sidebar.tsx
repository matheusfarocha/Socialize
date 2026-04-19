"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  Armchair,
  UtensilsCrossed,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: Receipt },
  { label: "Insights", href: "/insights", icon: BarChart3 },
  { label: "Floor Plan", href: "/floor-plan", icon: Armchair },
  { label: "Menu", href: "/menu", icon: UtensilsCrossed },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [venueName, setVenueName] = useState("Loading...");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setVenueName("My Venue"); return; }
      const { data: venue } = await supabase
        .from("venues")
        .select("name")
        .eq("owner_id", user.id)
        .single();
      setVenueName(venue?.name ?? "My Venue");
    }
    load();
  }, []);

  return (
    <nav className="fixed left-0 top-0 h-screen flex flex-col p-6 w-64 bg-surface z-50">
      <div className="mb-10 pl-2">
        <h1 className="text-xl font-bold text-on-surface tracking-tighter font-headline">
          {venueName}
        </h1>
        <p className="text-xs text-on-surface-variant mt-1">Downtown Branch</p>
      </div>

      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-colors duration-200 font-headline ${
                isActive
                  ? "bg-surface-container-low text-primary font-bold border-r-4 border-primary"
                  : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-low"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-outline-variant/20 pt-4 relative">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-on-surface/60 hover:text-on-surface hover:bg-surface-container-low transition-colors duration-200 font-headline font-medium text-sm tracking-wide"
        >
          <Settings size={20} />
          Settings
        </button>

        {settingsOpen && (
          <div className="absolute bottom-full left-4 mb-2 w-48 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 overflow-hidden">
            <button
              onClick={() => router.push("/login")}
              className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-error-container/30 transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              Log out
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 px-4 py-2">
        <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline font-bold text-sm">
          MP
        </div>
      </div>
    </nav>
  );
}
