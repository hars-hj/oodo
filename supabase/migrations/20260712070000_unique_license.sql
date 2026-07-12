-- Add unique constraint to license_number in drivers table
ALTER TABLE public.drivers ADD CONSTRAINT drivers_license_number_key UNIQUE (license_number);
