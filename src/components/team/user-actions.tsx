"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Role } from "@/types";
import { updateUserRole, toggleUserActive } from "@/app/actions/team";
import { Button } from "@/components/ui/button";

interface UserActionsProps {
  userId: string;
  currentRole: Role;
  isActive: boolean;
  isSelf: boolean;
}

export function UserActions({ userId, currentRole, isActive, isSelf }: UserActionsProps) {
  const [rolePending, startRoleTransition] = useTransition();
  const [activePending, startActiveTransition] = useTransition();

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value as Role;
    startRoleTransition(async () => {
      try {
        await updateUserRole(userId, newRole);
        toast.success("Role updated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update role");
      }
    });
  }

  function handleToggleActive() {
    startActiveTransition(async () => {
      try {
        await toggleUserActive(userId, !isActive);
        toast.success(isActive ? "User deactivated" : "User reactivated");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update status");
      }
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
        className="h-8 rounded-md border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        <option value="EMPLOYEE">Employee</option>
        <option value="ADMIN">Admin</option>
      </select>

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
