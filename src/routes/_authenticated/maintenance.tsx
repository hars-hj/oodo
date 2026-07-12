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
import { Wrench, Plus, CircleCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { currency } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/maintenance")({
  component: Maintenance,
});

function Maintenance() {
  const { roles } = useAuth();
  const canWrite = roles.includes("fleet_manager") || roles.includes("admin");
  const { data: logs = [], isLoading } = useMaintenance();
  const { data: vehicles = [] } = useVehicles();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "",
    description: "",
    cost: 0,
    service_date: new Date().toISOString().slice(0, 10),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["maintenance"] });
    qc.invalidateQueries({ queryKey: ["vehicles"] });
  }

  const create = useMutation({
    mutationFn: () => createMaintenance(form),
    onSuccess: () => {
      invalidate();
      toast.success("Logged — vehicle moved to In Shop");
      setOpen(false);
      setForm({
        vehicle_id: "",
        description: "",
        cost: 0,
        service_date: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const serviceable = vehicles.filter((v) => v.status !== "On Trip" && v.status !== "Retired");

  return (
    <div>
      <PageHeader
        title="Maintenance"
        subtitle="Open a log to move a vehicle In Shop; close it to restore availability."
        icon={<Wrench className="h-5 w-5" />}
        actions={
          canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="glow">
                  <Plus className="mr-1.5 h-4 w-4" /> New Log
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Maintenance Log</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Vehicle</Label>
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
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Oil change"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cost</Label>
                      <Input
                        type="number"
                        value={form.cost}
                        onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Service Date</Label>
                      <Input
                        type="date"
                        value={form.service_date}
                        onChange={(e) => setForm({ ...form, service_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => create.mutate()}
                    disabled={create.isPending || !form.vehicle_id || !form.description}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <Card className="glass overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-10 w-10" />}
            title="No maintenance logs"
            hint="Create a log to schedule shop work."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono">
                    {l.vehicle?.registration_number ?? "—"}
                  </TableCell>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="text-muted-foreground">{l.service_date}</TableCell>
                  <TableCell className="text-right tabular">{currency(Number(l.cost))}</TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite ? (
                      <div className="flex justify-end gap-1">
                        {l.status === "Open" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              closeMaintenance(l)
                                .then(() => {
                                  invalidate();
                                  toast.success("Closed — vehicle restored");
                                })
                                .catch((e) => toast.error(e.message))
                            }
                          >
                            <CircleCheck className="mr-1 h-3.5 w-3.5 text-success" /> Close
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMaintenance(l.id).then(() => invalidate())}
                        >
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
    </div>
  );
}
