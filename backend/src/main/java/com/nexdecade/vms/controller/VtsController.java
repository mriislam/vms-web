package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Dispatch;
import com.nexdecade.vms.entity.Vehicle;
import com.nexdecade.vms.repository.DispatchRepository;
import com.nexdecade.vms.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vts")
@RequiredArgsConstructor
public class VtsController {

    private final DispatchRepository dispatchRepo;
    private final VehicleRepository  vehicleRepo;

    /* ── Bangladesh city GPS coordinates ───────────────────────── */
    private static final Map<String, double[]> CITY_COORDS = new LinkedHashMap<>();
    static {
        CITY_COORDS.put("dhaka",          new double[]{23.8103, 90.4125});
        CITY_COORDS.put("chittagong",     new double[]{22.3569, 91.7832});
        CITY_COORDS.put("ctg",            new double[]{22.3569, 91.7832});
        CITY_COORDS.put("sylhet",         new double[]{24.8949, 91.8687});
        CITY_COORDS.put("rajshahi",       new double[]{24.3745, 88.6042});
        CITY_COORDS.put("khulna",         new double[]{22.8456, 89.5403});
        CITY_COORDS.put("comilla",        new double[]{23.4607, 91.1809});
        CITY_COORDS.put("cumilla",        new double[]{23.4607, 91.1809});
        CITY_COORDS.put("mymensingh",     new double[]{24.7471, 90.4203});
        CITY_COORDS.put("rangpur",        new double[]{25.7439, 89.2752});
        CITY_COORDS.put("barisal",        new double[]{22.7010, 90.3535});
        CITY_COORDS.put("gazipur",        new double[]{23.9999, 90.4203});
        CITY_COORDS.put("narayanganj",    new double[]{23.6238, 90.5000});
        CITY_COORDS.put("savar",          new double[]{23.8584, 90.2668});
        CITY_COORDS.put("narsingdi",      new double[]{23.9203, 90.7152});
        CITY_COORDS.put("tangail",        new double[]{24.2513, 89.9167});
        CITY_COORDS.put("manikganj",      new double[]{23.8645, 90.0027});
        CITY_COORDS.put("airport",        new double[]{23.8433, 90.3978});
        CITY_COORDS.put("cox bazar",      new double[]{21.4272, 92.0058});
        CITY_COORDS.put("mirpur",         new double[]{23.8223, 90.3654});
        CITY_COORDS.put("uttara",         new double[]{23.8759, 90.3795});
        CITY_COORDS.put("keraniganj",     new double[]{23.7180, 90.3830});
        CITY_COORDS.put("port",           new double[]{22.3250, 91.8123});
        CITY_COORDS.put("hq",             new double[]{23.8103, 90.4125});
        CITY_COORDS.put("epz",            new double[]{23.8584, 90.2668});
    }

