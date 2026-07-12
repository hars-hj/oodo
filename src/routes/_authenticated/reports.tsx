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

  const chartData = rows
    .filter((r) => r.opCost > 0 || r.revenue > 0)
    .map((r) => ({ name: r.name, cost: Math.round(r.opCost), revenue: Math.round(r.revenue) }));

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
          label="Avg Fuel Efficiency"
          value={`${num(avgEfficiency, 2)}`}
          hint="km / liter"
          icon={<Fuel className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label="Fleet Utilization"
          value={`${num(utilization, 0)}%`}
          hint="Vehicles in use"
          icon={<Gauge className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Operational Cost"
          value={currency(totalOpCost)}
          hint="Fuel + maintenance + expenses"
          icon={<DollarSign className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label="Net Fleet ROI"
          value={currency(fleetRoi)}
          hint="Revenue − operational cost"
          icon={<TrendingUp className="h-5 w-5" />}
          accent={fleetRoi >= 0 ? "success" : "destructive"}
        />
      </div>

      <Card className="glass mt-6 p-5">
        <h3 className="font-display font-semibold">Revenue vs Operational Cost per Vehicle</h3>
        <div className="mt-4 h-72">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.3 0.04 256)"
                  vertical={false}
                />
                <XAxis dataKey="name" stroke="oklch(0.68 0.03 250)" fontSize={12} />
                <YAxis stroke="oklch(0.68 0.03 250)" fontSize={12} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "oklch(0.62 0.19 250 / 0.08)" }}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  radius={[6, 6, 0, 0]}
                  fill="oklch(0.72 0.16 165)"
                />
                <Bar
                  dataKey="cost"
                  name="Op. Cost"
                  radius={[6, 6, 0, 0]}
                  fill="oklch(0.8 0.15 80)"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Complete trips and log costs to see analytics.
            </div>
          )}
        </div>
      </Card>

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
