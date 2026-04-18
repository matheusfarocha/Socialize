"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Mail, Lock, Eye, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const DEMO_EMAIL = "demo@socialize.app";
const DEMO_PASSWORD = "demo1234";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (!signInError) {
      setLoading(false);
      router.push("/");
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    router.push("/");
  }

  return (
    <section className="w-full lg:w-1/2 bg-surface flex items-center justify-center p-8 md:p-16 lg:p-24 relative">
      <div className="w-full max-w-md">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-12">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center">
            <Coffee size={14} className="text-surface" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-on-surface font-headline">
            Socialize
          </span>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-3 font-headline">
            Business Login
          </h1>
          <p className="text-on-surface-variant font-medium">
            Welcome back to the hearth. Please enter your credentials to access
            your dashboard.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          {/* Email */}
          <div className="space-y-2">
            <label
              className="block text-sm font-semibold tracking-wide text-on-surface-variant ml-1"
              htmlFor="email"
            >
              Email Address
            </label>
            <div className="bg-surface-container-highest flex items-center px-6 py-4 rounded-xl transition-all focus-within:bg-primary-fixed focus-within:ring-1 focus-within:ring-primary">
              <Mail size={18} className="text-outline mr-3 shrink-0" />
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none w-full text-on-surface placeholder:text-outline"
                id="email"
                name="email"
                defaultValue={DEMO_EMAIL}
                placeholder="owner@boutique.com"
                type="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label
                className="block text-sm font-semibold tracking-wide text-on-surface-variant"
                htmlFor="password"
              >
                Password
              </label>
              <a
                className="text-xs font-bold text-primary hover:text-on-primary-container transition-colors"
                href="#"
              >
                Forgot Password?
              </a>
            </div>
            <div className="bg-surface-container-highest flex items-center px-6 py-4 rounded-xl transition-all focus-within:bg-primary-fixed focus-within:ring-1 focus-within:ring-primary">
              <Lock size={18} className="text-outline mr-3 shrink-0" />
              <input
                className="bg-transparent border-none focus:ring-0 focus:outline-none w-full text-on-surface placeholder:text-outline"
                id="password"
                name="password"
                defaultValue={DEMO_PASSWORD}
                placeholder="••••••••"
                type="password"
              />
              <Eye
                size={18}
                className="text-outline ml-3 cursor-pointer hover:text-on-surface transition-colors shrink-0"
              />
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-3 ml-1">
            <input
              className="w-5 h-5 rounded border-none bg-surface-container-highest text-primary focus:ring-primary/20"
              id="remember"
              name="remember"
              type="checkbox"
              defaultChecked
            />
            <label
              className="text-sm font-medium text-on-surface-variant select-none"
              htmlFor="remember"
            >
              Keep me logged in
            </label>
          </div>

          {error && (
            <p className="text-error text-sm font-medium bg-error-container/30 px-4 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* CTA */}
          <button
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-lg rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-8 font-headline disabled:opacity-60"
            type="submit"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Enter Dashboard
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-on-surface-variant/60">
          Demo mode — credentials pre-filled
        </p>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-outline-variant/30 text-center">
          <p className="text-on-surface-variant text-sm font-medium">
            Not a partner yet?
            <a
              className="text-primary font-bold ml-1 hover:underline decoration-2 underline-offset-4"
              href="#"
            >
              Apply for a Business Account
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
