import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useVehicles, useDrivers, useTrips } from "@/hooks/useFleet";
import { PageHeader, StatusBadge } from "@/components/shared";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VEHICLE_TYPES, VEHICLE_STATUSES, REGIONS, num } from "@/lib/domain";
import {
  LayoutDashboard,
  Truck,
  CircleCheck,
  Wrench,
  Route as RouteIcon,
  Clock,
  Users,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  Available: "oklch(0.6 0.18 145)",
  "On Trip": "oklch(0.62 0.19 250)",
  "In Shop": "oklch(0.75 0.18 75)",
  Retired: "oklch(0.55 0.02 256)",
};

const ACCENT_MAP: Record<string, string> = {
  primary: "text-primary bg-primary/12 ring-primary/25",
  success: "text-success bg-success/12 ring-success/25",
  warning: "text-warning bg-warning/12 ring-warning/25",
  info: "text-info bg-info/12 ring-info/25",
};

function StatCard({
  label,
  value,
  icon,
  accent = "primary",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "info";
}) {
  return (
    <Card className="glass flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-tight">
          {label}
        </p>
        {icon && (
          <div
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${ACCENT_MAP[accent]}`}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="font-display text-4xl font-bold tabular-nums">{value}</p>
    </Card>
  );
}

function Dashboard() {
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const { data: trips = [] } = useTrips();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");

  const fv = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          (type === "all" || v.type === type) &&
          (status === "all" || v.status === status) &&
          (region === "all" || v.region === region),
      ),
    [vehicles, type, status, region],
  );

  const activeVehicles = fv.filter((v) => v.status === "On Trip").length;
  const available = fv.filter((v) => v.status === "Available").length;
  const inShop = fv.filter((v) => v.status === "In Shop").length;
  const nonRetired = fv.filter((v) => v.status !== "Retired").length;
  const utilization = nonRetired ? (activeVehicles / nonRetired) * 100 : 0;
  const activeTrips = trips.filter((t) => t.status === "Dispatched").length;
  const pendingTrips = trips.filter((t) => t.status === "Draft").length;
  const onDuty = drivers.filter(
    (d) => d.status === "On Trip" || d.status === "Available",
  ).length;

  const statusBarData = VEHICLE_STATUSES.map((s) => ({
    name: s,
    value: fv.filter((v) => v.status === s).length,
  }));

  const recentTrips = [...trips]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time visibility across your entire fleet."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <FilterSelect
              label="Vehicle Type"
              value={type}
              onChange={setType}
              options={VEHICLE_TYPES}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={VEHICLE_STATUSES}
            />
            <FilterSelect
              label="Region"
              value={region}
              onChange={setRegion}
              options={REGIONS}
            />
          </div>
        }
      />

      {/* KPI Row — 2 cols on mobile, 4 on tablet, 7 on wide */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="Active Vehicles"
          value={activeVehicles}
          icon={<Truck className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Available Vehicles"
          value={available}
          icon={<CircleCheck className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="In Maintenance"
          value={inShop}
          icon={<Wrench className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Active Trips"
          value={activeTrips}
          icon={<RouteIcon className="h-4 w-4" />}
          accent="info"
        />
        <StatCard
          label="Pending Trips"
          value={pendingTrips}
          icon={<Clock className="h-4 w-4" />}
          accent="warning"
        />
        <StatCard
          label="Drivers on Duty"
          value={onDuty}
          icon={<Users className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Fleet Utilization"
          value={`${num(utilization, 0)}%`}
          icon={<Gauge className="h-4 w-4" />}
          accent="primary"
        />
      </div>

      {/* Bottom — Recent Trips (left) + Vehicle Status (right) */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Recent Trips */}
        <Card className="glass overflow-hidden">
          <div className="border-b border-border/60 px-5 py-4">
            <h3 className="font-display font-semibold">Recent Trips</h3>
          </div>
          {recentTrips.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No trips yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="px-5 py-3 text-left font-medium">Trip</th>
                  <th className="px-3 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-3 py-3 text-left font-medium">Driver</th>
                  <th className="px-3 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-left font-medium">Route</th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                      {t.id.slice(0, 6).toUpperCase()}
                    </td>
                    <td className="px-3 py-3.5">
                      {(t as any).vehicle?.registration_number ?? "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      {(t as any).driver?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">
                      {t.source} → {t.destination}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Vehicle Status panel */}
        <Card className="glass p-6">
          <h3 className="mb-6 font-display font-semibold">Vehicle Status</h3>
          <div className="space-y-5">
            {statusBarData.map((d) => (
              <div key={d.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold tabular-nums">{d.value}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(
                        (d.value / (fv.length || 1)) * 100,
                        d.value > 0 ? 4 : 0,
                      )}%`,
                      background:
                        STATUS_COLORS[d.name] ?? "oklch(0.6 0.02 256)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h4 className="mb-4 text-sm font-medium text-muted-foreground">
              Trips by status
            </h4>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={["Draft", "Dispatched", "Completed", "Cancelled"].map(
                    (s) => ({
                      name: s.slice(0, 4),
                      value: trips.filter((t) => t.status === s).length,
                    }),
                  )}
                  barSize={20}
                  margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "oklch(0.68 0.03 250)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide allowDecimals={false} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {["Draft", "Dispatched", "Completed", "Cancelled"].map(
                      (_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              "oklch(0.6 0.02 256)",
                              "oklch(0.62 0.19 250)",
                              "oklch(0.6 0.18 145)",
                              "oklch(0.55 0.2 25)",
                            ][i]
                          }
                        />
                      ),
                    )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}