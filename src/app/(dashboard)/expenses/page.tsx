import type { Metadata } from "next";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Expenses — Bajen Invoice" };

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Track and categorize business expenses.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No expenses recorded yet.</p>
      </div>
    </div>
  );
}
