import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMaintenance, useVehicles } from "@/hooks/useFleet";
import { useAuth } from "@/hooks/useAuth";
import { createMaintenance, closeMaintenance, deleteMaintenance } from "@/lib/data";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wrench, CircleCheck, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { currency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/maintenance")({
  component: Maintenance,
});

const blank = {
  vehicle_id: "",
  description: "",
  cost: 0,
  service_date: new Date().toISOString().slice(0, 10),
};

function StatusFlowLegend() {
  return (
    <div className="mt-6 space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-medium text-success w-16 shrink-0">Available</span>
        <div className="flex-1 flex items-center gap-1 text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="whitespace-nowrap">opening active record</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </div>
        <span className="font-medium text-warning w-14 shrink-0 text-right">In Shop</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-warning w-16 shrink-0">In Shop</span>
        <div className="flex-1 flex items-center gap-1 text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span className="whitespace-nowrap">closing record (not retired)</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </div>
        <span className="font-medium text-success w-14 shrink-0 text-right">Available</span>
      </div>
      <p className="text-[11px] text-muted-foreground pt-1">
        Note: In Shop vehicles are removed from the dispatch pool.
      </p>
    </div>
  );
}

function Maintenance() {
  const { roles } = useAuth();
  const canWrite = roles.includes("fleet_manager") || roles.includes("admin");
  const { data: logs = [], isLoading } = useMaintenance();
  const { data: vehicles = [] } = useVehicles();
  const qc = useQueryClient();
  const [form, setForm] = useState(blank);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["maintenance"] });
    qc.invalidateQueries({ queryKey: ["vehicles"] });
  }

  const create = useMutation({
    mutationFn: () => createMaintenance(form),
    onSuccess: () => {
      invalidate();
      toast.success("Logged — vehicle moved to In Shop");
      setForm(blank);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const serviceable = vehicles.filter((v) => v.status !== "On Trip" && v.status !== "Retired");
  const canSave = !create.isPending && !!form.vehicle_id && !!form.description;

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Open a log to move a vehicle In Shop; close it to restore availability."
        icon={<Wrench className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* Left: log service record panel */}
        <Card className="glass p-5 h-fit lg:sticky lg:top-4">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground mb-3">
            LOG SERVICE RECORD
          </p>

          {canWrite ? (
            <>
              <div className="space-y-3">
                <Field label="Vehicle">
                  <Select
                    value={form.vehicle_id}
                    onValueChange={(v) => setForm({ ...form, vehicle_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceable.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No serviceable vehicles
                        </div>
                      )}
                      {serviceable.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.registration_number} · {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Service Type">
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Oil Change"
                  />
                </Field>

                <Field label="Cost">
                  <Input
                    type="number"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                  />
                </Field>

                <Field label="Date">
                  <Input
                    type="date"
                    value={form.service_date}
                    onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                  />
                </Field>

                <Field label="Status">
                  <Input value="Active" disabled className="text-muted-foreground" />
                </Field>

                <Button
                  className="w-full glow"
                  onClick={() => create.mutate()}
                  disabled={!canSave}
                >
                  Save
                </Button>
              </div>

              <StatusFlowLegend />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have read-only access to maintenance logs.
            </p>
          )}
        </Card>

        {/* Right: service log table */}
        <div>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground mb-3">
            SERVICE LOG
          </p>

          <Card className="glass overflow-hidden">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : logs.length === 0 ? (
              <EmptyState
                icon={<Wrench className="h-10 w-10" />}
                title="No maintenance logs"
                hint="Log a service record to schedule shop work."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    {canWrite && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((l) => {
                    const displayStatus = l.status === "Open" ? "In Shop" : "Completed";
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono">
                          {l.vehicle?.registration_number ?? "—"}
                        </TableCell>
                        <TableCell>{l.description}</TableCell>
                        <TableCell className="text-right tabular">
                          {currency(Number(l.cost))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={displayStatus} />
                        </TableCell>
                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {l.status === "Open" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Close"
                                  onClick={() =>
                                    closeMaintenance(l)
                                      .then(() => {
                                        invalidate();
                                        toast.success("Closed — vehicle restored");
                                      })
                                      .catch((e) => toast.error(e.message))
                                  }
                                >
                                  <CircleCheck className="h-3.5 w-3.5 text-success" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                onClick={() => deleteMaintenance(l.id).then(() => invalidate())}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
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
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}