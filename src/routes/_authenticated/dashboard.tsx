import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useVehicles, useDrivers, useTrips } from "@/hooks/useFleet";
import { KpiCard, PageHeader } from "@/components/shared";
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
  RouteIcon,
  Clock,
  Users,
  Gauge,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const COLORS = [
  "oklch(0.62 0.19 250)",
  "oklch(0.7 0.15 210)",
  "oklch(0.8 0.15 80)",
  "oklch(0.6 0.02 256)",
];

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
  const onDuty = drivers.filter((d) => d.status === "On Trip" || d.status === "Available").length;

  const statusData = VEHICLE_STATUSES.map((s) => ({
    name: s,
    value: fv.filter((v) => v.status === s).length,
  })).filter((d) => d.value > 0);
  const tripData = ["Draft", "Dispatched", "Completed", "Cancelled"].map((s) => ({
    name: s,
    trips: trips.filter((t) => t.status === s).length,
  }));

  return (
    <div>
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time visibility across your entire fleet."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <FilterSelect label="Type" value={type} onChange={setType} options={VEHICLE_TYPES} />
            <FilterSelect
              label="Status"
              value={status}
              onChange={setStatus}
              options={VEHICLE_STATUSES}
            />
            <FilterSelect label="Region" value={region} onChange={setRegion} options={REGIONS} />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Active Vehicles"
          value={activeVehicles}
          hint="On active trips"
          icon={<Truck className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label="Available"
          value={available}
          hint="Ready to dispatch"
          icon={<CircleCheck className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="In Maintenance"
          value={inShop}
          hint="Currently in shop"
          icon={<Wrench className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label="Fleet Utilization"
          value={`${num(utilization, 0)}%`}
          hint="Vehicles in use"
          icon={<Gauge className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Active Trips"
          value={activeTrips}
          hint="Dispatched now"
          icon={<RouteIcon className="h-5 w-5" />}
          accent="info"
        />
        <KpiCard
          label="Pending Trips"
          value={pendingTrips}
          hint="Awaiting dispatch"
          icon={<Clock className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label="Drivers On Duty"
          value={onDuty}
          hint="Available or on trip"
          icon={<Users className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="Total Fleet"
          value={fv.length}
          hint="Matching filters"
          icon={<Truck className="h-5 w-5" />}
          accent="primary"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="glass p-5">
          <h3 className="font-display font-semibold">Fleet Status Distribution</h3>
          <div className="mt-4 h-64">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-sm text-muted-foreground">
                No vehicles yet
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {statusData.map((d, i) => (
              <span
                key={d.name}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </Card>

        <Card className="glass p-5">
          <h3 className="font-display font-semibold">Trips by Status</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tripData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.3 0.04 256)"
                  vertical={false}
                />
                <XAxis dataKey="name" stroke="oklch(0.68 0.03 250)" fontSize={12} />
                <YAxis stroke="oklch(0.68 0.03 250)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "oklch(0.62 0.19 250 / 0.08)" }}
                />
                <Bar dataKey="trips" radius={[6, 6, 0, 0]} fill="oklch(0.62 0.19 250)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "oklch(0.19 0.035 256)",
  border: "1px solid oklch(0.3 0.04 256)",
  borderRadius: 12,
  color: "oklch(0.96 0.01 240)",
  fontSize: 12,
};

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
      <SelectTrigger className="h-9 w-[130px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
