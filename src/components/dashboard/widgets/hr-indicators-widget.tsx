"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/lib/dashboard-data";

const MAX_VISIBLE = 5;

function Row({ d }: { d: DashboardData["hrIndicators"][number] }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{d.departmentName}</TableCell>
      <TableCell>{d.headcount}</TableCell>
      <TableCell>{d.leaveDaysThisMonth}</TableCell>
      <TableCell>{d.avgOccupancy}%</TableCell>
    </TableRow>
  );
}

/** Demande utilisateur — pas de lien vers une autre page (aucune page dediee
 * n'existe pour cette agregation) : le reste des departements se deplie sur
 * place. Pas de Collapsible ici (son wrapper <div> serait un enfant HTML
 * invalide de <tbody>) : simple toggle de lignes supplementaires. */
export function HRIndicatorsWidget({ data }: { data: DashboardData["hrIndicators"] }) {
  const [open, setOpen] = useState(false);
  const visible = data.slice(0, MAX_VISIBLE);
  const rest = data.slice(MAX_VISIBLE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Indicateurs RH</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Département</TableHead>
              <TableHead>Effectif</TableHead>
              <TableHead>Jours de congé (mois)</TableHead>
              <TableHead>Occupation moyenne</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((d) => (
              <Row key={d.departmentId} d={d} />
            ))}
            {open && rest.map((d) => <Row key={d.departmentId} d={d} />)}
          </TableBody>
        </Table>
        {rest.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen((v) => !v)}>
            {open ? "Voir moins" : `Voir ${rest.length} de plus`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
