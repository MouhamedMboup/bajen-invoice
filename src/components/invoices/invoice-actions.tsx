"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateInvoiceStatus } from "@/app/actions/invoices";
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
