import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDrivers, downloadCsv } from "@/hooks/useFleet";
import { useAuth } from "@/hooks/useAuth";
import { saveDriver, deleteDriver } from "@/lib/data";
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
import { Users, Plus, Search, Pencil, Trash2, Download, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  DRIVER_STATUSES,
  LICENSE_CATEGORIES,
  REGIONS,
  isLicenseExpired,
  type Driver,
} from "@/lib/domain";

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

  const filtered = useMemo(
    () =>
      drivers.filter((d) =>
        [d.name, d.license_number, d.region].join(" ").toLowerCase().includes(search.toLowerCase()),
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
    <div>
      <PageHeader
        title="Driver Management"
        subtitle="Profiles, licenses and safety compliance."
        icon={<Users className="h-5 w-5" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  "drivers.csv",
                  drivers.map(({ id, created_by, ...r }) => r),
                )
              }
              disabled={!drivers.length}
            >
              <Download className="mr-1.5 h-4 w-4" /> Export
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              {canWrite && (
                <DialogTrigger asChild>
                  <Button onClick={openNew} className="glow">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Driver
                  </Button>
                </DialogTrigger>
              )}
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
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LICENSE_CATEGORIES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
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
                  <Field label="Status">
                    <Select
                      disabled={isSafetyOfficer}
                      value={form.status as string}
                      onValueChange={(v) => setForm({ ...form, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DRIVER_STATUSES.map((t) => (
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
                    disabled={save.isPending || !form.name || !form.license_number}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search drivers..."
          className="pl-9"
        />
      </div>

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
                <TableHead>Name</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Safety</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const expired = isLicenseExpired(d.license_expiry);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {d.license_number}
                    </TableCell>
                    <TableCell>{d.license_category}</TableCell>
                    <TableCell>
                      <span
                        className={
                          expired
                            ? "flex items-center gap-1 text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {expired && <TriangleAlert className="h-3.5 w-3.5" />}
                        {d.license_expiry ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular">{Number(d.safety_score)}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit || canWrite ? (
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canWrite && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
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
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
