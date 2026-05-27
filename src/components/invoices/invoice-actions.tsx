"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateInvoiceStatus, deleteInvoice } from "@/app/actions/invoices";
import type { InvoiceStatus } from "@/types";

const STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "OVERDUE", label: "Overdue" },
];

export function InvoiceStatusSelect({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, value as InvoiceStatus);
        toast.success("Status updated");
      } catch {
        toast.error("Failed to update status");
      }
    });
  }

  return (
    <Select value={status} onValueChange={(v) => { if (v) handleChange(v); }} disabled={pending} items={STATUSES.map(s => ({ value: s.value, label: s.label }))}>
      <SelectTrigger className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value} label={s.label}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteInvoice(invoiceId);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("NEXT_REDIRECT")) {
          toast.error("Failed to delete invoice");
        }
      }
    });
  }

  return (
    <Button
      variant="outline"
      className="text-destructive hover:text-destructive"
      disabled={pending}
      onClick={handleDelete}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
