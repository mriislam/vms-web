package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.FuelPrice;
import com.nexdecade.vms.entity.Vehicle;
import com.nexdecade.vms.repository.FuelPriceRepository;
import com.nexdecade.vms.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/fuel-prices")
@RequiredArgsConstructor
public class FuelPriceController {

    private final FuelPriceRepository repo;
    private final VehicleRepository   vehicleRepo;

    /** GET /api/fuel-prices — all current prices */
    @GetMapping
    public ResponseEntity<ApiResponse<List<FuelPrice>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(repo.findAllByOrderByFuelTypeAsc()));
    }

    /** GET /api/fuel-prices/{fuelType} — price for a specific fuel */
    @GetMapping("/{fuelType}")
    public ResponseEntity<ApiResponse<FuelPrice>> getByType(@PathVariable String fuelType) {
        return repo.findByFuelType(fuelType)
            .map(p -> ResponseEntity.ok(ApiResponse.ok(p)))
            .orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/fuel-prices — create or update a fuel price */
    @PostMapping
    public ResponseEntity<ApiResponse<FuelPrice>> upsert(@RequestBody FuelPrice body) {
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        FuelPrice price = repo.findByFuelType(body.getFuelType()).orElse(FuelPrice.builder()
            .fuelType(body.getFuelType()).build());
        price.setPricePerUnit(body.getPricePerUnit());
        price.setUnit(body.getUnit() != null ? body.getUnit() : "Liter");
        price.setEffectiveDate(body.getEffectiveDate() != null ? body.getEffectiveDate() : LocalDate.now());
        price.setNotes(body.getNotes());
        price.setUpdatedBy(user);
        return ResponseEntity.ok(ApiResponse.ok("Fuel price updated", repo.save(price)));
    }

    /** PUT /api/fuel-prices/{id} — update by ID */
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FuelPrice>> update(@PathVariable Long id, @RequestBody FuelPrice body) {
        String user = SecurityContextHolder.getContext().getAuthentication().getName();
        FuelPrice price = repo.findById(id)
            .orElseThrow(() -> new RuntimeException("Fuel price not found: " + id));
        price.setPricePerUnit(body.getPricePerUnit());
        price.setUnit(body.getUnit() != null ? body.getUnit() : price.getUnit());
        price.setEffectiveDate(body.getEffectiveDate() != null ? body.getEffectiveDate() : price.getEffectiveDate());
        price.setNotes(body.getNotes());
        price.setUpdatedBy(user);
        return ResponseEntity.ok(ApiResponse.ok("Price updated", repo.save(price)));
    }

    /** DELETE /api/fuel-prices/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        repo.deleteById(id);
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    /**
     * GET /api/fuel-prices/calculate?vehicleReg=DHK-GA-1001&distanceKm=175
     *
     * Returns estimated fuel cost based on:
     *   vehicle's consumption rate × distance × current fuel price
     */
    @GetMapping("/calculate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> calculate(
            @RequestParam String vehicleReg,
            @RequestParam double distanceKm) {

        Vehicle v = vehicleRepo.findByRegNo(vehicleReg)
            .orElseThrow(() -> new RuntimeException("Vehicle not found: " + vehicleReg));

        List<Map<String, Object>> breakdown = new ArrayList<>();
        BigDecimal totalCost = BigDecimal.ZERO;

        // Parse fuel types (supports hybrid: "[Diesel,Electric]")
        List<String> fuelTypes = parseFuelTypes(v.getFuelTypes(), v.getFuelType());

        for (String ft : fuelTypes) {
            Optional<FuelPrice> priceOpt = repo.findByFuelType(ft);
            if (priceOpt.isEmpty()) continue;

            FuelPrice fp = priceOpt.get();
            BigDecimal rate = v.getConsumptionRate() != null
                ? v.getConsumptionRate()
                : defaultRate(ft);                           // fallback rate

            // Cost = (distance / 100) × consumption_per_100km × price_per_unit
            BigDecimal unitsUsed = BigDecimal.valueOf(distanceKm)
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)
                .multiply(rate)
                .divide(BigDecimal.valueOf(fuelTypes.size()), 4, RoundingMode.HALF_UP); // split for hybrid
            BigDecimal cost = unitsUsed.multiply(fp.getPricePerUnit())
                .setScale(2, RoundingMode.HALF_UP);

            totalCost = totalCost.add(cost);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("fuelType",     ft);
            row.put("pricePerUnit", fp.getPricePerUnit());
            row.put("unit",         fp.getUnit());
            row.put("ratePerKm",    rate + " " + fp.getUnit() + "/100km");
            row.put("unitsUsed",    unitsUsed.setScale(3, RoundingMode.HALF_UP));
            row.put("estimatedCost", cost);
            breakdown.add(row);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vehicleReg",    vehicleReg);
        result.put("distanceKm",    distanceKm);
        result.put("fuelTypes",     fuelTypes);
        result.put("isHybrid",      fuelTypes.size() > 1);
        result.put("breakdown",     breakdown);
        result.put("totalEstimatedCost", totalCost);
        result.put("currency",      "BDT");

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private List<String> parseFuelTypes(String fuelTypes, String fallback) {
        if (fuelTypes != null && !fuelTypes.isBlank()) {
            String clean = fuelTypes.replaceAll("[\\[\\]\"\\s]", "");
            return Arrays.asList(clean.split(","));
        }
        return fallback != null ? List.of(fallback) : List.of("Diesel");
    }

    /** Conservative default consumption rates (liters or kWh per 100 km) */
    private BigDecimal defaultRate(String fuelType) {
        return switch (fuelType) {
            case "Diesel"   -> BigDecimal.valueOf(10.0); // 10L/100km
            case "Petrol"   -> BigDecimal.valueOf(12.0);
            case "CNG"      -> BigDecimal.valueOf(8.0);  // kg/100km
            case "Octane"   -> BigDecimal.valueOf(11.0);
            case "Electric" -> BigDecimal.valueOf(20.0); // kWh/100km
            default         -> BigDecimal.valueOf(10.0);
        };
    }
}
