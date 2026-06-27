import { useQuery } from '@tanstack/react-query';
import { driverService } from '../services/driverService';
import { userService } from '../services/userService';
import { vehicleService } from '../services/vehicleService';
import { vendorService } from '../services/vendorService';

export function useVehicleOptions() {
  const { data = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  return data
    .filter((v) => v.status === 'active' || v.status === 'in_service')
    .map((v) => ({
      value: v.regNo,
      label: v.make ? `${v.regNo} — ${v.make} ${v.model ?? ''}`.trim() : v.regNo,
      make:  v.make,
      model: v.model,
      type:  v.type,
      status: v.status,
      fuelType: v.fuelType,
    }));
}

// Vehicles with last-assigned driver from dispatch history (for auto-fill)
export function useVehicleWithDriverMap() {
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverService.getAll().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  // Build name → driver object map for quick lookup
  const driverByName = Object.fromEntries(drivers.map((d) => [d.name, d]));
  return { vehicles, drivers, driverByName };
}

export function useDriverOptions() {
  const { data = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverService.getAll().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  return data.map((d) => ({
    value: d.id,
    label: d.licenseNo ? `${d.name} (${d.licenseNo})` : d.name,
  }));
}

// Returns driver name as value — used where dispatch/trip stores driverName (string)
export function useDriverNameOptions() {
  const { data = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverService.getAll().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  return data.map((d) => ({
    value: d.name,
    label: d.licenseNo ? `${d.name} (${d.licenseNo})` : d.name,
  }));
}

export function useEmployeeOptions() {
  const { data = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => userService.getAll().then((r) => r.data.data ?? r.data ?? []),
    staleTime: 60_000,
  });
  return data
    .filter((u) => u.status === 'active')
    .map((u) => ({
      value: u.fullName,
      label: u.department ? `${u.fullName} — ${u.department}` : u.fullName,
      department: u.department ?? '',
    }));
}

export function useVendorOptions() {
  const { data = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorService.getAll().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  return data.map((v) => ({ value: v.name, label: v.name }));
}

export const filterOption = (input, opt) =>
  (opt?.label ?? '').toLowerCase().includes(input.toLowerCase());
