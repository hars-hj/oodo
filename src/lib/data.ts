import { supabase } from "@/integrations/supabase/client";
import type {
  Vehicle,
  Driver,
  Trip,
  MaintenanceLog,
  FuelLog,
  Expense,
} from "@/lib/domain";
import { isLicenseExpired } from "@/lib/domain";

export type TripWithRelations = Trip & {
  vehicle: Pick<Vehicle, "id" | "name" | "registration_number"> | null;
  driver: Pick<Driver, "id" | "name"> | null;
};

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------------- Fetchers ---------------- */
export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase.from("drivers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchTrips(): Promise<TripWithRelations[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*, vehicle:vehicles(id,name,registration_number), driver:drivers(id,name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as TripWithRelations[];
}

export async function fetchMaintenance(): Promise<(MaintenanceLog & { vehicle: Pick<Vehicle, "name" | "registration_number"> | null })[]> {
  const { data, error } = await supabase
    .from("maintenance_logs")
    .select("*, vehicle:vehicles(name,registration_number)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as never;
}

export async function fetchFuelLogs(): Promise<(FuelLog & { vehicle: Pick<Vehicle, "name"> | null })[]> {
  const { data, error } = await supabase
    .from("fuel_logs")
    .select("*, vehicle:vehicles(name)")
    .order("log_date", { ascending: false });
  if (error) throw error;
  return data as never;
}

export async function fetchExpenses(): Promise<(Expense & { vehicle: Pick<Vehicle, "name"> | null })[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, vehicle:vehicles(name)")
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data as never;
}

/* ---------------- Vehicles ---------------- */
export async function saveVehicle(v: Partial<Vehicle> & { id?: string }) {
  const uid = await currentUserId();
  if (v.id) {
    const { id, ...rest } = v;
    const { error } = await supabase.from("vehicles").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("vehicles").insert({ ...v, created_by: uid } as never);
    if (error) {
      if (error.code === "23505") throw new Error("Registration number must be unique.");
      throw error;
    }
  }
}

export async function deleteVehicle(id: string) {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Drivers ---------------- */
export async function saveDriver(d: Partial<Driver> & { id?: string }) {
  const uid = await currentUserId();

  if (d.license_number) {
    let query = supabase.from("drivers").select("id").eq("license_number", d.license_number);
    if (d.id) {
      query = query.neq("id", d.id);
    }
    const { data: existing, error: checkError } = await query;
    if (checkError) throw checkError;
    if (existing && existing.length > 0) {
      throw new Error("License Number already exists");
    }
  }

  if (d.id) {
    const { id, ...rest } = d;
    const { error } = await supabase.from("drivers").update(rest).eq("id", id);
    if (error) {
      if (error.code === "23505") throw new Error("License Number already exists");
      throw error;
    }
  } else {
    const { error } = await supabase.from("drivers").insert({ ...d, created_by: uid } as never);
    if (error) {
      if (error.code === "23505") throw new Error("License Number already exists");
      throw error;
    }
  }
}

export async function deleteDriver(id: string) {
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Trips (business rules) ---------------- */
export async function createTrip(input: {
  source: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  cargo_weight: number;
  planned_distance: number;
  revenue: number;
}) {
  const uid = await currentUserId();
  const [{ data: vehicle }, { data: driver }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", input.vehicle_id).single(),
    supabase.from("drivers").select("*").eq("id", input.driver_id).single(),
  ]);
  if (!vehicle || !driver) throw new Error("Vehicle or driver not found.");

  if (["Retired", "In Shop"].includes(vehicle.status)) throw new Error("Retired or In Shop vehicles cannot be dispatched.");
  if (vehicle.status === "On Trip") throw new Error("This vehicle is already On Trip.");
  if (driver.status === "On Trip") throw new Error("This driver is already On Trip.");
  if (driver.status === "Suspended") throw new Error("Suspended drivers cannot be assigned.");
  if (isLicenseExpired(driver.license_expiry)) throw new Error("Driver's license has expired.");
  if (input.cargo_weight > vehicle.max_load_capacity)
    throw new Error(`Cargo (${input.cargo_weight}kg) exceeds capacity (${vehicle.max_load_capacity}kg).`);

  const { error } = await supabase.from("trips").insert({ ...input, status: "Draft", created_by: uid } as never);
  if (error) throw error;
}

export async function dispatchTrip(trip: Trip) {
  if (!trip.vehicle_id || !trip.driver_id) throw new Error("Trip needs a vehicle and driver.");
  const [{ data: vehicle }, { data: driver }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", trip.vehicle_id).single(),
    supabase.from("drivers").select("*").eq("id", trip.driver_id).single(),
  ]);
  if (!vehicle || !driver) throw new Error("Vehicle or driver missing.");
  if (["Retired", "In Shop"].includes(vehicle.status)) throw new Error("Vehicle unavailable for dispatch.");
  if (vehicle.status === "On Trip" || driver.status === "On Trip") throw new Error("Vehicle or driver already On Trip.");
  if (driver.status === "Suspended" || isLicenseExpired(driver.license_expiry)) throw new Error("Driver not eligible.");

  await supabase.from("trips").update({ status: "Dispatched" }).eq("id", trip.id);
  await supabase.from("vehicles").update({ status: "On Trip" }).eq("id", trip.vehicle_id);
  await supabase.from("drivers").update({ status: "On Trip" }).eq("id", trip.driver_id);
}

export async function completeTrip(trip: Trip, finalOdometer: number, fuelConsumed: number) {
  const { data: vehicle } = await supabase.from("vehicles").select("*").eq("id", trip.vehicle_id!).single();
  const actualDistance = vehicle ? Math.max(0, finalOdometer - Number(vehicle.odometer)) : trip.planned_distance;

  await supabase.from("trips").update({
    status: "Completed",
    actual_distance: actualDistance,
    fuel_consumed: fuelConsumed,
  }).eq("id", trip.id);

  if (trip.vehicle_id) {
    await supabase.from("vehicles").update({
      status: "Available",
      odometer: finalOdometer,
      revenue: (Number(vehicle?.revenue) || 0) + Number(trip.revenue || 0),
    }).eq("id", trip.vehicle_id);
    if (fuelConsumed > 0) {
      await supabase.from("fuel_logs").insert({
        vehicle_id: trip.vehicle_id,
        liters: fuelConsumed,
        cost: 0,
        created_by: await currentUserId(),
      } as never);
    }
  }
  if (trip.driver_id) await supabase.from("drivers").update({ status: "Available" }).eq("id", trip.driver_id);
}

export async function cancelTrip(trip: Trip) {
  await supabase.from("trips").update({ status: "Cancelled" }).eq("id", trip.id);
  if (trip.status === "Dispatched") {
    if (trip.vehicle_id) await supabase.from("vehicles").update({ status: "Available" }).eq("id", trip.vehicle_id);
    if (trip.driver_id) await supabase.from("drivers").update({ status: "Available" }).eq("id", trip.driver_id);
  }
}

export async function deleteTrip(trip: Trip) {
  if (trip.status === "Dispatched") await cancelTrip(trip);
  const { error } = await supabase.from("trips").delete().eq("id", trip.id);
  if (error) throw error;
}

/* ---------------- Maintenance ---------------- */
export async function createMaintenance(input: { vehicle_id: string; description: string; cost: number; service_date: string }) {
  const uid = await currentUserId();
  const { data: vehicle } = await supabase.from("vehicles").select("status").eq("id", input.vehicle_id).single();
  if (vehicle?.status === "On Trip") throw new Error("Vehicle is On Trip — complete the trip first.");
  const { error } = await supabase.from("maintenance_logs").insert({ ...input, status: "Open", created_by: uid } as never);
  if (error) throw error;
  await supabase.from("vehicles").update({ status: "In Shop" }).eq("id", input.vehicle_id);
}

export async function closeMaintenance(log: MaintenanceLog) {
  await supabase.from("maintenance_logs").update({ status: "Closed", closed_at: new Date().toISOString() }).eq("id", log.id);
  const { data: vehicle } = await supabase.from("vehicles").select("status").eq("id", log.vehicle_id).single();
  if (vehicle && vehicle.status !== "Retired") {
    await supabase.from("vehicles").update({ status: "Available" }).eq("id", log.vehicle_id);
  }
}

export async function deleteMaintenance(id: string) {
  const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Fuel & Expenses ---------------- */
export async function createFuelLog(input: { vehicle_id: string; liters: number; cost: number; log_date: string }) {
  const uid = await currentUserId();
  const { error } = await supabase.from("fuel_logs").insert({ ...input, created_by: uid } as never);
  if (error) throw error;
}
export async function deleteFuelLog(id: string) {
  const { error } = await supabase.from("fuel_logs").delete().eq("id", id);
  if (error) throw error;
}
export async function createExpense(input: { vehicle_id: string | null; category: string; amount: number; description: string; expense_date: string }) {
  const uid = await currentUserId();
  const { error } = await supabase.from("expenses").insert({ ...input, created_by: uid } as never);
  if (error) throw error;
}
export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}
