"use client";

import { useState } from "react";
import { toast } from "sonner";
import { toggleRolePermission } from "@/actions/role.actions";
import { Checkbox } from "@/components/ui/checkbox";
import type { PermissionKey } from "@/lib/permissions";

export function RolePermissionCheckbox({
  roleId,
  permissionKey,
  initialChecked,
  disabled,
}: {
  roleId: string;
  permissionKey: PermissionKey;
  initialChecked: boolean;
  disabled?: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleChange(next: boolean) {
    setChecked(next);
    setIsSubmitting(true);
    try {
      await toggleRolePermission(roleId, permissionKey, next);
    } catch (err) {
      setChecked(!next);
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => handleChange(v === true)}
      disabled={disabled || isSubmitting}
    />
  );
}
