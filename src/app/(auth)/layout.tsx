import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — Bajen Invoice",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      {children}
    </div>
  );
}
