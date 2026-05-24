"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const features = [
  "Create professional invoices in seconds",
  "Track inventory & stock levels in real time",
  "Monitor payments, expenses & profit",
  "Collaborate with your entire team",
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">

      {/* ── LEFT PANEL — Branding ───────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col justify-between overflow-hidden bg-primary px-14 py-12">

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-black/10 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-2xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="inline-flex items-center rounded-xl bg-white px-3 py-2">
            <Image
              src="/logo.png"
              alt="Bajen Sheabutter INC."
              width={150}
              height={52}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white">
              Wholesale management,
              <br />
              <span className="text-white/75">simplified.</span>
            </h1>
            <p className="text-base text-white/60 leading-relaxed max-w-sm">
              The all-in-one platform built for Bajen Sheabutter INC. — from invoicing
              to inventory, all in one place.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-white/50" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom note */}
        <p className="relative z-10 text-xs text-white/35">
          © {new Date().getFullYear()} Bajen Sheabutter INC. — Internal platform
        </p>
      </div>

      {/* ── RIGHT PANEL — Form ──────────────────────────────────── */}
      <div className="flex w-full lg:w-[48%] flex-col items-center justify-center bg-white px-8 py-12 sm:px-16">

        {/* Mobile-only logo */}
        <div className="mb-10 lg:hidden">
          <Image
            src="/logo.png"
            alt="Bajen Sheabutter INC."
            width={160}
            height={56}
            className="object-contain"
            priority
          />
        </div>

        <div className="w-full max-w-[400px] space-y-8">

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-[28px] font-bold tracking-tight text-gray-900">
              Welcome back
            </h2>
            <p className="text-sm text-gray-500">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-12 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-primary/20 focus:ring-2 rounded-xl shadow-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <Link
                  href="/reset-password"
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-12 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-primary/20 focus:ring-2 rounded-xl shadow-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl text-sm font-semibold tracking-wide shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px transition-all duration-150 disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400">
            Access restricted to authorized Bajen employees only.
          </p>
        </div>
      </div>
    </div>
  );
}
