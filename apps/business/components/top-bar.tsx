"use client";

import { Bell, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

export function TopBar({ children }: { children?: React.ReactNode }) {
  const { mounted, theme, toggleTheme } = useTheme();
  const isDark = mounted && theme === "dark";

  return (
    <header className="fixed top-0 right-0 left-64 flex justify-between items-center px-8 py-4 z-40 bg-surface/70 backdrop-blur-xl h-[72px]">
      <div className="flex items-center gap-6">{children}</div>
      <div className="flex items-center gap-2">
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface/70 hover:bg-surface-container-low transition-colors duration-200">
          <Bell size={20} />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface/70 hover:bg-surface-container-low transition-colors duration-200"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
