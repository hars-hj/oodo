import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVehicles, downloadCsv } from "@/hooks/useFleet";
import { useAuth } from "@/hooks/useAuth";
import { saveVehicle, deleteVehicle } from "@/lib/data";
import { EmptyState } from "@/components/shared";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Truck, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  REGIONS,
  num,
  type Vehicle,
} from "@/lib/domain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vehicles")({
  component: Vehicles,
});

const blank = {
  registration_number: "",
  name: "",
  type: "Van",
  max_load_capacity: 0,
  odometer: 0,
  acquisition_cost: 0,
  region: "North",
  status: "Available" as const,
};

const STATUS_PILL: Record<string, string> = {
  Available: "bg-emerald-500 text-white",
  "On Trip": "bg-blue-500 text-white",
  "In Shop": "bg-orange-500 text-white",
  Retired: "bg-red-500 text-white",
};

function Vehicles() {
  const { roles } = useAuth();
  const canWrite = roles.includes("fleet_manager") || roles.includes("admin");
  const { data: vehicles = [], isLoading } = useVehicles();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(blank);

  const save = useMutation({
    mutationFn: (v: Record<string, unknown>) => saveVehicle(v),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle saved");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success("Vehicle deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const filtered = useMemo(
    () =>
      vehicles.filter((v) => {
        const matchesSearch = [v.registration_number, v.name, v.type, v.region]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || v.type === typeFilter;
        const matchesStatus = statusFilter === "all" || v.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
      }),
    [vehicles, search, typeFilter, statusFilter],
  );

  function openNew() {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  }
  function openEdit(v: Vehicle) {
    setEditing(v);
    setForm({
      registration_number: v.registration_number,
      name: v.name,
      type: v.type,
      max_load_capacity: v.max_load_capacity,
      odometer: v.odometer,
      acquisition_cost: v.acquisition_cost,
      region: v.region ?? "North",
      status: v.status,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Top bar — filters left, add button right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Type: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Type: All</SelectItem>
              {VEHICLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              {VEHICLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reg. no..."
            className="h-9 w-[180px]"
          />
        </div>

        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="glow">
                <Plus className="mr-1.5 h-4 w-4" /> Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Vehicle" : "Register Vehicle"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Registration No.">
                  <Input
                    value={form.registration_number as string}
                    onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                    placeholder="VAN-05"
                  />
                </Field>
                <Field label="Name / Model">
                  <Input
                    value={form.name as string}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ford Transit"
                  />
                </Field>
                <Field label="Type">
                  <Select value={form.type as string} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Region">
                  <Select value={form.region as string} onValueChange={(v) => setForm({ ...form, region: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Max Load (kg)">
                  <Input
                    type="number"
                    value={form.max_load_capacity as number}
                    onChange={(e) => setForm({ ...form, max_load_capacity: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Odometer (km)">
                  <Input
                    type="number"
                    value={form.odometer as number}
                    onChange={(e) => setForm({ ...form, odometer: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Acquisition Cost">
                  <Input
                    type="number"
                    value={form.acquisition_cost as number}
                    onChange={(e) => setForm({ ...form, acquisition_cost: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Status">
                  <Select value={form.status as string} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => save.mutate(editing ? { ...form, id: editing.id } : form)}
                  disabled={save.isPending || !form.registration_number || !form.name}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Table */}
      <Card className="glass overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Truck className="h-10 w-10" />}
            title="No vehicles yet"
            hint="Register your first vehicle to get started."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="uppercase text-xs tracking-wider">Reg. No. (Unique)</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Name/Model</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Type</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Capacity</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Odometer</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Acq. Cost</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Status</TableHead>
                {canWrite && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.registration_number}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell className="text-muted-foreground">{v.type}</TableCell>
                  <TableCell>{num(Number(v.max_load_capacity), 0)} kg</TableCell>
                  <TableCell className="tabular-nums">{num(Number(v.odometer), 0)}</TableCell>
                  <TableCell className="tabular-nums">{num(Number(v.acquisition_cost), 0)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex w-24 items-center justify-center rounded-md px-3 py-1 text-xs font-semibold",
                        STATUS_PILL[v.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {v.status}
                    </span>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {v.registration_number}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes the vehicle and its logs.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove.mutate(v.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Rule hint */}
      <p className="text-xs text-amber-500/80">
        Rule: Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher
      </p>
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