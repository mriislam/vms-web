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
    }

    /* ── Multi-segment route waypoints (lat,lng pairs) ──────────── */
    private static final Map<String, List<double[]>> ROUTE_WAYPOINTS = new LinkedHashMap<>();
    static {
        // Dhaka → Chittagong via Comilla & Feni
        ROUTE_WAYPOINTS.put("dhaka|chittagong", Arrays.asList(
            new double[]{23.8103, 90.4125}, // Dhaka
            new double[]{23.7127, 90.4439}, // Jatrabari
            new double[]{23.6900, 90.5100}, // Kanchpur
            new double[]{23.5200, 90.7000}, // Meghna
            new double[]{23.4607, 91.1809}, // Comilla
            new double[]{23.0153, 91.3973}, // Feni
            new double[]{22.5500, 91.7000}, // Mirersarai
            new double[]{22.3569, 91.7832}  // Chittagong
        ));
        // Dhaka → Sylhet via Brahmanbaria
        ROUTE_WAYPOINTS.put("dhaka|sylhet", Arrays.asList(
            new double[]{23.8103, 90.4125}, // Dhaka
            new double[]{23.7416, 90.5932}, // Kanchpur
            new double[]{23.9203, 90.7152}, // Narsingdi
            new double[]{24.0526, 90.9794}, // Bhairab
            new double[]{23.9571, 91.1082}, // Brahmanbaria
            new double[]{24.3745, 91.4138}, // Habiganj
            new double[]{24.8949, 91.8687}  // Sylhet
        ));
        // Dhaka → Rajshahi via Bangabandhu Bridge
        ROUTE_WAYPOINTS.put("dhaka|rajshahi", Arrays.asList(
            new double[]{23.8103, 90.4125}, // Dhaka
            new double[]{23.8584, 90.2668}, // Savar
            new double[]{23.8645, 90.0027}, // Manikganj
            new double[]{24.1037, 89.7809}, // Bangabandhu Bridge
            new double[]{24.4507, 89.7003}, // Sirajganj
            new double[]{24.3745, 88.6042}  // Rajshahi
        ));
        // Dhaka → Mymensingh via Gazipur
        ROUTE_WAYPOINTS.put("dhaka|mymensingh", Arrays.asList(
            new double[]{23.8103, 90.4125}, // Dhaka
            new double[]{23.9000, 90.4000}, // Tongi
            new double[]{23.9999, 90.4203}, // Gazipur
            new double[]{24.1932, 90.4726}, // Sreepur
            new double[]{24.4500, 90.4100}, // Mymensingh outskirts
            new double[]{24.7471, 90.4203}  // Mymensingh
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

        // Build a quick lookup of in_progress dispatches
        Map<String, Dispatch> activeTrips = dispatchRepo.findByStatus("in_progress")
            .stream().collect(Collectors.toMap(Dispatch::getVehicleReg, d -> d, (a, b) -> a));

        List<Map<String, Object>> result = devices.stream().map(dev -> {
            Vehicle veh = vehicleRepo.findByRegNo(dev.getVehicleReg()).orElse(null);
            Dispatch trip = activeTrips.get(dev.getVehicleReg());

            double speed = 0;
            String engineStatus = dev.getEngineStatus() != null ? dev.getEngineStatus() : "off";

            if (trip != null) {
                // compute live speed from cycling simulation
                int distKm = trip.getDistance() != null ? trip.getDistance() : 150;
                long cycleSecs = Math.max(1800L, (long)(distKm / 55.0 * 3600));
                long phase = (Math.abs((long) trip.getDispatchNo().hashCode()) * 137L) % cycleSecs;
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
       4.  GET /api/vts/history  — simulated track history
    ════════════════════════════════════════════════════════════ */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHistory(
            @RequestParam String vehicleReg,
            @RequestParam(defaultValue = "today") String period,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {

        // Find most recent dispatch (in_progress or completed)
        List<Dispatch> dispatches = dispatchRepo.findByVehicleReg(vehicleReg);
        Dispatch dispatch = dispatches.stream()
            .filter(d -> "in_progress".equals(d.getStatus()) || "completed".equals(d.getStatus()))
            .max(Comparator.comparing(d -> d.getStartTime() != null ? d.getStartTime() : d.getCreatedAt()))
            .orElse(null);

        if (dispatch == null) {
            return ResponseEntity.ok(ApiResponse.ok(emptyHistory(vehicleReg)));
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime rangeStart, rangeEnd;
        switch (period) {
            case "last4h":
                rangeStart = now.minusHours(4); rangeEnd = now; break;
            case "specific":
                LocalDate sd = date != null ? LocalDate.parse(date) : LocalDate.now();
                rangeStart = sd.atStartOfDay(); rangeEnd = sd.plusDays(1).atStartOfDay(); break;
            case "range":
                rangeStart = from != null ? LocalDate.parse(from).atStartOfDay() : now.minusDays(7);
                rangeEnd   = to   != null ? LocalDate.parse(to).plusDays(1).atStartOfDay() : now;
                break;
            default: // today
                rangeStart = LocalDate.now().atStartOfDay(); rangeEnd = now;
        }

        LocalDateTime tripStart = dispatch.getStartTime() != null
            ? dispatch.getStartTime() : dispatch.getCreatedAt();
        int distKm = dispatch.getDistance() != null ? dispatch.getDistance() : 150;
        LocalDateTime tripEnd = dispatch.getEndTime() != null
            ? dispatch.getEndTime()
            : tripStart.plusMinutes((long)(distKm / 55.0 * 60));

        // Effective overlap
        LocalDateTime effStart = tripStart.isAfter(rangeStart) ? tripStart : rangeStart;
        LocalDateTime effEnd   = tripEnd.isBefore(rangeEnd)    ? tripEnd   : rangeEnd;

        if (effStart.isAfter(effEnd)) {
            return ResponseEntity.ok(ApiResponse.ok(emptyHistory(vehicleReg)));
        }

        List<Map<String, Object>> points = generateTrackPoints(dispatch, effStart, effEnd, tripStart, tripEnd);

        long tripTotalSecs = Math.max(1, ChronoUnit.SECONDS.between(tripStart, tripEnd));
        long traveledSecs  = ChronoUnit.SECONDS.between(tripStart, effEnd);
        double fraction    = Math.min(1.0, Math.max(0, (double) traveledSecs / tripTotalSecs));

        // GPS device info
        GpsDevice dev = gpsDeviceRepo.findByVehicleReg(vehicleReg).orElse(null);
        Vehicle veh   = vehicleRepo.findByRegNo(vehicleReg).orElse(null);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("vehicleReg",  vehicleReg);
        result.put("dispatchNo",  dispatch.getDispatchNo());
        result.put("origin",      dispatch.getOrigin());
        result.put("destination", dispatch.getDestination());
        result.put("totalKm",     distKm);
        result.put("traveledKm",  (int)(distKm * fraction));
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

        int distKm = d.getDistance() != null && d.getDistance() > 0 ? d.getDistance() : 150;
        long cycleSecs = Math.max(1800L, (long)(distKm / 55.0 * 3600));
        long phase     = (Math.abs((long) d.getDispatchNo().hashCode()) * 137L) % cycleSecs;
        double fraction = 0.02 + ((nowSeconds + phase) % cycleSecs) / (double) cycleSecs * 0.95;

        Random rng = new Random(nowSeconds / 10 + d.getId());
        double jLat = (rng.nextDouble() - 0.5) * 0.003;
        double jLng = (rng.nextDouble() - 0.5) * 0.003;
        double lat  = originCoords[0] + (destCoords[0] - originCoords[0]) * fraction + jLat;
        double lng  = originCoords[1] + (destCoords[1] - originCoords[1]) * fraction + jLng;

        int speed = 50 + rng.nextInt(36);

        // Fuel depletes along journey
        double fuel = Math.round((85.0 - fraction * 65.0) * 10) / 10.0;

        Vehicle veh = vehicleMap.get(d.getVehicleReg());

        // GPS device
        GpsDevice dev = gpsDeviceRepo.findByVehicleReg(d.getVehicleReg()).orElse(null);

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
        m.put("lat",          Math.round(lat * 10000.0) / 10000.0);
        m.put("lng",          Math.round(lng * 10000.0) / 10000.0);
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
        return m;
    }

    private List<Map<String, Object>> generateTrackPoints(
            Dispatch dispatch, LocalDateTime effStart, LocalDateTime effEnd,
            LocalDateTime tripStart, LocalDateTime tripEnd) {

        List<double[]> waypoints = getRouteWaypoints(dispatch.getOrigin(), dispatch.getDestination());
        List<String>   labels    = getRouteLabels(dispatch.getOrigin(), dispatch.getDestination());
        int distKm = dispatch.getDistance() != null ? dispatch.getDistance() : 150;
        long tripTotalSecs = Math.max(1, ChronoUnit.SECONDS.between(tripStart, tripEnd));

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd-MM-yyyy hh:mm:ss a");
        List<Map<String, Object>> points = new ArrayList<>();
        int no = 1;
        LocalDateTime t = effStart;

        while (!t.isAfter(effEnd)) {
            long elapsedSecs = ChronoUnit.SECONDS.between(tripStart, t);
            double fraction  = Math.max(0, Math.min(1.0, (double) elapsedSecs / tripTotalSecs));

            double[] pos = interpolateAlongWaypoints(waypoints, fraction, t);
            double speed  = simulateSpeed(fraction, t);
            String status = speed > 0 ? "running" : "stopped";
            String locDesc = resolveLabel(labels, fraction);

            Map<String, Object> pt = new LinkedHashMap<>();
            pt.put("no",           no++);
            pt.put("timestamp",    t.format(fmt));
            pt.put("lat",          pos[0]);
            pt.put("lng",          pos[1]);
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
        int segs = waypoints.size() - 1;
        double scaled = fraction * segs;
        int seg = Math.min((int) scaled, segs - 1);
        double segF = scaled - seg;
        double[] from = waypoints.get(seg);
        double[] to   = waypoints.get(seg + 1);
        Random rng = new Random(t.toEpochSecond(ZoneOffset.UTC));
        return new double[]{
            from[0] + (to[0] - from[0]) * segF + (rng.nextDouble() - 0.5) * 0.0015,
            from[1] + (to[1] - from[1]) * segF + (rng.nextDouble() - 0.5) * 0.0015
        };
    }

    private double simulateSpeed(double fraction, LocalDateTime t) {
        double base;
        if (fraction < 0.08)       base = 15 + fraction / 0.08 * 55;
        else if (fraction > 0.92)  base = 70 - (fraction - 0.92) / 0.08 * 55;
        else                       base = 65;
        Random rng = new Random(t.toEpochSecond(ZoneOffset.UTC));
        base += (rng.nextDouble() - 0.5) * 25;
        // Occasional stop every ~15 min for ~1 min (traffic/fuel)
        if (t.toEpochSecond(ZoneOffset.UTC) % 900 < 60 && fraction > 0.1 && fraction < 0.9) return 0;
        return Math.max(0, Math.min(110, base));
    }

    private List<double[]> getRouteWaypoints(String origin, String dest) {
        String key = routeKey(origin, dest);
        if (ROUTE_WAYPOINTS.containsKey(key)) return ROUTE_WAYPOINTS.get(key);
        // Fallback: direct line with 3 points
        double[] o = resolveCoords(origin), d = resolveCoords(dest);
        return Arrays.asList(o,
            new double[]{(o[0]+d[0])/2, (o[1]+d[1])/2},
            d);
    }

    private List<String> getRouteLabels(String origin, String dest) {
        return ROUTE_LABELS.getOrDefault(routeKey(origin, dest), List.of("En route"));
    }

    private String routeKey(String origin, String dest) {
        String o = origin.toLowerCase().replaceAll("[^a-z]", "").replace("hq","").trim();
        String d = dest.toLowerCase().replaceAll("[^a-z]", "").replace("hq","").trim();
        // Try direct and reverse
        for (Map.Entry<String, List<double[]>> e : ROUTE_WAYPOINTS.entrySet()) {
            String[] parts = e.getKey().split("\\|");
            if (o.contains(parts[0]) || parts[0].contains(o)) {
                if (d.contains(parts[1]) || parts[1].contains(d)) return e.getKey();
            }
        }
        return o + "|" + d;
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
