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

export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? "(not set)";
  const directUrl = process.env.DIRECT_URL ?? "(not set)";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(not set)";
  const isVercel = !!process.env.VERCEL;

  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json({
      db: "connected",
      isVercel,
      dbUrl: redact(dbUrl),
      directUrl: redact(directUrl),
      supabaseUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      db: "failed",
      error: msg,
      isVercel,
      dbUrl: redact(dbUrl),
      directUrl: redact(directUrl),
      supabaseUrl,
    }, { status: 500 });
  }
}
