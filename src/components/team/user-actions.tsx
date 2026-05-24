"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Role } from "@/types";
import { updateUserRole, toggleUserActive, sendPasswordReset } from "@/app/actions/team";
import { Button } from "@/components/ui/button";

interface UserActionsProps {
  userId: string;
  email: string;
  currentRole: Role;
  isActive: boolean;
  isSelf: boolean;
}

export function UserActions({ userId, email, currentRole, isActive, isSelf }: UserActionsProps) {
  const [rolePending, startRoleTransition] = useTransition();
  const [activePending, startActiveTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role;
    startRoleTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Role updated");
    });
  }

  function handleToggleActive() {
    startActiveTransition(async () => {
      const result = await toggleUserActive(userId, !isActive);
      if (result?.error) { toast.error(result.error); return; }
      toast.success(isActive ? "User deactivated" : "User reactivated");
    });
  }

  function handleResend() {
    startResetTransition(async () => {
      const result = await sendPasswordReset(email);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Invite email resent", {
        description: `A password reset link was sent to ${email}.`,
      });
    });
  }

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">You</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={currentRole}
        onChange={handleRoleChange}
        disabled={rolePending}
        className="h-8 cursor-pointer rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <option value="EMPLOYEE">Employee</option>
        <option value="ADMIN">Admin</option>
      </select>

      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        onClick={handleResend}
        disabled={resetPending}
        title={`Resend invite to ${email}`}
      >
        {resetPending ? "…" : "Resend invite"}
      </Button>

      <Button
        size="sm"
        variant={isActive ? "outline" : "default"}
        className="h-8 text-xs"
        onClick={handleToggleActive}
        disabled={activePending}
      >
        {activePending ? "…" : isActive ? "Deactivate" : "Reactivate"}
      </Button>
    </div>
  );
}
