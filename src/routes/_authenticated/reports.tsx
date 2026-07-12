import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  useVehicles,
  useTrips,
  useFuelLogs,
  useExpenses,
  useMaintenance,
  downloadCsv,
} from "@/hooks/useFleet";
import { PageHeader, KpiCard } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, Gauge, DollarSign, TrendingUp, Fuel } from "lucide-react";
import { currency, num } from "@/lib/domain";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { TripWithRelations } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/reports")({
  component: Reports,
});

const tooltipStyle = {
  background: "oklch(0.19 0.035 256)",
  border: "1px solid oklch(0.3 0.04 256)",
  borderRadius: 12,
  color: "oklch(0.96 0.01 240)",
  fontSize: 12,
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Reads whichever completion-ish timestamp the trip record actually carries. */
function tripDate(t: TripWithRelations): string | null {
  const meta = t as unknown as { completed_at?: string; updated_at?: string; created_at?: string };
  return meta.completed_at ?? meta.updated_at ?? meta.created_at ?? null;
}

/** Reads the trip's own revenue field (collected at creation time). */
function tripRevenue(t: TripWithRelations): number {
  const meta = t as unknown as { revenue?: number | string };
  return Number(meta.revenue ?? 0);
}

const RANK_COLOR = ["bg-destructive", "bg-warning", "bg-primary"];

function Reports() {
  const { data: vehicles = [] } = useVehicles();
  const { data: trips = [] } = useTrips();
  const { data: fuel = [] } = useFuelLogs();
  const { data: expenses = [] } = useExpenses();
  const { data: maintenance = [] } = useMaintenance();

  const rows = useMemo(() => {
    return vehicles.map((v) => {
      const vTrips = trips.filter((t) => t.vehicle_id === v.id && t.status === "Completed");
      const distance = vTrips.reduce(
        (s, t) => s + Number(t.actual_distance ?? t.planned_distance ?? 0),
        0,
      );
      const liters = fuel
        .filter((f) => f.vehicle_id === v.id)
        .reduce((s, f) => s + Number(f.liters), 0);
      const fuelCost = fuel
        .filter((f) => f.vehicle_id === v.id)
        .reduce((s, f) => s + Number(f.cost), 0);
      const maintCost = maintenance
        .filter((m) => m.vehicle_id === v.id)
        .reduce((s, m) => s + Number(m.cost), 0);
      const expCost = expenses
        .filter((e) => e.vehicle_id === v.id)
        .reduce((s, e) => s + Number(e.amount), 0);
      const opCost = fuelCost + maintCost + expCost;
      const revenue = Number(v.revenue);
      const efficiency = liters > 0 ? distance / liters : 0;
      const roi =
        Number(v.acquisition_cost) > 0
          ? ((revenue - (maintCost + fuelCost)) / Number(v.acquisition_cost)) * 100
          : 0;
      return {
        id: v.id,
        name: v.registration_number,
        distance,
        liters,
        opCost,
        revenue,
        efficiency,
        roi,
      };
    });
  }, [vehicles, trips, fuel, expenses, maintenance]);

  const totalOpCost = rows.reduce((s, r) => s + r.opCost, 0);
  const totalDistance = rows.reduce((s, r) => s + r.distance, 0);
  const totalLiters = rows.reduce((s, r) => s + r.liters, 0);
  const avgEfficiency = totalLiters > 0 ? totalDistance / totalLiters : 0;
  const nonRetired = vehicles.filter((v) => v.status !== "Retired");
  const utilization = nonRetired.length
    ? (vehicles.filter((v) => v.status === "On Trip").length / nonRetired.length) * 100
    : 0;
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const fleetRoi = totalRevenue - totalOpCost;
  const avgRoiPercent = rows.length
    ? rows.reduce((s, r) => s + r.roi, 0) / rows.length
    : 0;

  // Monthly revenue trend, last 7 months, from completed trips' own revenue + date.
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()], revenue: 0 };
    });

    trips
      .filter((t) => t.status === "Completed")
      .forEach((t) => {
        const iso = tripDate(t);
        if (!iso) return;
        const d = new Date(iso);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const bucket = buckets.find((b) => b.key === key);
        if (bucket) bucket.revenue += tripRevenue(t);
      });

    return buckets;
  }, [trips]);
  const hasMonthlyData = monthlyRevenue.some((b) => b.revenue > 0);

  const costliestVehicles = useMemo(
    () =>
      [...rows]
        .filter((r) => r.opCost > 0)
        .sort((a, b) => b.opCost - a.opCost)
        .slice(0, 5),
    [rows],
  );
  const maxCostliest = costliestVehicles[0]?.opCost ?? 0;

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Efficiency, utilization, cost and ROI across the fleet."
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <Button
            variant="outline"
            onClick={() =>
              downloadCsv(
                "fleet_report.csv",
                rows.map((r) => ({
                  vehicle: r.name,
                  distance_km: r.distance,
                  fuel_liters: r.liters,
                  fuel_efficiency: r.efficiency.toFixed(2),
                  operational_cost: r.opCost,
                  revenue: r.revenue,
                  roi_percent: r.roi.toFixed(1),
                })),
              )
            }
            disabled={!rows.length}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Fuel Efficiency"
          value={`${num(avgEfficiency, 1)} km/l`}
          icon={<Fuel className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label="Fleet Utilization"
          value={`${num(utilization, 0)}%`}
          icon={<Gauge className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="Operational Cost"
          value={num(totalOpCost, 0)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label="Vehicle ROI"
          value={`${num(avgRoiPercent, 1)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent={avgRoiPercent >= 0 ? "success" : "destructive"}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="glass p-5">
          <h3 className="font-display font-semibold">Monthly Revenue</h3>
          <div className="mt-4 h-64">
            {hasMonthlyData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.04 256)" vertical={false} />
                  <XAxis dataKey="label" stroke="oklch(0.68 0.03 250)" fontSize={12} />
                  <YAxis stroke="oklch(0.68 0.03 250)" fontSize={12} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "oklch(0.62 0.19 250 / 0.08)" }}
                    formatter={(value: number) => currency(value)}
                  />
                  <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} fill="oklch(0.62 0.19 250)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                Complete trips with revenue logged to see the monthly trend.
              </div>
            )}
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="font-display font-semibold">Top Costliest Vehicles</h3>
          <div className="mt-5 space-y-4">
            {costliestVehicles.length === 0 ? (
              <div className="grid h-40 place-items-center text-sm text-muted-foreground">
                Log fuel, maintenance, or expenses to rank vehicles by cost.
              </div>
            ) : (
              costliestVehicles.map((r, i) => (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-medium">{r.name}</span>
                    <span className="text-muted-foreground tabular">{currency(r.opCost)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${RANK_COLOR[i] ?? "bg-primary"}`}
                      style={{ width: `${maxCostliest ? (r.opCost / maxCostliest) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="glass mt-6 overflow-hidden">
        <div className="p-4">
          <h3 className="font-display font-semibold">Per-Vehicle Breakdown</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Distance</TableHead>
              <TableHead className="text-right">Fuel</TableHead>
              <TableHead className="text-right">Efficiency</TableHead>
              <TableHead className="text-right">Op. Cost</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono font-medium">{r.name}</TableCell>
                <TableCell className="text-right tabular">{num(r.distance, 0)} km</TableCell>
                <TableCell className="text-right tabular">{num(r.liters, 0)} L</TableCell>
                <TableCell className="text-right tabular">{num(r.efficiency, 2)} km/L</TableCell>
                <TableCell className="text-right tabular">{currency(r.opCost)}</TableCell>
                <TableCell className="text-right tabular">{currency(r.revenue)}</TableCell>
                <TableCell
                  className={`text-right tabular font-medium ${r.roi >= 0 ? "text-success" : "text-destructive"}`}
                >
                  {num(r.roi, 1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}