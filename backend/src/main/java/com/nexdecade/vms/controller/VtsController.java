package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Dispatch;
import com.nexdecade.vms.entity.GpsDevice;
import com.nexdecade.vms.entity.Vehicle;
import com.nexdecade.vms.repository.DispatchRepository;
import com.nexdecade.vms.repository.GpsDeviceRepository;
import com.nexdecade.vms.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/vts")
@RequiredArgsConstructor
public class VtsController {

    private final DispatchRepository    dispatchRepo;
    private final VehicleRepository     vehicleRepo;
    private final GpsDeviceRepository   gpsDeviceRepo;

    /** Live position cycles every 15 minutes — full route visible in one watch session */
    private static final long CYCLE_SECS = 900L;

    /* ── Bangladesh GPS coordinates ─────────────────────────────── */
    private static final Map<String, double[]> CITY_COORDS = new LinkedHashMap<>();
    static {
        CITY_COORDS.put("dhaka",       new double[]{23.8103, 90.4125});
        CITY_COORDS.put("chittagong",  new double[]{22.3569, 91.7832});
        CITY_COORDS.put("ctg",         new double[]{22.3569, 91.7832});
        CITY_COORDS.put("sylhet",      new double[]{24.8949, 91.8687});
        CITY_COORDS.put("rajshahi",    new double[]{24.3745, 88.6042});
        CITY_COORDS.put("khulna",      new double[]{22.8456, 89.5403});
        CITY_COORDS.put("comilla",     new double[]{23.4607, 91.1809});
        CITY_COORDS.put("mymensingh",  new double[]{24.7471, 90.4203});
        CITY_COORDS.put("rangpur",     new double[]{25.7439, 89.2752});
        CITY_COORDS.put("barisal",     new double[]{22.7010, 90.3535});
        CITY_COORDS.put("gazipur",     new double[]{23.9999, 90.4203});
        CITY_COORDS.put("narayanganj", new double[]{23.6238, 90.5000});
        CITY_COORDS.put("savar",       new double[]{23.8584, 90.2668});
        CITY_COORDS.put("narsingdi",   new double[]{23.9203, 90.7152});
        CITY_COORDS.put("tangail",     new double[]{24.2513, 89.9167});
        CITY_COORDS.put("manikganj",   new double[]{23.8645, 90.0027});
        CITY_COORDS.put("airport",     new double[]{23.8433, 90.3978});
        CITY_COORDS.put("feni",        new double[]{23.0153, 91.3973});
        CITY_COORDS.put("hq",          new double[]{23.8103, 90.4125});
        CITY_COORDS.put("port",        new double[]{22.3250, 91.8123});
        CITY_COORDS.put("jessore",     new double[]{23.1664, 89.2127});
        CITY_COORDS.put("faridpur",    new double[]{23.6070, 89.8429});
        CITY_COORDS.put("bogura",      new double[]{24.8500, 89.3700});
        CITY_COORDS.put("rajbari",     new double[]{23.7597, 89.6440});
        CITY_COORDS.put("keraniganj",  new double[]{23.7149, 90.3783});
        CITY_COORDS.put("munshiganj",  new double[]{23.5422, 90.5305});
        CITY_COORDS.put("sirajganj",   new double[]{24.4507, 89.7003});
        CITY_COORDS.put("habiganj",    new double[]{24.3745, 91.4138});
        CITY_COORDS.put("coxbazar",    new double[]{21.4272, 92.0058});
        CITY_COORDS.put("brahmanbaria",new double[]{23.9571, 91.1082});
    }

