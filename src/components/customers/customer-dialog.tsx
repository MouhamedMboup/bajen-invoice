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
import { createCustomer, updateCustomer } from "@/app/actions/customers";
import type { Customer } from "@/types";

interface CustomerDialogProps {
  customer?: Customer;
  trigger?: React.ReactElement<{ onClick?: () => void }>;
}

export function CustomerDialog({ customer, trigger }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const isEdit = !!customer;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (isEdit) {
          await updateCustomer(customer.id, formData);
          toast.success("Customer updated");
        } else {
          await createCustomer(formData);
          toast.success("Customer created");
          formRef.current?.reset();
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
        Add Customer
      </Button>
    );

  return (
    <>
      {triggerEl}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Customer" : "New Customer"}</DialogTitle>
          </DialogHeader>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  required
                  defaultValue={customer?.companyName}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  defaultValue={customer?.contactName ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={customer?.phone ?? ""}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={customer?.email ?? ""}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Textarea
                  id="billingAddress"
                  name="billingAddress"
                  rows={2}
                  defaultValue={customer?.billingAddress ?? ""}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Textarea
                  id="shippingAddress"
                  name="shippingAddress"
                  rows={2}
                  defaultValue={customer?.shippingAddress ?? ""}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  defaultValue={customer?.notes ?? ""}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditCustomerButton({ customer }: { customer: Customer }) {
  return (
    <CustomerDialog
      customer={customer}
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      }
    />
  );
}
