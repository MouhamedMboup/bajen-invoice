"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get("type");
      const accessToken = hashParams.get("access_token");
      const tokenHash = hashParams.get("token_hash");

      if ((accessToken || tokenHash) && (type === "recovery" || type === "invite")) {
        // Forward to the auth callback with hash intact so it can process the token
        router.replace(`/auth/callback${hash}`);
        return;
      }
    }
    router.replace("/dashboard");
  }, []);

  return null;
}
