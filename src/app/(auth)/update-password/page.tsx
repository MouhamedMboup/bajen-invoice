"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    async function initSession() {
      // Check if there are tokens in the URL hash (Supabase redirected here directly)
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token") ?? "";

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            // Remove tokens from URL bar without triggering navigation
            window.history.replaceState(null, "", window.location.pathname);
            setSessionReady(true);
            setSessionLoading(false);
            return;
          }
        }
      }

      // No hash — check if there's already a valid session (e.g. logged-in user changing password)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
      } else {
        setError("This link has expired or is invalid. Please request a new one.");
      }
      setSessionLoading(false);
    }

    initSession();

    // Catch session arriving via auth state change (fallback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") && session) {
        setSessionReady(true);
        setSessionLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-[400px] space-y-8">

        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-xl bg-white px-4 py-3 shadow-sm border">
            <Image
              src="/logo.png"
              alt="Bajen Sheabutter INC."
              width={140}
              height={48}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-white px-8 py-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Set your password
            </h2>
            <p className="text-sm text-gray-500">
              Choose a password to complete your account setup.
            </p>
          </div>

          {sessionLoading ? (
            <p className="text-sm text-gray-400">Verifying your link…</p>
          ) : !sessionReady ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error ?? "This link has expired or is invalid."}
              </div>
              <Link
                href="/reset-password"
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  New password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">
                  Confirm password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-gray-200"
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
                className="h-12 w-full rounded-xl text-sm font-semibold"
              >
                {loading ? "Saving…" : "Set password & sign in"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
