import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVehicles, downloadCsv } from "@/hooks/useFleet";
import { useAuth } from "@/hooks/useAuth";
import { saveVehicle, deleteVehicle } from "@/lib/data";
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
import { Truck, Plus, Search, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  REGIONS,
  currency,
  num,
  type Vehicle,
} from "@/lib/domain";

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

function Vehicles() {
  const { roles } = useAuth();
  const canWrite = roles.includes("fleet_manager") || roles.includes("admin");
  const { data: vehicles = [], isLoading } = useVehicles();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
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
      vehicles.filter((v) =>
        [v.registration_number, v.name, v.type, v.region]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [vehicles, search],
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
    <div>
      <PageHeader
        title="Vehicle Registry"
        subtitle="Master list of all fleet assets."
        icon={<Truck className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "vehicles.csv",
                  vehicles.map(({ id, created_by, ...r }) => r),
                )
              }
              disabled={!vehicles.length}
            >
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
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
                      <Select
                        value={form.type as string}
                        onValueChange={(v) => setForm({ ...form, type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Region">
                      <Select
                        value={form.region as string}
                        onValueChange={(v) => setForm({ ...form, region: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Max Load (kg)">
                      <Input
                        type="number"
                        value={form.max_load_capacity as number}
                        onChange={(e) =>
                          setForm({ ...form, max_load_capacity: Number(e.target.value) })
                        }
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
                        onChange={(e) =>
                          setForm({ ...form, acquisition_cost: Number(e.target.value) })
                        }
                      />
                    </Field>
                    <Field label="Status">
                      <Select
                        value={form.status as string}
                        onValueChange={(v) => setForm({ ...form, status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_STATUSES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
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
          </>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vehicles..."
          className="pl-9"
        />
      </div>

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
                <TableHead>Registration</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Odometer</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.registration_number}</TableCell>
                  <TableCell>{v.name}</TableCell>
                  <TableCell className="text-muted-foreground">{v.type}</TableCell>
                  <TableCell className="text-right tabular">
                    {num(Number(v.max_load_capacity), 0)} kg
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {num(Number(v.odometer), 0)} km
                  </TableCell>
                  <TableCell className="text-muted-foreground">{v.region}</TableCell>
                  <TableCell>
                    <StatusBadge status={v.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite ? (
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
