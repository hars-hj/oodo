import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDrivers } from "@/hooks/useFleet";
import { useAuth } from "@/hooks/useAuth";
import { saveDriver, deleteDriver } from "@/lib/data";
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
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DRIVER_STATUSES,
  LICENSE_CATEGORIES,
  REGIONS,
  isLicenseExpired,
  type Driver,
  type DriverStatus,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/drivers")({
  component: Drivers,
});

const blank = {
  name: "",
  license_number: "",
  license_category: "B",
  license_expiry: "",
  contact_number: "",
  safety_score: 100,
  status: "Available" as const,
  region: "North",
};

const STATUS_PILL: Record<string, string> = {
  Available: "bg-emerald-500 text-white",
  "On Trip": "bg-blue-500 text-white",
  "Off Duty": "bg-gray-400 text-white",
  Suspended: "bg-orange-500 text-white",
};

const TOGGLE_STATUSES: DriverStatus[] = ["Available", "On Trip", "Off Duty", "Suspended"];

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-24 items-center justify-center rounded-md px-3 py-1 text-xs font-semibold",
        STATUS_PILL[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function Drivers() {
  const { roles } = useAuth();
  const canWrite = roles.includes("fleet_manager") || roles.includes("admin");
  const isSafetyOfficer =
    roles.includes("safety_officer") &&
    !roles.includes("fleet_manager") &&
    !roles.includes("admin");
  const canEdit = canWrite || isSafetyOfficer;

  const { data: drivers = [], isLoading } = useDrivers();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(blank);
  const [selected, setSelected] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) =>
      saveDriver({ ...d, license_expiry: (d.license_expiry as string) || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Driver saved");
      setOpen(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Driver deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DriverStatus }) => {
      const { error } = await supabase.from("drivers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Status updated");
      setSelected(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const filtered = useMemo(
    () =>
      drivers.filter((d) =>
        [d.name, d.license_number, d.region]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [drivers, search],
  );

  function openNew() {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  }
  function openEdit(d: Driver) {
    setEditing(d);
    setForm({
      name: d.name,
      license_number: d.license_number,
      license_category: d.license_category ?? "B",
      license_expiry: d.license_expiry ?? "",
      contact_number: d.contact_number ?? "",
      safety_score: d.safety_score,
      status: d.status,
      region: d.region ?? "North",
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drivers..."
          className="h-9 max-w-xs"
        />
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="glow">
                <Plus className="mr-1.5 h-4 w-4" /> Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Driver" : "Add Driver"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full Name">
                  <Input
                    disabled={isSafetyOfficer}
                    value={form.name as string}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Alex Rivera"
                  />
                </Field>
                <Field label="License Number">
                  <Input
                    value={form.license_number as string}
                    onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                    placeholder="DL-889231"
                  />
                </Field>
                <Field label="License Category">
                  <Select
                    value={form.license_category as string}
                    onValueChange={(v) => setForm({ ...form, license_category: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LICENSE_CATEGORIES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="License Expiry">
                  <Input
                    type="date"
                    value={form.license_expiry as string}
                    onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
                  />
                </Field>
                <Field label="Contact Number">
                  <Input
                    disabled={isSafetyOfficer}
                    value={form.contact_number as string}
                    onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                    placeholder="+1 555 0100"
                  />
                </Field>
                <Field label="Safety Score">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={form.safety_score as number}
                    onChange={(e) => setForm({ ...form, safety_score: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Region">
                  <Select
                    disabled={isSafetyOfficer}
                    value={form.region as string}
                    onValueChange={(v) => setForm({ ...form, region: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select
                    disabled={isSafetyOfficer}
                    value={form.status as string}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DRIVER_STATUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => save.mutate(editing ? { ...form, id: editing.id } : form)}
                  disabled={save.isPending || !form.name || !form.license_number}
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
            icon={<Users className="h-10 w-10" />}
            title="No drivers yet"
            hint="Add drivers to start dispatching trips."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="uppercase text-xs tracking-wider">Driver</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">License No</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Category</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Expiry</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Contact</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Safety</TableHead>
                <TableHead className="uppercase text-xs tracking-wider">Status</TableHead>
                {canEdit && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const expired = isLicenseExpired(d.license_expiry);
                const isSelected = selected === d.id;
                return (
                  <TableRow
                    key={d.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isSelected && "bg-primary/10",
                    )}
                    onClick={() => setSelected(isSelected ? null : d.id)}
                  >
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {d.license_number}
                    </TableCell>
                    <TableCell>{d.license_category}</TableCell>
                    <TableCell>
                      <span className={expired ? "font-medium text-destructive" : "text-muted-foreground"}>
                        {d.license_expiry
                          ? new Date(d.license_expiry).toLocaleDateString("en-US", { month: "2-digit", year: "numeric" })
                          : "—"}
                        {expired && " EXPIRE"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.contact_number
                        ? d.contact_number.slice(0, 5) + "xxxxx"
                        : "—"}
                    </TableCell>
                    <TableCell>{Number(d.safety_score)}%</TableCell>
                    <TableCell>
                      <StatusPill status={d.status} />
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete {d.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently removes the driver profile.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove.mutate(d.id)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Toggle Status section */}
      {selected && canEdit && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Toggle status
          </p>
          <div className="flex flex-wrap gap-2">
            {TOGGLE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus.mutate({ id: selected, status: s })}
                disabled={toggleStatus.isPending}
                className={cn(
                  "rounded-md px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50",
                  STATUS_PILL[s],
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rule hint */}
      <p className="text-xs text-amber-500/80">
        Rule: Expired license or Suspended status → blocked from trip assignment
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