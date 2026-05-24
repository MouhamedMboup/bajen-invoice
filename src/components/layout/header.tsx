"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/invoices": "Invoices",
  "/invoices/new": "New Invoice",
  "/customers": "Customers",
  "/products": "Products",
  "/expenses": "Expenses",
  "/team": "Team",
  "/settings": "Settings",
};

export function AppHeader() {
  const pathname = usePathname();

  const title =
    Object.entries(titles).find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1] ??
    "Bajen Invoice";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="font-semibold text-sm">{title}</h1>
    </header>
  );
}
