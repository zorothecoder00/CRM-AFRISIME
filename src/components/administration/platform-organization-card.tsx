"use client";

import { useRouter } from "next/navigation";
import { useAction } from "@/hooks/use-action";
import { updatePlatformOrganization } from "@/actions/platform-organization.actions";
import {
  PLATFORM_ORGANIZATION_STATUTS,
  PLATFORM_ORGANIZATION_PLANS,
} from "@/lib/validations/platform-organization.schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUT_TONE: Record<string, "success" | "warning" | "secondary"> = {
  ACTIVE: "success",
  SUSPENDUE: "warning",
  ARCHIVEE: "secondary",
};

export type PlatformOrganizationData = {
  id: string;
  nom: string;
  slug: string;
  statut: string;
  plan: string;
};

export function PlatformOrganizationCard({ org }: { org: PlatformOrganizationData }) {
  const router = useRouter();
  const { run, isPending } = useAction(updatePlatformOrganization, { successMessage: "Organisation mise à jour." });

  function handleUpdate(patch: { statut?: string; plan?: string }) {
    run({
      id: org.id,
      nom: org.nom,
      statut: (patch.statut ?? org.statut) as (typeof PLATFORM_ORGANIZATION_STATUTS)[number],
      plan: (patch.plan ?? org.plan) as (typeof PLATFORM_ORGANIZATION_PLANS)[number],
    }).then(() => router.refresh());
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{org.nom}</CardTitle>
          <p className="text-xs text-muted-foreground">{org.slug}</p>
        </div>
        <Badge variant={STATUT_TONE[org.statut]}>{org.statut}</Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Select value={org.statut} onValueChange={(v) => handleUpdate({ statut: v })} disabled={isPending}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_ORGANIZATION_STATUTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={org.plan} onValueChange={(v) => handleUpdate({ plan: v })} disabled={isPending}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORM_ORGANIZATION_PLANS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
