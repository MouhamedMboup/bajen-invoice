"use client";

import React, { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpense, updateExpense } from "@/app/actions/expenses";
import type { Expense } from "@/types";

const EXPENSE_CATEGORIES = [
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "SALARY", label: "Salary" },
  { value: "UTILITY", label: "Utility" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "OTHER", label: "Other" },
] as const;

interface ExpenseDialogProps {
  expense?: Expense;
  trigger?: React.ReactElement<{ onClick?: () => void }>;
}

export function ExpenseDialog({ expense, trigger }: ExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState(expense?.category ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!expense;

  const defaultDate = expense
    ? new Date(expense.date).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category", category);

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateExpense(expense.id, formData);
          toast.success("Expense updated");
        } else {
          await createExpense(formData);
          toast.success("Expense recorded");
          formRef.current?.reset();
          setCategory("");
        }
        setOpen(false);
      } catch {
        toast.error("Something went wrong");
      }
    });
  }

  const triggerEl = trigger
    ? React.cloneElement(trigger, { onClick: () => setOpen(true) })
    : (
      <Button onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Expense
      </Button>
    );

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Expense" : "Record Expense"}</DialogTitle>
          </DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={category} onValueChange={(v) => { if (v) setCategory(v); }} items={EXPENSE_CATEGORIES.map(c => ({ value: c.value, label: c.label }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} label={c.label}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min={0}
                  required
                  defaultValue={expense?.amount?.toString()}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={defaultDate}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={expense?.description ?? ""}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !category}>
                {pending ? "Saving…" : isEdit ? "Save Changes" : "Record Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditExpenseButton({ expense }: { expense: Expense }) {
  return (
    <ExpenseDialog
      expense={expense}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );
}
