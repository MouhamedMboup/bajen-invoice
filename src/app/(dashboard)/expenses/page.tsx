import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseDialog, EditExpenseButton } from "@/components/expenses/expense-dialog";
import { DeleteExpenseButton } from "@/components/expenses/delete-expense-button";

export const metadata: Metadata = { title: "Expenses — Bajen Invoice" };

const CATEGORY_LABELS: Record<string, string> = {
  WAREHOUSE: "Warehouse",
  TRANSPORT: "Transport",
  SALARY: "Salary",
  UTILITY: "Utility",
  PURCHASE: "Purchase",
  OTHER: "Other",
};

export default async function ExpensesPage() {
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: { createdBy: { select: { fullName: true } } },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">Track and categorize business expenses.</p>
        </div>
        <ExpenseDialog />
      </div>

      {expenses.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold">${total.toFixed(2)}</p>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">No expenses recorded yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    {new Date(e.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{CATEGORY_LABELS[e.category]}</Badge>
                  </TableCell>
                  <TableCell>{e.description ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${Number(e.amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.createdBy.fullName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <EditExpenseButton expense={e} />
                      <DeleteExpenseButton id={e.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
