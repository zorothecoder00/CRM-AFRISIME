"use client";

import { useState } from "react";
import { useAction } from "@/hooks/use-action";
import { updateRetentionPolicy } from "@/actions/retention.actions";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type DataType = "AUDIT_LOG" | "NOTIFICATION" | "INTEGRATION_EVENT" | "METRIC_SNAPSHOT" | "TRASH";

export function RetentionPolicyRow({
  dataType,
  label,
  description,
  initialDays,
  initialActive,
}: {
  dataType: DataType;
  label: string;
  description: string;
  initialDays: number;
  initialActive: boolean;
}) {
  const [days, setDays] = useState(initialDays);
  const [active, setActive] = useState(initialActive);
  const { run, isPending } = useAction(updateRetentionPolicy, { successMessage: "Politique mise à jour." });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 w-20"
            disabled={isPending}
          />
          <span className="text-xs text-muted-foreground">jours</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch
            checked={active}
            onCheckedChange={(v) => setActive(v)}
            disabled={isPending}
          />
          <Label className="text-xs text-muted-foreground">Active</Label>
        </div>
        <button
          type="button"
          className="text-xs text-primary hover:underline disabled:opacity-50"
          disabled={isPending}
          onClick={() => run({ dataType, retentionDays: days, isActive: active })}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
