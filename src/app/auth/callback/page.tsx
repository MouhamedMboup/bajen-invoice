"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash;
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const next = params.get("next") ?? "/dashboard";

      // Implicit flow: token in URL hash (magic links, invite links)
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") ?? "";

        if (accessToken) {
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
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (!error) {
          router.replace(next);
          return;
        }
      }

      // Nothing matched — send to login
      router.replace("/login");
    }

    handleCallback();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}
