import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFuelLogs, useExpenses, useVehicles, downloadCsv } from "@/hooks/useFleet";
import { useAuth } from "@/hooks/useAuth";
import { createFuelLog, deleteFuelLog, createExpense, deleteExpense } from "@/lib/data";
import { PageHeader, EmptyState } from "@/components/shared";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Receipt, Plus, Fuel, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { currency, num } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/expenses")({
  component: FuelExpenses,
});

const EXPENSE_CATEGORIES = ["Toll", "Maintenance", "Insurance", "Parking", "Fine", "Other"];

function FuelExpenses() {
  const { roles } = useAuth();
  const canWrite = roles.includes("financial_analyst") || roles.includes("admin");
  const { data: fuel = [] } = useFuelLogs();
  const { data: expenses = [] } = useExpenses();
  const { data: vehicles = [] } = useVehicles();
  const qc = useQueryClient();

  const totalFuel = fuel.reduce((s, f) => s + Number(f.cost), 0);
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Fuel & Expenses"
        subtitle="Track fuel consumption and operational costs."
        icon={<Receipt className="h-5 w-5" />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="glass card-rise p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Fuel Cost</p>
          <p className="mt-2 font-display text-2xl font-bold tabular">{currency(totalFuel)}</p>
        </Card>
        <Card className="glass card-rise p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Other Expenses</p>
          <p className="mt-2 font-display text-2xl font-bold tabular">{currency(totalExp)}</p>
        </Card>
        <Card className="glass card-rise p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Total Operational Cost
          </p>
          <p className="mt-2 font-display text-2xl font-bold text-gradient tabular">
            {currency(totalFuel + totalExp)}
          </p>
        </Card>
      </div>

      <Tabs defaultValue="fuel">
        <TabsList>
          <TabsTrigger value="fuel">
            <Fuel className="mr-1.5 h-4 w-4" /> Fuel Logs
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <Receipt className="mr-1.5 h-4 w-4" /> Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fuel">
          <FuelTab fuel={fuel} vehicles={vehicles} qc={qc} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpenseTab expenses={expenses} vehicles={vehicles} qc={qc} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FuelTab({
  fuel,
  vehicles,
  qc,
  canWrite,
}: {
  fuel: NonNullable<ReturnType<typeof useFuelLogs>["data"]>;
  vehicles: NonNullable<ReturnType<typeof useVehicles>["data"]>;
  qc: ReturnType<typeof useQueryClient>;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "",
    liters: 0,
    cost: 0,
    log_date: new Date().toISOString().slice(0, 10),
  });
  const create = useMutation({
    mutationFn: () => createFuelLog(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fuel_logs"] });
      toast.success("Fuel logged");
      setOpen(false);
      setForm({
        vehicle_id: "",
        liters: 0,
        cost: 0,
        log_date: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <Card className="glass mt-4 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-muted-foreground">{fuel?.length ?? 0} entries</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                "fuel_logs.csv",
                (fuel ?? []).map((f) => ({
                  vehicle: f.vehicle?.name,
                  liters: f.liters,
                  cost: f.cost,
                  date: f.log_date,
                })),
              )
            }
            disabled={!fuel?.length}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          {canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add Fuel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Fuel Log</DialogTitle>
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
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.registration_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Liters</Label>
                      <Input
                        type="number"
                        value={form.liters}
                        onChange={(e) => setForm({ ...form, liters: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cost</Label>
                      <Input
                        type="number"
                        value={form.cost}
                        onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={form.log_date}
                        onChange={(e) => setForm({ ...form, log_date: e.target.value })}
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
                    disabled={create.isPending || !form.vehicle_id}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {!fuel?.length ? (
        <EmptyState icon={<Fuel className="h-10 w-10" />} title="No fuel logs" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead className="text-right">Liters</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fuel.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.vehicle?.name ?? "—"}</TableCell>
                <TableCell className="text-right tabular">{num(Number(f.liters))} L</TableCell>
                <TableCell className="text-right tabular">{currency(Number(f.cost))}</TableCell>
                <TableCell className="text-muted-foreground">{f.log_date}</TableCell>
                <TableCell className="text-right">
                  {canWrite ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        deleteFuelLog(f.id).then(() =>
                          qc.invalidateQueries({ queryKey: ["fuel_logs"] }),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
  );
}

function ExpenseTab({
  expenses,
  vehicles,
  qc,
  canWrite,
}: {
  expenses: NonNullable<ReturnType<typeof useExpenses>["data"]>;
  vehicles: NonNullable<ReturnType<typeof useVehicles>["data"]>;
  qc: ReturnType<typeof useQueryClient>;
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "",
    category: "Toll",
    amount: 0,
    description: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const create = useMutation({
    mutationFn: () => createExpense({ ...form, vehicle_id: form.vehicle_id || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense recorded");
      setOpen(false);
      setForm({
        vehicle_id: "",
        category: "Toll",
        amount: 0,
        description: "",
        expense_date: new Date().toISOString().slice(0, 10),
      });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <Card className="glass mt-4 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <p className="text-sm text-muted-foreground">{expenses.length} entries</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCsv(
                "expenses.csv",
                expenses.map((e) => ({
                  vehicle: e.vehicle?.name,
                  category: e.category,
                  amount: e.amount,
                  description: e.description,
                  date: e.expense_date,
                })),
              )
            }
            disabled={!expenses.length}
          >
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          {canWrite && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Vehicle (optional)</Label>
                      <Select
                        value={form.vehicle_id}
                        onValueChange={(v) => setForm({ ...form, vehicle_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.registration_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Category</Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) => setForm({ ...form, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Highway toll"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={form.expense_date}
                        onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
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
                    disabled={create.isPending || !form.amount}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {!expenses.length ? (
        <EmptyState icon={<Receipt className="h-10 w-10" />} title="No expenses" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.category}</TableCell>
                <TableCell className="text-muted-foreground">{e.vehicle?.name ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{e.description}</TableCell>
                <TableCell className="text-right tabular">{currency(Number(e.amount))}</TableCell>
                <TableCell className="text-muted-foreground">{e.expense_date}</TableCell>
                <TableCell className="text-right">
                  {canWrite ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        deleteExpense(e.id).then(() =>
                          qc.invalidateQueries({ queryKey: ["expenses"] }),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
  );
}
