"use client";

import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function InviteLanding() {
  const searchParams = useSearchParams();
  const link = searchParams.get("link");

  function handleAccept() {
    if (link) window.location.href = link;
  }

  if (!link) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Invalid invitation link.</p>
      </div>
    );
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

        <div className="rounded-2xl border bg-white px-8 py-10 shadow-sm space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              You&apos;re invited!
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              You&apos;ve been invited to join Bajen Sheabutter INC. on Bajen Invoice.
              Click the button below to accept and set up your account.
            </p>
          </div>

          <Button
            onClick={handleAccept}
            className="h-12 w-full rounded-xl text-sm font-semibold"
          >
            Accept Invitation
          </Button>

          <p className="text-xs text-gray-400">
            This link expires in 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
