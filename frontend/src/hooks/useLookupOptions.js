import { useQuery } from '@tanstack/react-query';
import { driverService } from '../services/driverService';
import { vehicleService } from '../services/vehicleService';
import { vendorService } from '../services/vendorService';

export function useVehicleOptions() {
  const { data = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll().then((r) => r.data.data ?? []),
    staleTime: 60_000,
  });
  return data.map((v) => ({
    value: v.regNo,
    label: v.make ? `${v.regNo} — ${v.make}${v.model ? ' ' + v.model : ''}` : v.regNo,
  }));
}

export function useDriverOptions() {
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
