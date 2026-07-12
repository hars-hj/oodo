-- 1. Drop existing loose policies
DROP POLICY IF EXISTS "Vehicles readable by authenticated" ON public.vehicles;
DROP POLICY IF EXISTS "Vehicles writable by authenticated" ON public.vehicles;
DROP POLICY IF EXISTS "Drivers readable by authenticated" ON public.drivers;
DROP POLICY IF EXISTS "Drivers writable by authenticated" ON public.drivers;
DROP POLICY IF EXISTS "Trips readable by authenticated" ON public.trips;
DROP POLICY IF EXISTS "Trips writable by authenticated" ON public.trips;
DROP POLICY IF EXISTS "Maintenance readable by authenticated" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Maintenance writable by authenticated" ON public.maintenance_logs;
DROP POLICY IF EXISTS "Fuel readable by authenticated" ON public.fuel_logs;
DROP POLICY IF EXISTS "Fuel writable by authenticated" ON public.fuel_logs;
DROP POLICY IF EXISTS "Expenses readable by authenticated" ON public.expenses;
DROP POLICY IF EXISTS "Expenses writable by authenticated" ON public.expenses;

-- 2. Define BEFORE UPDATE triggers for column-level security
CREATE OR REPLACE FUNCTION public.enforce_vehicle_update_rules()
RETURNS TRIGGER AS $$
BEGIN
  IF public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'driver') THEN
    IF (NEW.id IS DISTINCT FROM OLD.id) OR
       (NEW.registration_number IS DISTINCT FROM OLD.registration_number) OR
       (NEW.name IS DISTINCT FROM OLD.name) OR
       (NEW.type IS DISTINCT FROM OLD.type) OR
       (NEW.max_load_capacity IS DISTINCT FROM OLD.max_load_capacity) OR
       (NEW.region IS DISTINCT FROM OLD.region) OR
       (NEW.created_by IS DISTINCT FROM OLD.created_by) OR
       (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
      RAISE EXCEPTION 'Drivers can only update vehicle status, odometer, or revenue';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unauthorized to update vehicles';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_vehicles_update_restriction
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vehicle_update_rules();

CREATE OR REPLACE FUNCTION public.enforce_driver_update_rules()
RETURNS TRIGGER AS $$
BEGIN
  IF public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'safety_officer') THEN
    IF (NEW.id IS DISTINCT FROM OLD.id) OR
       (NEW.name IS DISTINCT FROM OLD.name) OR
       (NEW.contact_number IS DISTINCT FROM OLD.contact_number) OR
       (NEW.status IS DISTINCT FROM OLD.status) OR
       (NEW.region IS DISTINCT FROM OLD.region) OR
       (NEW.created_by IS DISTINCT FROM OLD.created_by) OR
       (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
      RAISE EXCEPTION 'Safety Officers can only update license and safety score fields';
    END IF;
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'driver') THEN
    IF (NEW.id IS DISTINCT FROM OLD.id) OR
       (NEW.name IS DISTINCT FROM OLD.name) OR
       (NEW.license_number IS DISTINCT FROM OLD.license_number) OR
       (NEW.license_category IS DISTINCT FROM OLD.license_category) OR
       (NEW.license_expiry IS DISTINCT FROM OLD.license_expiry) OR
       (NEW.contact_number IS DISTINCT FROM OLD.contact_number) OR
       (NEW.safety_score IS DISTINCT FROM OLD.safety_score) OR
       (NEW.region IS DISTINCT FROM OLD.region) OR
       (NEW.created_by IS DISTINCT FROM OLD.created_by) OR
       (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
      RAISE EXCEPTION 'Drivers can only update driver status';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Unauthorized to update drivers';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_drivers_update_restriction
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_update_rules();

-- 3. Define RLS Policies

-- Vehicles
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "vehicles_insert" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vehicles_update" ON public.vehicles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "vehicles_delete" ON public.vehicles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin'));

-- Drivers
CREATE POLICY "drivers_select" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "drivers_insert" ON public.drivers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "drivers_update" ON public.drivers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'safety_officer') OR public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'safety_officer') OR public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "drivers_delete" ON public.drivers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin'));

-- Trips
CREATE POLICY "trips_select" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "trips_insert" ON public.trips FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "trips_update" ON public.trips FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "trips_delete" ON public.trips FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin'));

-- Maintenance Logs
CREATE POLICY "maintenance_select" ON public.maintenance_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "maintenance_insert" ON public.maintenance_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "maintenance_update" ON public.maintenance_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "maintenance_delete" ON public.maintenance_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'admin'));

-- Fuel Logs
CREATE POLICY "fuel_select" ON public.fuel_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'safety_officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fuel_insert" ON public.fuel_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fuel_update" ON public.fuel_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fuel_delete" ON public.fuel_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin'));

-- Expenses
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'fleet_manager') OR public.has_role(auth.uid(), 'safety_officer') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "expenses_delete" ON public.expenses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'financial_analyst') OR public.has_role(auth.uid(), 'admin'));
