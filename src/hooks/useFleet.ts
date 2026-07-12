import { useQuery } from "@tanstack/react-query";
import {
  fetchVehicles,
  fetchDrivers,
  fetchTrips,
  fetchMaintenance,
  fetchFuelLogs,
  fetchExpenses,
} from "@/lib/data";

export const useVehicles = () => useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
export const useDrivers = () => useQuery({ queryKey: ["drivers"], queryFn: fetchDrivers });
export const useTrips = () => useQuery({ queryKey: ["trips"], queryFn: fetchTrips });
export const useMaintenance = () =>
  useQuery({ queryKey: ["maintenance"], queryFn: fetchMaintenance });
export const useFuelLogs = () => useQuery({ queryKey: ["fuel_logs"], queryFn: fetchFuelLogs });
export const useExpenses = () => useQuery({ queryKey: ["expenses"], queryFn: fetchExpenses });

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join(
    "\n",
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
