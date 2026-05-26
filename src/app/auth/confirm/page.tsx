"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash;
      const search = window.location.search;
      const params = new URLSearchParams(search);

      // Detect token type from the URL — Supabase may not preserve ?next= through redirects
      const tokenTypeInHash = hash
        ? new URLSearchParams(hash.substring(1)).get("type")
        : null;
      const tokenTypeInQuery = params.get("type");
      const detectedType = tokenTypeInHash ?? tokenTypeInQuery;

      // recovery/invite always need the password-setup page; fall back to that
      // even when ?next= was stripped by Supabase's email redirect chain
      const next =
        params.get("next") ??
        (detectedType === "recovery" || detectedType === "invite"
          ? "/update-password"
          : "/dashboard");

      const isRecovery = next === "/update-password" || detectedType === "recovery";
      let tokenAttempted = false;

      // Implicit flow: token in URL hash (magic links, invite links)
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") ?? "";

        if (accessToken) {
          tokenAttempted = true;
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            router.replace(next);
            return;
          }
        }
      }

      // PKCE flow: code in query string
      const code = params.get("code");
      if (code) {
        tokenAttempted = true;
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          router.replace(next);
          return;
        }
      }

      // token_hash OTP flow
      const tokenHash = params.get("token_hash");
      const type = params.get("type") as Parameters<typeof supabase.auth.verifyOtp>[0]["type"];
      if (tokenHash && type) {
        tokenAttempted = true;
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (!error) {
          router.replace(next);
          return;
        }
      }

      // All attempts failed — route to the right page with context
      if (tokenAttempted && isRecovery) {
        router.replace("/reset-password?error=link_expired");
      } else {
        router.replace("/login");
      }
    }

    handleCallback();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
