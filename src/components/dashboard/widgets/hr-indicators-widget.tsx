import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData } from "@/lib/dashboard-data";

export function HRIndicatorsWidget({ data }: { data: DashboardData["hrIndicators"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Indicateurs RH</CardTitle>
      </CardHeader>
      <CardContent>
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
            {data.map((d) => (
              <TableRow key={d.departmentId}>
                <TableCell className="font-medium">{d.departmentName}</TableCell>
                <TableCell>{d.headcount}</TableCell>
                <TableCell>{d.leaveDaysThisMonth}</TableCell>
                <TableCell>{d.avgOccupancy}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