    /** Live positions for all in-progress trips */
    @GetMapping("/live")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLive() {

        List<Dispatch> trips = dispatchRepo.findByStatus("in_progress");

        // Pre-fetch vehicles by regNo for efficiency
        Set<String> regs = trips.stream().map(Dispatch::getVehicleReg).collect(Collectors.toSet());
        Map<String, Vehicle> vehicleMap = new HashMap<>();
        regs.forEach(r -> vehicleRepo.findByRegNo(r).ifPresent(v -> vehicleMap.put(r, v)));

        long nowSeconds = System.currentTimeMillis() / 1000;

        List<Map<String, Object>> result = trips.stream().map(d -> {
            double[] originCoords = resolveCoords(d.getOrigin());
            double[] destCoords   = resolveCoords(d.getDestination());

            int distKm = d.getDistance() != null && d.getDistance() > 0 ? d.getDistance() : 150;

            // Trip cycle duration in seconds at ~55 km/h average
            long cycleSecs = Math.max(1800L, (long)(distKm / 55.0 * 3600));

            // Unique per-vehicle phase offset so vehicles are at different points
            long phaseOffset = (Math.abs((long) d.getDispatchNo().hashCode()) * 137L) % cycleSecs;

            // Position fraction: advances each second, cycles 0→1 continuously
            double fraction = ((nowSeconds + phaseOffset) % cycleSecs) / (double) cycleSecs;

            // Keep fraction in 0.02–0.97 band so markers stay on road, not at endpoints
            fraction = 0.02 + fraction * 0.95;

            // Small per-call jitter (< 200 m) to simulate GPS noise
            Random rng = new Random(nowSeconds / 10 + d.getId()); // changes every 10 s
            double jitterLat = (rng.nextDouble() - 0.5) * 0.003;
            double jitterLng = (rng.nextDouble() - 0.5) * 0.003;

            double lat = originCoords[0] + (destCoords[0] - originCoords[0]) * fraction + jitterLat;
            double lng = originCoords[1] + (destCoords[1] - originCoords[1]) * fraction + jitterLng;

            // Speed: realistic highway variation 50–85 km/h
            int speed = 50 + rng.nextInt(36);

            // Fuel: starts high, depletes over the cycle (85 % → 20 %)
            double fuel = Math.round((85.0 - fraction * 65.0) * 10) / 10.0;

            // Heading text from bearing
            String heading = calcHeading(originCoords, destCoords);

            // Vehicle metadata
            Vehicle veh = vehicleMap.get(d.getVehicleReg());
            String vehicleType = veh != null ? veh.getType()                               : "Vehicle";
            String vehicleMake = veh != null ? veh.getMake() + " " + veh.getModel()        : "";

            int elapsedKm = (int)(distKm * fraction);

            // Determine current location description from fraction
            String currentLocation = interpolateLocationName(d.getOrigin(), d.getDestination(), fraction);

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("key",           d.getId());
            entry.put("dispatchNo",    d.getDispatchNo());
            entry.put("vehicle",       d.getVehicleReg());
            entry.put("vehicleType",   vehicleType);
            entry.put("vehicleMake",   vehicleMake);
            entry.put("driver",        d.getDriverName());
            entry.put("origin",        d.getOrigin());
            entry.put("destination",   d.getDestination());
            entry.put("route",         d.getOrigin() + " → " + d.getDestination());
            entry.put("distance",      distKm);
            entry.put("elapsedKm",     elapsedKm);
            entry.put("speed",         speed);
            entry.put("lat",           Math.round(lat * 10000.0) / 10000.0);
            entry.put("lng",           Math.round(lng * 10000.0) / 10000.0);
            entry.put("fuel",          fuel);
            entry.put("heading",       heading);
            entry.put("status",        "moving");
            entry.put("location",      currentLocation);
            entry.put("purpose",       d.getPurpose());
            entry.put("approvedBy",    d.getApprovedBy());
            entry.put("lastUpdate",    "just now");
            entry.put("progress",      (int)(fraction * 100));
            entry.put("temp",          rng.nextInt(10) < 1 ? "High" : "Normal"); // 10 % chance of high
            return entry;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /* ── helpers ────────────────────────────────────────────────── */

    private double[] resolveCoords(String location) {
        if (location == null) return CITY_COORDS.get("dhaka");
        String key = location.toLowerCase().trim();
        if (CITY_COORDS.containsKey(key)) return CITY_COORDS.get(key);
        for (Map.Entry<String, double[]> e : CITY_COORDS.entrySet()) {
            if (key.contains(e.getKey())) return e.getValue();
        }
        return CITY_COORDS.get("dhaka");
    }

    private String calcHeading(double[] from, double[] to) {
        double angle = Math.toDegrees(Math.atan2(to[1] - from[1], to[0] - from[0]));
        if (angle < 0) angle += 360;
        String[] dirs = {"E", "NE", "N", "NW", "W", "SW", "S", "SE", "E"};
        return dirs[(int) Math.round(angle / 45) % 8];
    }

    private String interpolateLocationName(String origin, String dest, double fraction) {
        if (fraction < 0.15) return "Near " + origin;
        if (fraction > 0.85) return "Approaching " + dest;
        return "En route: " + cleanCity(origin) + " → " + cleanCity(dest);
    }

    private String cleanCity(String loc) {
        if (loc == null) return "";
        return loc.replace(" HQ", "").replace(" Office", "").replace(" Port", "").trim();
    }
}