    /* ── Multi-segment route waypoints (lat,lng pairs) ──────────── */
    private static final Map<String, List<double[]>> ROUTE_WAYPOINTS = new LinkedHashMap<>();
    static {
        // Dhaka → Chittagong via Comilla & Feni
        ROUTE_WAYPOINTS.put("dhaka|chittagong", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.7127, 90.4439},  // Jatrabari
            new double[]{23.6900, 90.5100},  // Kanchpur
            new double[]{23.5200, 90.7000},  // Meghna
            new double[]{23.4607, 91.1809},  // Comilla
            new double[]{23.0153, 91.3973},  // Feni
            new double[]{22.5500, 91.7000},  // Mirersarai
            new double[]{22.3569, 91.7832}   // Chittagong
        ));
        // Dhaka → Sylhet via Brahmanbaria
        ROUTE_WAYPOINTS.put("dhaka|sylhet", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.7416, 90.5932},  // Kanchpur
            new double[]{23.9203, 90.7152},  // Narsingdi
            new double[]{24.0526, 90.9794},  // Bhairab
            new double[]{23.9571, 91.1082},  // Brahmanbaria
            new double[]{24.3745, 91.4138},  // Habiganj
            new double[]{24.8949, 91.8687}   // Sylhet
        ));
        // Dhaka → Rajshahi via Bangabandhu Bridge
        ROUTE_WAYPOINTS.put("dhaka|rajshahi", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.8584, 90.2668},  // Savar
            new double[]{23.8645, 90.0027},  // Manikganj
            new double[]{24.1037, 89.7809},  // Bangabandhu Bridge
            new double[]{24.4507, 89.7003},  // Sirajganj
            new double[]{24.3745, 88.6042}   // Rajshahi
        ));
        // Dhaka → Mymensingh via Gazipur
        ROUTE_WAYPOINTS.put("dhaka|mymensingh", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.9000, 90.4000},  // Tongi
            new double[]{23.9999, 90.4203},  // Gazipur
            new double[]{24.1932, 90.4726},  // Sreepur
            new double[]{24.4500, 90.4100},  // Mymensingh outskirts
            new double[]{24.7471, 90.4203}   // Mymensingh
        ));
        // Dhaka → Khulna via Aricha Ghat → Rajbari → Faridpur → Jessore
        ROUTE_WAYPOINTS.put("dhaka|khulna", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.8584, 90.2668},  // Savar
            new double[]{23.8645, 90.0027},  // Manikganj
            new double[]{23.7819, 90.0234},  // Aricha Ghat
            new double[]{23.7597, 89.6440},  // Rajbari
            new double[]{23.6070, 89.8429},  // Faridpur
            new double[]{23.1664, 89.2127},  // Jessore
            new double[]{22.8456, 89.5403}   // Khulna
        ));
        // Dhaka → Barisal via Padma Bridge (Mawa)
        ROUTE_WAYPOINTS.put("dhaka|barisal", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.7149, 90.3783},  // Keraniganj
            new double[]{23.5422, 90.5305},  // Munshiganj
            new double[]{23.4197, 90.2608},  // Padma Bridge (Mawa)
            new double[]{23.0218, 89.8552},  // Bhanga
            new double[]{22.7800, 90.3600},  // Barisal outskirts
            new double[]{22.7010, 90.3535}   // Barisal
        ));
        // Dhaka → Rangpur via Bangabandhu Bridge → Bogura
        ROUTE_WAYPOINTS.put("dhaka|rangpur", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.8584, 90.2668},  // Savar
            new double[]{23.8645, 90.0027},  // Manikganj
            new double[]{24.1037, 89.7809},  // Bangabandhu Bridge
            new double[]{24.4507, 89.7003},  // Sirajganj
            new double[]{24.8500, 89.3700},  // Bogura
            new double[]{25.7439, 89.2752}   // Rangpur
        ));
        // Dhaka → Comilla via Kanchpur
        ROUTE_WAYPOINTS.put("dhaka|comilla", Arrays.asList(
            new double[]{23.8103, 90.4125},  // Dhaka
            new double[]{23.7127, 90.4439},  // Jatrabari
            new double[]{23.6900, 90.5100},  // Kanchpur
            new double[]{23.5200, 90.7000},  // Meghna
            new double[]{23.4607, 91.1809}   // Comilla
        ));
    }

    /* ── Location description labels per route at ~10% intervals ── */
    private static final Map<String, List<String>> ROUTE_LABELS = new LinkedHashMap<>();
    static {
        ROUTE_LABELS.put("dhaka|chittagong", Arrays.asList(
            "Dhaka HQ, Motijheel — start",
            "Jatrabari flyover, Dhaka",
            "Kanchpur Bridge, Narayanganj",
            "Meghna Highway, Munshiganj",
            "Comilla City bypass",
            "Comilla-Feni Highway",
            "Feni district",
            "Mirersarai, Chittagong",
            "Sitakunda, Chittagong",
            "Approaching Chittagong City",
            "Chittagong — destination"
        ));
        ROUTE_LABELS.put("dhaka|sylhet", Arrays.asList(
            "Dhaka HQ — start",
            "Kanchpur, Dhaka outskirts",
            "Narsingdi bypass",
            "Bhairab Bridge, Kishoreganj",
            "Brahmanbaria district",
            "Akhaura, Brahmanbaria",
            "Habiganj district",
            "Shaistaganj, Habiganj",
            "Osmaninagar, Sylhet",
            "Approaching Sylhet City",
            "Sylhet — destination"
        ));
        ROUTE_LABELS.put("dhaka|rajshahi", Arrays.asList(
            "Dhaka HQ — start",
            "Savar, Dhaka",
            "Manikganj district",
            "Aricha Ghat, Manikganj",
            "Bangabandhu Bridge, Sirajganj",
            "Sirajganj bypass",
            "Natore district",
            "Bagatipara, Natore",
            "Rajshahi outskirts",
            "Approaching Rajshahi City",
            "Rajshahi — destination"
        ));
        ROUTE_LABELS.put("dhaka|mymensingh", Arrays.asList(
            "Dhaka HQ — start",
            "Tongi, Gazipur",
            "Gazipur Chowrasta",
            "Sreepur, Gazipur",
            "Kapasia, Gazipur",
            "Mymensingh approaching",
            "Mymensingh — destination"
        ));
        ROUTE_LABELS.put("dhaka|khulna", Arrays.asList(
            "Dhaka HQ — start",
            "Savar, Dhaka",
            "Manikganj district",
            "Aricha Ghat Ferry terminal",
            "Rajbari district",
            "Faridpur district",
            "Faridpur-Jessore highway",
            "Jessore city",
            "Jessore-Khulna highway",
            "Approaching Khulna",
            "Khulna — destination"
        ));
        ROUTE_LABELS.put("dhaka|barisal", Arrays.asList(
            "Dhaka HQ — start",
            "Keraniganj, Dhaka outskirts",
            "Munshiganj district",
            "Padma Bridge (Mawa) — crossing",
            "Bhanga, Faridpur",
            "Barisal district approaching",
            "Barisal — destination"
        ));
        ROUTE_LABELS.put("dhaka|rangpur", Arrays.asList(
            "Dhaka HQ — start",
            "Savar, Dhaka",
            "Manikganj district",
            "Bangabandhu Bridge — crossing",
            "Sirajganj bypass",
            "Bogura city",
            "Bogura-Rangpur highway",
            "Rangpur outskirts",
            "Rangpur — destination"
        ));
        ROUTE_LABELS.put("dhaka|comilla", Arrays.asList(
            "Dhaka HQ — start",
            "Jatrabari flyover, Dhaka",
            "Kanchpur Bridge",
            "Meghna Highway",
            "Comilla — destination"
        ));
    }

    /* ════════════════════════════════════════════════════════════
       1.  GET /api/vts/live  — all active trips
    ════════════════════════════════════════════════════════════ */
    @GetMapping("/live")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLive() {
        List<Dispatch> trips = dispatchRepo.findByStatus("in_progress");
        Set<String> regs = trips.stream().map(Dispatch::getVehicleReg).collect(Collectors.toSet());
        Map<String, Vehicle> vehicleMap = new HashMap<>();
        regs.forEach(r -> vehicleRepo.findByRegNo(r).ifPresent(v -> vehicleMap.put(r, v)));

        long nowSeconds = System.currentTimeMillis() / 1000;
        List<Map<String, Object>> result = trips.stream()
            .map(d -> buildLiveEntry(d, vehicleMap, nowSeconds))
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /* ════════════════════════════════════════════════════════════
       2.  GET /api/vts/devices  — GPS-equipped vehicles list
    ════════════════════════════════════════════════════════════ */
    @GetMapping("/devices")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDevices() {
        List<GpsDevice> devices = gpsDeviceRepo.findByStatus("active");
        long nowSeconds = System.currentTimeMillis() / 1000;

        Map<String, Dispatch> activeTrips = dispatchRepo.findByStatus("in_progress")
            .stream().collect(Collectors.toMap(Dispatch::getVehicleReg, d -> d, (a, b) -> a));

        List<Map<String, Object>> result = devices.stream().map(dev -> {
            Vehicle veh  = vehicleRepo.findByRegNo(dev.getVehicleReg()).orElse(null);
            Dispatch trip = activeTrips.get(dev.getVehicleReg());

            double speed = 0;
            String engineStatus = dev.getEngineStatus() != null ? dev.getEngineStatus() : "off";

            if (trip != null) {
                Random rng = new Random(nowSeconds / 10 + trip.getId());
                speed = 50 + rng.nextInt(36);
                engineStatus = "on";
            }

            Map<String, Object> m = new LinkedHashMap<>();
            m.put("vehicleReg",   dev.getVehicleReg());
            m.put("imei",         dev.getImei());
            m.put("msisdn",       dev.getMsisdn());
            m.put("clientMobile", dev.getClientMobile());
            m.put("clientId",     dev.getClientId());
            m.put("deviceModel",  dev.getDeviceModel());
            m.put("engineStatus", engineStatus);
            m.put("speed",        Math.round(speed * 100.0) / 100.0);
            m.put("isActive",     trip != null);
            m.put("vehicleMake",  veh != null ? veh.getMake() + " " + veh.getModel() : "");
            m.put("vehicleType",  veh != null ? veh.getType() : "");
            m.put("label",        dev.getVehicleReg()
                + (veh != null ? "  ·  " + veh.getMake() + " " + veh.getModel() : ""));
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /* ════════════════════════════════════════════════════════════
       3.  GET /api/vts/live/{vehicleReg}  — single vehicle live
    ════════════════════════════════════════════════════════════ */
    @GetMapping("/live/{vehicleReg}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLiveVehicle(
            @PathVariable String vehicleReg) {
        List<Dispatch> trips = dispatchRepo.findByStatus("in_progress");
        long nowSeconds = System.currentTimeMillis() / 1000;

        Optional<Dispatch> tripOpt = trips.stream()
            .filter(d -> vehicleReg.equalsIgnoreCase(d.getVehicleReg()))
            .findFirst();

        if (tripOpt.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.ok(Map.of("vehicleReg", vehicleReg, "status", "parked")));
        }

        Dispatch d = tripOpt.get();
        Map<String, Vehicle> vm = new HashMap<>();
        vehicleRepo.findByRegNo(d.getVehicleReg()).ifPresent(v -> vm.put(v.getRegNo(), v));
        return ResponseEntity.ok(ApiResponse.ok(buildLiveEntry(d, vm, nowSeconds)));
    }

    /* ════════════════════════════════════════════════════════════
       4.  GET /api/vts/history  — simulated GPS track history
           period: today | last4h | last6h | last12h | last24h |
                   specific (date=YYYY-MM-DD) |
                   range (from=YYYY-MM-DD&to=YYYY-MM-DD, max 7 days)
    ════════════════════════════════════════════════════════════ */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHistory(
            @RequestParam String vehicleReg,
            @RequestParam(defaultValue = "today") String period,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        // Best-available dispatch — any status, most recent first
        List<Dispatch> dispatches = dispatchRepo.findByVehicleReg(vehicleReg);
        Dispatch dispatch = dispatches.stream()
            .filter(d -> "in_progress".equals(d.getStatus()) || "completed".equals(d.getStatus()))
            .max(Comparator.comparing(d -> d.getStartTime() != null ? d.getStartTime() : d.getCreatedAt()))
            .orElseGet(() -> dispatches.stream()
                .max(Comparator.comparing(d -> d.getCreatedAt() != null ? d.getCreatedAt() : LocalDateTime.MIN))
                .orElse(null));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rangeStart, rangeEnd;
        switch (period) {
            case "last4h":
                rangeStart = now.minusHours(4);  rangeEnd = now; break;
            case "last6h":
                rangeStart = now.minusHours(6);  rangeEnd = now; break;
            case "last12h":
                rangeStart = now.minusHours(12); rangeEnd = now; break;
            case "last24h":
                rangeStart = now.minusHours(24); rangeEnd = now; break;
            case "specific":
                LocalDate sd = date != null ? LocalDate.parse(date) : LocalDate.now();
                rangeStart = sd.atStartOfDay(); rangeEnd = sd.plusDays(1).atStartOfDay(); break;
            case "range": {
                LocalDateTime rs = from != null ? LocalDate.parse(from).atStartOfDay() : now.minusDays(7);
                LocalDateTime re = to   != null ? LocalDate.parse(to).plusDays(1).atStartOfDay() : now;
                if (ChronoUnit.DAYS.between(rs, re) > 7) re = rs.plusDays(7);
                rangeStart = rs; rangeEnd = re; break;
            }
            default: // today
                rangeStart = LocalDate.now().atStartOfDay(); rangeEnd = now;
        }

        // Ensure rangeEnd is never before rangeStart
        if (rangeEnd.isBefore(rangeStart)) rangeEnd = rangeStart.plusHours(1);

        // Route info: from best dispatch or defaults
        String origin      = dispatch != null && dispatch.getOrigin()      != null ? dispatch.getOrigin()      : "Dhaka HQ";
        String destination = dispatch != null && dispatch.getDestination()  != null ? dispatch.getDestination()  : "Chittagong";
        int distKm         = dispatch != null && dispatch.getDistance()     != null && dispatch.getDistance() > 0
                             ? dispatch.getDistance() : 150;
        String dispatchNo  = dispatch != null ? dispatch.getDispatchNo() : "N/A";

        // Always generate track points for the full requested window
        // (vehicle is simulated as having done its typical route during this period)
        List<Map<String, Object>> points = generateTrackPoints(origin, destination, distKm, rangeStart, rangeEnd);

        long windowMins = ChronoUnit.MINUTES.between(rangeStart, rangeEnd);
        double fraction = Math.min(1.0, windowMins / Math.max(1.0, distKm / 55.0 * 60.0));
        int traveledKm  = (int)(distKm * fraction);

        GpsDevice dev = gpsDeviceRepo.findByVehicleReg(vehicleReg).orElse(null);
        Vehicle   veh = vehicleRepo.findByRegNo(vehicleReg).orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vehicleReg",  vehicleReg);
        result.put("dispatchNo",  dispatchNo);
        result.put("origin",      origin);
        result.put("destination", destination);
        result.put("totalKm",     distKm);
        result.put("traveledKm",  traveledKm);
        result.put("pointCount",  points.size());
        result.put("trackPoints", points);
        result.put("imei",        dev != null ? dev.getImei() : "");
        result.put("msisdn",      dev != null ? dev.getMsisdn() : "");
        result.put("clientId",    dev != null ? dev.getClientId() : "");
        result.put("vehicleMake", veh != null ? veh.getMake() + " " + veh.getModel() : "");
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /* ════════════════════════════════════════════════════════════
       PRIVATE HELPERS
    ════════════════════════════════════════════════════════════ */

    private Map<String, Object> buildLiveEntry(Dispatch d, Map<String, Vehicle> vehicleMap, long nowSeconds) {
        double[] originCoords = resolveCoords(d.getOrigin());
        double[] destCoords   = resolveCoords(d.getDestination());
        List<double[]> waypoints = getRouteWaypoints(d.getOrigin(), d.getDestination());

        long phase    = (Math.abs((long) d.getDispatchNo().hashCode()) * 137L) % CYCLE_SECS;
        double fraction = 0.02 + ((nowSeconds + phase) % CYCLE_SECS) / (double) CYCLE_SECS * 0.95;

        LocalDateTime tNow = LocalDateTime.now();
        double[] pos = interpolateAlongWaypoints(waypoints, fraction, tNow);

        // Speed: always non-zero — city slow at start/end, highway in middle
        double speedBase;
        if (fraction < 0.08)      speedBase = 28 + fraction / 0.08 * 42;
        else if (fraction > 0.92) speedBase = 70 - (fraction - 0.92) / 0.08 * 42;
        else                      speedBase = 65;
        Random rng = new Random(nowSeconds / 30 + d.getId()); // variation changes every 30 s
        speedBase += (rng.nextDouble() - 0.5) * 18;
        int speed = (int) Math.max(20, Math.min(95, speedBase));

        // Trail: last 15 minutes — 30 points at 30-second intervals
        // Points whose fraction exceeds current fraction belong to the previous cycle; skip them
        // to prevent the polyline from jumping across the map.
        List<double[]> trail = new ArrayList<>();
        for (int i = 30; i >= 1; i--) {
            long pastSec   = nowSeconds - (i * 30L);
            double pastFrac = 0.02 + ((pastSec + phase) % CYCLE_SECS) / (double) CYCLE_SECS * 0.95;
            if (pastFrac < fraction) {
                LocalDateTime tPast = LocalDateTime.ofEpochSecond(pastSec, 0, ZoneOffset.UTC);
                double[] tp = interpolateAlongWaypoints(waypoints, pastFrac, tPast);
                trail.add(new double[]{
                    Math.round(tp[0] * 100000.0) / 100000.0,
                    Math.round(tp[1] * 100000.0) / 100000.0
                });
            }
        }
        // Current position at the tip of the trail
        trail.add(new double[]{
            Math.round(pos[0] * 100000.0) / 100000.0,
            Math.round(pos[1] * 100000.0) / 100000.0
        });

        double fuel = Math.round((85.0 - fraction * 65.0) * 10) / 10.0;
        Vehicle   veh = vehicleMap.get(d.getVehicleReg());
        GpsDevice dev = gpsDeviceRepo.findByVehicleReg(d.getVehicleReg()).orElse(null);
        int distKm = d.getDistance() != null && d.getDistance() > 0 ? d.getDistance() : 150;

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("key",          d.getId());
        m.put("dispatchNo",   d.getDispatchNo());
        m.put("vehicle",      d.getVehicleReg());
        m.put("vehicleType",  veh != null ? veh.getType() : "Vehicle");
        m.put("vehicleMake",  veh != null ? veh.getMake() + " " + veh.getModel() : "");
        m.put("driver",       d.getDriverName());
        m.put("origin",       d.getOrigin());
        m.put("destination",  d.getDestination());
        m.put("route",        d.getOrigin() + " → " + d.getDestination());
        m.put("distance",     distKm);
        m.put("elapsedKm",    (int)(distKm * fraction));
        m.put("speed",        (double) speed);
        m.put("lat",          Math.round(pos[0] * 10000.0) / 10000.0);
        m.put("lng",          Math.round(pos[1] * 10000.0) / 10000.0);
        m.put("fuel",         fuel);
        m.put("heading",      calcHeading(originCoords, destCoords));
        m.put("status",       "moving");
        m.put("location",     interpolateLocationName(d.getOrigin(), d.getDestination(), fraction));
        m.put("purpose",      d.getPurpose());
        m.put("approvedBy",   d.getApprovedBy());
        m.put("lastUpdate",   "just now");
        m.put("progress",     (int)(fraction * 100));
        m.put("temp",         rng.nextInt(10) < 1 ? "High" : "Normal");
        m.put("engineStatus", "on");
        m.put("imei",         dev != null ? dev.getImei() : "");
        m.put("msisdn",       dev != null ? dev.getMsisdn() : "");
        m.put("clientId",     dev != null ? dev.getClientId() : "");
        m.put("clientMobile", dev != null ? dev.getClientMobile() : "");
        m.put("deviceModel",  dev != null ? dev.getDeviceModel() : "");
        m.put("trail",        trail);
        return m;
    }

    private List<Map<String, Object>> generateTrackPoints(
            String origin, String destination, int distKm,
            LocalDateTime effStart, LocalDateTime effEnd) {

        List<double[]> waypoints = getRouteWaypoints(origin, destination);
        List<String>   labels    = getRouteLabels(origin, destination);
        long totalSecs = Math.max(1, ChronoUnit.SECONDS.between(effStart, effEnd));

        // How many seconds does this trip take at 55 km/h average?
        long tripDurSecs = Math.max(1, (long)(distKm / 55.0 * 3600));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm:ss a");
        List<Map<String, Object>> points = new ArrayList<>();
        int no = 1;
        LocalDateTime t = effStart;

        while (!t.isAfter(effEnd)) {
            long elapsedSecs = ChronoUnit.SECONDS.between(effStart, t);
            // fraction within the trip: map the window duration proportionally
            double fraction = Math.min(1.0, (double) elapsedSecs / tripDurSecs);

            double[] pos = interpolateAlongWaypoints(waypoints, fraction, t);
            double speed  = simulateSpeed(fraction, t);
            String status = speed > 5 ? "running" : "stopped";
            String locDesc = resolveLabel(labels, fraction);

            Map<String, Object> pt = new LinkedHashMap<>();
            pt.put("no",           no++);
            pt.put("timestamp",    t.format(fmt));
            pt.put("lat",          Math.round(pos[0] * 100000.0) / 100000.0);
            pt.put("lng",          Math.round(pos[1] * 100000.0) / 100000.0);
            pt.put("speed",        Math.round(speed * 10.0) / 10.0);
            pt.put("engineStatus", status);
            pt.put("location",     locDesc);
            points.add(pt);

            t = t.plusSeconds(30);
        }
        return points;
    }

    private double[] interpolateAlongWaypoints(List<double[]> waypoints, double fraction, LocalDateTime t) {
        if (waypoints.size() < 2) return waypoints.get(0).clone();
        int segs   = waypoints.size() - 1;
        double scaled = fraction * segs;
        int seg    = Math.min((int) scaled, segs - 1);
        double segF = scaled - seg;
        double[] from = waypoints.get(seg);
        double[] toWp = waypoints.get(seg + 1);
        Random rng = new Random(t.toEpochSecond(ZoneOffset.UTC));
        return new double[]{
            from[0] + (toWp[0] - from[0]) * segF + (rng.nextDouble() - 0.5) * 0.0015,
            from[1] + (toWp[1] - from[1]) * segF + (rng.nextDouble() - 0.5) * 0.0015
        };
    }

    private double simulateSpeed(double fraction, LocalDateTime t) {
        double base;
        if (fraction < 0.08)      base = 15 + fraction / 0.08 * 55;
        else if (fraction > 0.92) base = 70 - (fraction - 0.92) / 0.08 * 55;
        else                      base = 65;
        Random rng = new Random(t.toEpochSecond(ZoneOffset.UTC));
        base += (rng.nextDouble() - 0.5) * 25;
        // Occasional 1-min stop every ~15 min (traffic/fuel)
        if (t.toEpochSecond(ZoneOffset.UTC) % 900 < 60 && fraction > 0.1 && fraction < 0.9) return 0;
        return Math.max(0, Math.min(110, base));
    }

    /**
     * Looks up the route key.  Returns "~original|key" (tilde prefix) when the
     * requested direction is the reverse of a stored route.
     */
    private String routeKey(String origin, String dest) {
        String o = cleanKey(origin);
        String d = cleanKey(dest);
        // Try direct match
        for (String key : ROUTE_WAYPOINTS.keySet()) {
            String[] p = key.split("\\|");
            if (matches(o, p[0]) && matches(d, p[1])) return key;
        }
        // Try reverse match
        for (String key : ROUTE_WAYPOINTS.keySet()) {
            String[] p = key.split("\\|");
            if (matches(d, p[0]) && matches(o, p[1])) return "~" + key;
        }
        return o + "|" + d;
    }

    private static String cleanKey(String loc) {
        return loc == null ? "" : loc.toLowerCase().replaceAll("[^a-z]", "").replace("hq","").trim();
    }
    private static boolean matches(String q, String key) {
        return q.contains(key) || key.contains(q);
    }

    private List<double[]> getRouteWaypoints(String origin, String dest) {
        String key = routeKey(origin, dest);
        if (key.startsWith("~")) {
            List<double[]> pts = ROUTE_WAYPOINTS.get(key.substring(1));
            if (pts != null) { List<double[]> rev = new ArrayList<>(pts); Collections.reverse(rev); return rev; }
        }
        if (ROUTE_WAYPOINTS.containsKey(key)) return ROUTE_WAYPOINTS.get(key);
        double[] o = resolveCoords(origin), d = resolveCoords(dest);
        return Arrays.asList(o, new double[]{(o[0]+d[0])/2, (o[1]+d[1])/2}, d);
    }

    private List<String> getRouteLabels(String origin, String dest) {
        String key = routeKey(origin, dest);
        if (key.startsWith("~")) {
            List<String> lbs = ROUTE_LABELS.get(key.substring(1));
            if (lbs != null) { List<String> rev = new ArrayList<>(lbs); Collections.reverse(rev); return rev; }
        }
        return ROUTE_LABELS.getOrDefault(key, List.of("En route"));
    }

    private String resolveLabel(List<String> labels, double fraction) {
        if (labels.isEmpty()) return "En route";
        int idx = (int)(fraction * (labels.size() - 1));
        return labels.get(Math.min(idx, labels.size() - 1));
    }

    private double[] resolveCoords(String location) {
        if (location == null) return CITY_COORDS.get("dhaka");
        String key = location.toLowerCase().trim();
        if (CITY_COORDS.containsKey(key)) return CITY_COORDS.get(key);
        for (Map.Entry<String, double[]> e : CITY_COORDS.entrySet())
            if (key.contains(e.getKey())) return e.getValue();
        return CITY_COORDS.get("dhaka");
    }

    private String calcHeading(double[] from, double[] to) {
        double angle = Math.toDegrees(Math.atan2(to[1]-from[1], to[0]-from[0]));
        if (angle < 0) angle += 360;
        return new String[]{"E","NE","N","NW","W","SW","S","SE","E"}[(int)Math.round(angle/45)%8];
    }

    private String interpolateLocationName(String origin, String dest, double fraction) {
        List<String> labels = getRouteLabels(origin, dest);
        if (!labels.isEmpty()) return resolveLabel(labels, fraction);
        if (fraction < 0.15) return "Near " + cleanCity(origin);
        if (fraction > 0.85) return "Approaching " + cleanCity(dest);
        return "En route: " + cleanCity(origin) + " → " + cleanCity(dest);
    }

    private String cleanCity(String loc) {
        return loc == null ? "" : loc.replaceAll("(?i) HQ| Office| Port", "").trim();
    }

    private Map<String, Object> emptyHistory(String vehicleReg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("vehicleReg", vehicleReg); m.put("totalKm", 0);
        m.put("traveledKm", 0); m.put("pointCount", 0); m.put("trackPoints", List.of());
        return m;
    }
}
