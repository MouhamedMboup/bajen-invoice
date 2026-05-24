import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Redact password from URL for safe logging
function redact(url: string) {
  try {
    const u = new URL(url);
    u.password = "***";
    return u.toString();
  } catch {
    return url.replace(/:([^@]+)@/, ":***@");
  }
}

// Expose the actual computed connection string (password redacted)
function getComputedUrl(): string {
  const raw = process.env.VERCEL
    ? process.env.DATABASE_URL!
    : (process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
  const stripped = (raw ?? "").split("?")[0];
  if (stripped.includes(".pooler.supabase.com")) {
    const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
      .replace("https://", "").split(".")[0];
    if (projectRef && !stripped.includes(`postgres.${projectRef}`)) {
      return redact(stripped.replace(/^(postgr(?:es|esql):\/\/)postgres:/, `$1postgres.${projectRef}:`));
    }
  }
  return redact(stripped);
}

export async function GET() {
  const isVercel = !!process.env.VERCEL;
  const computedUrl = getComputedUrl();
  const rawDbUrl = redact(process.env.DATABASE_URL ?? "(not set)");
  const rawDirectUrl = redact(process.env.DIRECT_URL ?? "(not set)");

  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json({ db: "connected", isVercel, computedUrl, rawDbUrl, rawDirectUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ db: "failed", error: msg, isVercel, computedUrl, rawDbUrl, rawDirectUrl }, { status: 500 });
  }
}
