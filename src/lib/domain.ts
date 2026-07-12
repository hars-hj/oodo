import type { Database } from "@/integrations/supabase/types";

export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type Driver = Database["public"]["Tables"]["drivers"]["Row"];
export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type MaintenanceLog = Database["public"]["Tables"]["maintenance_logs"]["Row"];
export type FuelLog = Database["public"]["Tables"]["fuel_logs"]["Row"];
export type Expense = Database["public"]["Tables"]["expenses"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type VehicleStatus = Database["public"]["Enums"]["vehicle_status"];
export type DriverStatus = Database["public"]["Enums"]["driver_status"];
export type TripStatus = Database["public"]["Enums"]["trip_status"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  fleet_manager: "Fleet Manager",
  driver: "Driver / Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};

export const VEHICLE_TYPES = ["Van", "Truck", "Trailer", "Pickup", "Bus", "Refrigerated"];
export const REGIONS = ["North", "South", "East", "West", "Central"];
export const LICENSE_CATEGORIES = ["A", "B", "C", "D", "CE", "Heavy"];

export const VEHICLE_STATUSES: VehicleStatus[] = ["Available", "On Trip", "In Shop", "Retired"];
export const DRIVER_STATUSES: DriverStatus[] = ["Available", "On Trip", "Off Duty", "Suspended"];
export const TRIP_STATUSES: TripStatus[] = ["Draft", "Dispatched", "Completed", "Cancelled"];

export const STATUS_TONE: Record<string, string> = {
  Available: "bg-success/15 text-success border-success/30",
  "On Trip": "bg-info/15 text-info border-info/30",
  "In Shop": "bg-warning/15 text-warning border-warning/30",
  Retired: "bg-muted text-muted-foreground border-border",
  "Off Duty": "bg-muted text-muted-foreground border-border",
  Suspended: "bg-destructive/15 text-destructive border-destructive/30",
  Draft: "bg-muted text-muted-foreground border-border",
  Dispatched: "bg-info/15 text-info border-info/30",
  Completed: "bg-success/15 text-success border-success/30",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  Open: "bg-warning/15 text-warning border-warning/30",
  Closed: "bg-success/15 text-success border-success/30",
};

export function isLicenseExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

export function currency(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);
}

export function num(n: number, digits = 1): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n || 0);
}
