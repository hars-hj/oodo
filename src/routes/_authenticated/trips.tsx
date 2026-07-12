import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTrips, useVehicles, useDrivers, downloadCsv } from "@/hooks/useFleet";
import { useAuth } from "@/hooks/useAuth";
import {
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
  deleteTrip,
  type TripWithRelations,
} from "@/lib/data";
import { PageHeader, StatusBadge, EmptyState } from "@/components/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Route as RouteIcon,
  Plus,
  Download,
  Send,
  CircleCheck,
  Ban,
  Trash2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { isLicenseExpired, num } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/trips")({
  component: Trips,
});

const blank = {
  source: "",
  destination: "",
  vehicle_id: "",
  driver_id: "",
  cargo_weight: 0,
  planned_distance: 0,
  revenue: 0,
};

function Trips() {
  const { roles } = useAuth();
  const canWrite = roles.includes("driver") || roles.includes("admin");
  const { data: trips = [], isLoading } = useTrips();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [completing, setCompleting] = useState<TripWithRelations | null>(null);
  const [finalOdo, setFinalOdo] = useState(0);
  const [fuel, setFuel] = useState(0);

  function invalidateAll() {
    ["trips", "vehicles", "drivers", "fuel_logs"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
  }

  const create = useMutation({
    mutationFn: () => createTrip(form),
    onSuccess: () => {
      invalidateAll();
      toast.success("Trip created");
      setOpen(false);
      setForm(blank);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const eligibleVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "Available"),
    [vehicles],
  );
  const eligibleDrivers = useMemo(
    () => drivers.filter((d) => d.status === "Available" && !isLicenseExpired(d.license_expiry)),
    [drivers],
  );
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const overweight = selectedVehicle
    ? form.cargo_weight > Number(selectedVehicle.max_load_capacity)
    : false;

  function runDispatch(t: TripWithRelations) {
    dispatchTrip(t)
      .then(() => {
        invalidateAll();
        toast.success("Dispatched — vehicle & driver now On Trip");
      })
      .catch((e) => toast.error(e.message));
  }
  function runCancel(t: TripWithRelations) {
    cancelTrip(t)
      .then(() => {
        invalidateAll();
        toast.success("Trip cancelled");
      })
      .catch((e) => toast.error(e.message));
  }
  function runDelete(t: TripWithRelations) {
    deleteTrip(t)
      .then(() => {
        invalidateAll();
        toast.success("Trip deleted");
      })
      .catch((e) => toast.error(e.message));
  }
  function runComplete() {
    if (!completing) return;
    completeTrip(completing, finalOdo, fuel)
      .then(() => {
        invalidateAll();
        toast.success("Trip completed — assets Available");
        setCompleting(null);
      })
      .catch((e) => toast.error(e.message));
  }

  return (
    <div>
      <PageHeader
        title="Trip Management"
        subtitle="Dispatch with enforced eligibility rules."
        icon={<RouteIcon className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "trips.csv",
                  trips.map((t) => ({
                    source: t.source,
                    destination: t.destination,
                    vehicle: t.vehicle?.registration_number,
                    driver: t.driver?.name,
                    cargo_weight: t.cargo_weight,
                    planned_distance: t.planned_distance,
                    actual_distance: t.actual_distance,
                    status: t.status,
                  })),
                )
              }
              disabled={!trips.length}
            >
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            {canWrite && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="glow">
                    <Plus className="mr-1.5 h-4 w-4" /> New Trip
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Trip</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Source">
                      <Input
                        value={form.source}
                        onChange={(e) => setForm({ ...form, source: e.target.value })}
                        placeholder="Depot A"
                      />
                    </Field>
                    <Field label="Destination">
                      <Input
                        value={form.destination}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        placeholder="Warehouse B"
                      />
                    </Field>
                    <Field label="Vehicle (Available only)">
                      <Select
                        value={form.vehicle_id}
                        onValueChange={(v) => setForm({ ...form, vehicle_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleVehicles.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              No available vehicles
                            </div>
                          )}
                          {eligibleVehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.registration_number} · {num(Number(v.max_load_capacity), 0)}kg
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Driver (Eligible only)">
                      <Select
                        value={form.driver_id}
                        onValueChange={(v) => setForm({ ...form, driver_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleDrivers.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              No eligible drivers
                            </div>
                          )}
                          {eligibleDrivers.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Cargo Weight (kg)">
                      <Input
                        type="number"
                        value={form.cargo_weight}
                        onChange={(e) => setForm({ ...form, cargo_weight: Number(e.target.value) })}
                      />
                    </Field>
                    <Field label="Planned Distance (km)">
                      <Input
                        type="number"
                        value={form.planned_distance}
                        onChange={(e) =>
                          setForm({ ...form, planned_distance: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Expected Revenue">
                      <Input
                        type="number"
                        value={form.revenue}
                        onChange={(e) => setForm({ ...form, revenue: Number(e.target.value) })}
                      />
                    </Field>
                  </div>
                  {overweight && (
                    <p className="text-sm text-destructive">
                      Cargo exceeds vehicle capacity (
                      {num(Number(selectedVehicle?.max_load_capacity), 0)}kg).
                    </p>
                  )}
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => create.mutate()}
                      disabled={
                        create.isPending ||
                        overweight ||
                        !form.source ||
                        !form.destination ||
                        !form.vehicle_id ||
                        !form.driver_id
                      }
                    >
                      Create Trip
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />

      <Card className="glass overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={<RouteIcon className="h-10 w-10" />}
            title="No trips yet"
            hint="Create a trip to dispatch a vehicle and driver."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Cargo</TableHead>
                <TableHead className="text-right">Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {t.source} → {t.destination}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {t.vehicle?.registration_number ?? "—"}
                  </TableCell>
                  <TableCell>{t.driver?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular">
                    {num(Number(t.cargo_weight), 0)} kg
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {num(Number(t.actual_distance ?? t.planned_distance), 0)} km
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite ? (
                      <div className="flex justify-end gap-1">
                        {t.status === "Draft" && (
                          <Button variant="ghost" size="sm" onClick={() => runDispatch(t)}>
                            <Send className="mr-1 h-3.5 w-3.5" /> Dispatch
                          </Button>
                        )}
                        {t.status === "Dispatched" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCompleting(t);
                              setFinalOdo(0);
                              setFuel(0);
                            }}
                          >
                            <CircleCheck className="mr-1 h-3.5 w-3.5 text-success" /> Complete
                          </Button>
                        )}
                        {(t.status === "Draft" || t.status === "Dispatched") && (
                          <Button variant="ghost" size="icon" onClick={() => runCancel(t)}>
                            <Ban className="h-4 w-4 text-warning" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => runDelete(t)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!completing} onOpenChange={(o) => !o && setCompleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {completing?.source} → {completing?.destination}. Enter the final odometer and fuel
            consumed.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Final Odometer (km)">
              <Input
                type="number"
                value={finalOdo}
                onChange={(e) => setFinalOdo(Number(e.target.value))}
              />
            </Field>
            <Field label="Fuel Consumed (L)">
              <Input type="number" value={fuel} onChange={(e) => setFuel(Number(e.target.value))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleting(null)}>
              Cancel
            </Button>
            <Button onClick={runComplete}>Complete Trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
