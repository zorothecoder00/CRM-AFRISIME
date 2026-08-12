"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
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
  const { run, isPending } = useAction(toggleRolePermission);

  async function handleChange(next: boolean) {
    setChecked(next);
    const result = await run(roleId, permissionKey, next);
    if (!result.ok) setChecked(!next);
  }

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={(v) => handleChange(v === true)}
      disabled={disabled || isPending}
    />
  );
}
