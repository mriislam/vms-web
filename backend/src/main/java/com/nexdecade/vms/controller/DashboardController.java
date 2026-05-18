package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final VehicleRepository     vehicleRepo;
    private final DriverRepository      driverRepo;
    private final DispatchRepository    dispatchRepo;
    private final MaintenanceRepository maintenanceRepo;
    private final FuelRecordRepository  fuelRepo;
    private final InventoryRepository   inventoryRepo;
    private final AccidentRepository    accidentRepo;
    private final ExpenseRepository     expenseRepo;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> stats() {
        Map<String, Object> data = new LinkedHashMap<>();
        LocalDate now = LocalDate.now();

        // ── Preload frequently used lists ────────────────────────────────────
        var allVehicles   = vehicleRepo.findAll();
        var allDrivers    = driverRepo.findAll();
        var allDispatches = dispatchRepo.findAll();
        var allMaint      = maintenanceRepo.findAll();
        var allFuel       = fuelRepo.findAll();
        var allExp        = expenseRepo.findAll();
        var allInventory  = inventoryRepo.findAll();
        var allAccidents  = accidentRepo.findAll();

        // ── Basic counters ──────────────────────────────────────────────────
        int activeVehicles    = (int) allVehicles.stream().filter(v -> "active".equals(v.getStatus())).count();
        int activeDrivers     = (int) allDrivers.stream().filter(d -> "active".equals(d.getStatus())).count();
        int dispatchPending   = (int) allDispatches.stream().filter(d -> "pending".equals(d.getStatus())).count();
        int dispatchProgress  = (int) allDispatches.stream().filter(d -> "in_progress".equals(d.getStatus())).count();
        int maintPending      = (int) allMaint.stream().filter(m -> "pending".equals(m.getStatus())).count();
        int lowStock          = (int) allInventory.stream().filter(i -> "low_stock".equals(i.getStatus())).count();
        long openAccidents    = allAccidents.stream().filter(a -> "open".equals(a.getStatus())).count();

        data.put("totalVehicles",     (long) allVehicles.size());
        data.put("activeVehicles",    activeVehicles);
        data.put("totalDrivers",      (long) allDrivers.size());
        data.put("activeDrivers",     activeDrivers);
        data.put("dispatchPending",   dispatchPending);
        data.put("dispatchInProgress",dispatchProgress);
        data.put("maintenancePending",maintPending);
        data.put("lowStockItems",     lowStock);
        data.put("openAccidents",     openAccidents);

        // ── Fleet status breakdown ──────────────────────────────────────────
        Map<String, String> statusColors = new LinkedHashMap<>();
        statusColors.put("active",      "#52c41a");
        statusColors.put("in_service",  "#1677ff");
        statusColors.put("maintenance", "#fa8c16");
        statusColors.put("inactive",    "#ff4d4f");
        statusColors.put("retired",     "#8c8c8c");

        Map<String, Long> byStatus = allVehicles.stream()
                .collect(Collectors.groupingBy(
                        v -> v.getStatus() != null ? v.getStatus() : "inactive",
                        Collectors.counting()));

        List<Map<String, Object>> fleetStatus = byStatus.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name",  capitalise(e.getKey().replace("_", " ")));
                    m.put("value", e.getValue());
                    m.put("color", statusColors.getOrDefault(e.getKey(), "#8c8c8c"));
                    return m;
                }).collect(Collectors.toList());
        data.put("fleetStatus", fleetStatus);

        // ── Monthly costs — last 6 months ────────────────────────────────────
        List<Map<String, Object>> monthly = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate mo = now.minusMonths(i);
            int yr = mo.getYear(), mv = mo.getMonthValue();

            long fuel = allFuel.stream()
                    .filter(f -> f.getDate() != null && f.getDate().getYear() == yr && f.getDate().getMonthValue() == mv)
                    .mapToLong(f -> f.getTotal() != null ? f.getTotal().longValue() : 0).sum();

            long maint = allMaint.stream()
                    .filter(m -> m.getDate() != null && m.getDate().getYear() == yr && m.getDate().getMonthValue() == mv)
                    .mapToLong(m -> m.getCost() != null ? m.getCost().longValue() : 0).sum();

            long other = allExp.stream()
                    .filter(e -> e.getDate() != null && e.getDate().getYear() == yr && e.getDate().getMonthValue() == mv)
                    .mapToLong(e -> e.getAmount() != null ? e.getAmount().longValue() : 0).sum();

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month",       mo.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
            row.put("fuel",        fuel);
            row.put("maintenance", maint);
            row.put("other",       other);
            monthly.add(row);
        }
        data.put("monthlyCosts", monthly);

        // ── Weekly dispatches — last 7 days ─────────────────────────────────
        List<Map<String, Object>> weekly = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = now.minusDays(i);
            long cnt = allDispatches.stream().filter(d -> day.equals(d.getDate())).count();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("day",        day.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
            row.put("dispatches", cnt);
            weekly.add(row);
        }
        long weeklyTotal = allDispatches.stream()
                .filter(d -> d.getDate() != null && !d.getDate().isBefore(now.minusDays(7))).count();
        data.put("weeklyDispatches", weekly);
        data.put("weeklyTotal",      weeklyTotal);

        // ── Recent dispatches ────────────────────────────────────────────────
        List<Map<String, Object>> recent = allDispatches.stream()
                .sorted((a, b) -> {
                    long idA = a.getId() != null ? a.getId() : 0L;
                    long idB = b.getId() != null ? b.getId() : 0L;
                    return Long.compare(idB, idA);
                })
                .limit(5)
                .map(d -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("key",         d.getId());
                    row.put("vehicle",     d.getVehicleReg());
                    row.put("driver",      d.getDriverName());
                    row.put("destination", d.getDestination());
                    row.put("status",      d.getStatus());
                    return row;
                }).collect(Collectors.toList());
        data.put("recentDispatches", recent);

        // ── Alerts ───────────────────────────────────────────────────────────
        List<Map<String, Object>> alerts = new ArrayList<>();

        allMaint.stream()
                .filter(m -> m.getNextDue() != null && m.getNextDue().isBefore(now) && !"completed".equals(m.getStatus()))
                .limit(3)
                .forEach(m -> {
                    long days = ChronoUnit.DAYS.between(m.getNextDue(), now);
                    addAlert(alerts, "#ff4d4f", "maintenance",
                            m.getVehicleReg() + " — " + m.getType().replace("_", " ") + " overdue by " + days + " day(s)");
                });

        if (openAccidents > 0)
            addAlert(alerts, "#ff4d4f", "accident",
                    openAccidents + " open accident case(s) require attention");

        if (lowStock > 0)
            addAlert(alerts, "#fa8c16", "inventory",
                    lowStock + " inventory item(s) are running low on stock");

        if (maintPending > 0)
            addAlert(alerts, "#faad14", "maintenance",
                    maintPending + " maintenance job(s) are pending");

        if (dispatchPending > 0)
            addAlert(alerts, "#1677ff", "dispatch",
                    dispatchPending + " vehicle requisition(s) pending approval");

        if (alerts.isEmpty())
            addAlert(alerts, "#52c41a", "ok", "All systems operating normally");

        data.put("alerts", alerts);

        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    private void addAlert(List<Map<String, Object>> list, String color, String type, String text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("color", color);
        m.put("type",  type);
        m.put("text",  text);
        list.add(m);
    }

    private String capitalise(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
