package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.dto.LocationUpdateRequest;
import com.nexdecade.vms.dto.LocationUpdateResponse;
import com.nexdecade.vms.entity.Dispatch;
import com.nexdecade.vms.entity.Driver;
import com.nexdecade.vms.entity.GpsDevice;
import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.entity.User;
import com.nexdecade.vms.repository.DispatchRepository;
import com.nexdecade.vms.repository.DriverRepository;
import com.nexdecade.vms.repository.GpsDeviceRepository;
import com.nexdecade.vms.repository.RequisitionRepository;
import com.nexdecade.vms.repository.UserRepository;
import com.nexdecade.vms.service.DispatchService;
import com.nexdecade.vms.service.DriverLocationService;
import com.nexdecade.vms.service.RequisitionService;
import com.nexdecade.vms.service.TripNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Driver Mobile App API
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Base URL : /api/driver
 *  Auth     : Bearer JWT  (same token as web — POST /api/auth/login)
 *
 *  Endpoints:
 *
 *  Profile & Auth
 *    GET  /api/driver/me                    Driver profile + linked trips summary
 *    POST /api/driver/fcm-token             Register FCM push notification token
 *
 *  Real-time Location (KEY — call every 10–30 s while driving)
 *    POST /api/driver/location              Update GPS → triggers immediate geofence check
 *    GET  /api/driver/location              Last known location for this driver
 *
 *  Trips  (Requisition-based — assigned via Single Booking)
 *    GET  /api/driver/trips                 All trips assigned to this driver
 *    GET  /api/driver/trips/today           Today's trips
 *    GET  /api/driver/trips/{id}            Single trip details + geofence parameters
 *    POST /api/driver/trips/{id}/start      Manual start
 *    POST /api/driver/trips/{id}/end        Manual end
 *    GET  /api/driver/trips/{id}/geofence   Geofence circles (pickup + destination)
 *
 *  Dispatches  (Dispatch-based — created after approval in Manage Trip)
 *    GET  /api/driver/dispatches            All dispatches assigned to this driver
 *    GET  /api/driver/dispatches/today      Today's dispatches
 *    GET  /api/driver/dispatches/{id}       Single dispatch details
 *    POST /api/driver/dispatches/{id}/start Manual start dispatch
 *    POST /api/driver/dispatches/{id}/end   Manual end dispatch (optionally fuel & distance)
 * ═══════════════════════════════════════════════════════════════════════════
 */
@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class DriverTripController {

    private final UserRepository        userRepo;
    private final DriverRepository      driverRepo;
    private final RequisitionRepository reqRepo;
    private final DispatchRepository    dispatchRepo;
    private final GpsDeviceRepository   gpsRepo;
    private final RequisitionService    reqService;
    private final DispatchService       dispatchService;
    private final DriverLocationService locationService;
    private final TripNotificationService notif;

    // ═══════════════════════════════════════════════════════════════════════
    //  PROFILE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/driver/me
     * Returns the logged-in driver's profile + trip statistics.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me() {
        User    user   = currentUser();
        Driver  driver = resolveDriver(user);
        String  name   = user != null ? user.getFullName() : currentUsername();

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("username",   user != null ? user.getUsername() : currentUsername());
        profile.put("fullName",   name);
        profile.put("role",       user != null ? user.getRole() : "driver");
        profile.put("email",      user != null ? user.getEmail() : null);
        profile.put("phone",      user != null ? user.getPhone() : null);
        profile.put("department", user != null ? user.getDepartment() : null);

        if (driver != null) {
            profile.put("driverId",    driver.getId());
            profile.put("licenseNo",   driver.getLicenseNo());
            profile.put("bloodGroup",  driver.getBloodGroup());
            profile.put("experience",  driver.getExperience());
            profile.put("totalTrips",  driver.getTotalTrips());
            profile.put("lastTrip",    driver.getLastTrip());

            // Active trip summary
            List<Requisition> myTrips = reqRepo.findByDriverId(driver.getId().intValue());
            long pending    = myTrips.stream().filter(r -> "pending".equals(r.getStatus())).count();
            long approved   = myTrips.stream().filter(r -> "approved".equals(r.getStatus())).count();
            long inProgress = myTrips.stream().filter(r -> "in_progress".equals(r.getStatus())).count();
            long completed  = myTrips.stream().filter(r -> "completed".equals(r.getStatus())).count();

            profile.put("tripStats", Map.of(
                "pending",    pending,
                "approved",   approved,
                "inProgress", inProgress,
                "completed",  completed,
                "total",      myTrips.size()
            ));
        }

        return ResponseEntity.ok(ApiResponse.ok(profile));
    }

    /**
     * POST /api/driver/fcm-token
     * Register or update the Firebase Cloud Messaging device token.
     * Call once at app startup / whenever the token refreshes.
     *
     * Body: { "token": "fcm_device_token_here" }
     */
    @PostMapping("/fcm-token")
    public ResponseEntity<ApiResponse<Void>> registerFcmToken(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        if (token == null || token.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("token is required"));
        userRepo.findByUsername(currentUsername()).ifPresent(u -> {
            u.setFcmToken(token);
            userRepo.save(u);
        });
        return ResponseEntity.ok(ApiResponse.ok("FCM token registered", null));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  REAL-TIME LOCATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * POST /api/driver/location
     *
     * Call this endpoint every 10–30 seconds while the driver is on a trip.
     * The server immediately checks geofences and returns an event if triggered.
     *
     * Request body:
     * {
     *   "lat":       23.8103,     // required
     *   "lng":       90.4125,     // required
     *   "speed":     45.5,        // km/h  (optional)
     *   "heading":   180.0,       // degrees 0-360 (optional)
     *   "accuracy":  10.5,        // GPS accuracy in metres (optional)
     *   "vehicleReg": "DHK-1234"  // optional — auto-resolved from active dispatch
     * }
     *
     * Response data: LocationUpdateResponse
     *   geofenceTriggered   : boolean — true when a geofence boundary was crossed
     *   geofenceEvent       : "TRIP_STARTED" | "TRIP_COMPLETED" | "APPROACHING_DESTINATION" | null
     *   tripId              : long — requisition ID of triggered trip
     *   reqNo               : "REQ-001"
     *   distanceToPickupM   : double — metres to pickup point
     *   distanceToDestinationM : double — metres to destination
     *   geofenceRadiusM     : int — configured trigger radius
     *   message             : human-readable event description
     */
    @PostMapping("/location")
    public ResponseEntity<ApiResponse<LocationUpdateResponse>> updateLocation(
            @RequestBody LocationUpdateRequest req) {

        if (req.getLat() == null || req.getLng() == null)
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("lat and lng are required"));

        Driver driver = resolveDriver(currentUser());
        LocationUpdateResponse result = locationService.processLocation(driver, req);
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    /**
     * GET /api/driver/location
     * Returns the last recorded GPS position for this driver's vehicle.
     */
    @GetMapping("/location")
    public ResponseEntity<ApiResponse<Map<String, Object>>> lastLocation() {
        Driver driver = resolveDriver(currentUser());
        if (driver == null) return ResponseEntity.ok(ApiResponse.ok(null));

        // Find vehicle from latest in_progress dispatch
        Optional<String> vehicleReg = dispatchRepo.findByDriverName(driver.getName())
            .stream()
            .filter(d -> "in_progress".equals(d.getStatus()))
            .map(Dispatch::getVehicleReg)
            .findFirst();

        if (vehicleReg.isEmpty())
            return ResponseEntity.ok(ApiResponse.ok(Map.of("message", "No active trip")));

        return gpsRepo.findByVehicleReg(vehicleReg.get())
            .map(gps -> {
                Map<String, Object> loc = new LinkedHashMap<>();
                loc.put("vehicleReg", gps.getVehicleReg());
                loc.put("lat",        gps.getLastLat());
                loc.put("lng",        gps.getLastLng());
                loc.put("speed",      gps.getLastSpeed());
                loc.put("lastSeen",   gps.getLastSeen());
                loc.put("engineStatus", gps.getEngineStatus());
                return ResponseEntity.ok(ApiResponse.ok(loc));
            })
            .orElse(ResponseEntity.ok(ApiResponse.ok(Map.of("message", "No GPS data yet"))));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  TRIPS  (Requisition-based)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/driver/trips
     * All requisitions assigned to this driver (all statuses).
     * Sort: most recent first.
     *
     * Query params (optional):
     *   status  — filter by status: pending | approved | in_progress | completed
     */
    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<List<Requisition>>> myTrips(
            @RequestParam(required = false) String status) {
        Driver driver = resolveDriver(currentUser());
        if (driver == null) return ResponseEntity.ok(ApiResponse.ok(List.of()));

        List<Requisition> trips = reqRepo.findByDriverId(driver.getId().intValue());
        if (status != null && !status.isBlank()) {
            trips = trips.stream().filter(r -> status.equals(r.getStatus())).toList();
        }
        // Most recent first
        trips = trips.stream()
            .sorted((a, b) -> Long.compare(
                b.getId() != null ? b.getId() : 0,
                a.getId() != null ? a.getId() : 0))
            .toList();

        return ResponseEntity.ok(ApiResponse.ok(trips));
    }

    /**
     * GET /api/driver/trips/today
     * Only today's requisitions for this driver.
     */
    @GetMapping("/trips/today")
    public ResponseEntity<ApiResponse<List<Requisition>>> todayTrips() {
        Driver driver = resolveDriver(currentUser());
        if (driver == null) return ResponseEntity.ok(ApiResponse.ok(List.of()));

        LocalDate today = LocalDate.now();
        List<Requisition> trips = reqRepo.findByDriverId(driver.getId().intValue())
            .stream()
            .filter(r -> today.equals(r.getDate())
                || (r.getFromDatetime() != null && today.equals(r.getFromDatetime().toLocalDate())))
            .sorted((a, b) -> {
                LocalDateTime ta = a.getFromDatetime() != null ? a.getFromDatetime() : a.getDate() != null ? a.getDate().atStartOfDay() : LocalDateTime.MIN;
                LocalDateTime tb = b.getFromDatetime() != null ? b.getFromDatetime() : b.getDate() != null ? b.getDate().atStartOfDay() : LocalDateTime.MIN;
                return ta.compareTo(tb);
            })
            .toList();

        return ResponseEntity.ok(ApiResponse.ok(trips));
    }

    /**
     * GET /api/driver/trips/{id}
     * Full details of a single requisition including geofence parameters.
     */
    @GetMapping("/trips/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> tripDetail(@PathVariable Long id) {
        Requisition r = reqService.findById(id);
        ensureDriverOwnsRequisition(r);

        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("trip", r);
        // Geofence parameters for map display
        detail.put("geofence", Map.of(
            "pickupLat",    r.getFromLat() != null ? r.getFromLat() : 0,
            "pickupLng",    r.getFromLng() != null ? r.getFromLng() : 0,
            "destLat",      r.getToLat()   != null ? r.getToLat()   : 0,
            "destLng",      r.getToLng()   != null ? r.getToLng()   : 0,
            "radiusM",      r.getGeofenceRadiusM() != null ? r.getGeofenceRadiusM() : 500,
            "hasCoordinates", r.getFromLat() != null && r.getToLat() != null
        ));

        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    /**
     * POST /api/driver/trips/{id}/start
     * Manually start a trip (driver presses "Start Trip" button in app).
     * Sets status → in_progress, records startTime.
     */
    @PostMapping("/trips/{id}/start")
    public ResponseEntity<ApiResponse<Requisition>> startTrip(@PathVariable Long id) {
        Requisition r = reqService.findById(id);
        ensureDriverOwnsRequisition(r);
        if (!"approved".equals(r.getStatus()) && !"pending".equals(r.getStatus()))
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Trip cannot be started (current status: " + r.getStatus() + ")"));

        Requisition updated = reqService.setStatus(id, "in_progress", currentUsername());
        notif.notifyTripStarted(updated, "driver-manual");
        return ResponseEntity.ok(ApiResponse.ok("Trip started", updated));
    }

    /**
     * POST /api/driver/trips/{id}/end
     * Manually end a trip (driver presses "End Trip" button in app).
     * Sets status → completed.
     *
     * Optional body: { "remarks": "additional notes" }
     */
    @PostMapping("/trips/{id}/end")
    public ResponseEntity<ApiResponse<Requisition>> endTrip(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        Requisition r = reqService.findById(id);
        ensureDriverOwnsRequisition(r);
        if (!"in_progress".equals(r.getStatus()))
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Trip cannot be ended (current status: " + r.getStatus() + ")"));

        if (body != null && body.containsKey("remarks")) {
            String existing = r.getRemarks() != null ? r.getRemarks() + "\n" : "";
            r.setRemarks(existing + "Driver note: " + body.get("remarks"));
        }

        Requisition updated = reqService.setStatus(id, "completed", currentUsername());
        notif.notifyTripEnded(updated, "driver-manual");
        return ResponseEntity.ok(ApiResponse.ok("Trip completed", updated));
    }

    /**
     * GET /api/driver/trips/{id}/geofence
     * Returns the geofence circles for the pickup and destination points.
     * Use this to draw the geofence rings on the map in the mobile app.
     *
     * Response:
     * {
     *   "pickup": { "lat": 23.81, "lng": 90.41, "radiusM": 500, "address": "..." },
     *   "destination": { "lat": 23.85, "lng": 90.40, "radiusM": 500, "address": "..." },
     *   "autoTriggerEnabled": true,
     *   "scheduledDeparture": "2026-06-27T09:00:00"
     * }
     */
    @GetMapping("/trips/{id}/geofence")
    public ResponseEntity<ApiResponse<Map<String, Object>>> tripGeofence(@PathVariable Long id) {
        Requisition r = reqService.findById(id);
        ensureDriverOwnsRequisition(r);

        int radius = r.getGeofenceRadiusM() != null ? r.getGeofenceRadiusM() : 500;
        boolean hasCoords = r.getFromLat() != null && r.getToLat() != null;

        Map<String, Object> gf = new LinkedHashMap<>();
        gf.put("tripId",    r.getId());
        gf.put("reqNo",     r.getReqNo());
        gf.put("status",    r.getStatus());
        gf.put("autoTriggerEnabled", hasCoords);
        gf.put("scheduledDeparture", r.getFromDatetime());
        gf.put("scheduledReturn",    r.getToDatetime());

        if (hasCoords) {
            gf.put("pickup", Map.of(
                "lat",     r.getFromLat(),
                "lng",     r.getFromLng(),
                "radiusM", radius,
                "address", r.getFromLocation() != null ? r.getFromLocation() : ""
            ));
            gf.put("destination", Map.of(
                "lat",     r.getToLat(),
                "lng",     r.getToLng(),
                "radiusM", radius,
                "address", r.getToLocation() != null ? r.getToLocation() : ""
            ));
        } else {
            gf.put("pickup",      null);
            gf.put("destination", null);
            gf.put("message",     "No GPS coordinates — auto-geofence is disabled. Use manual start/end.");
        }

        return ResponseEntity.ok(ApiResponse.ok(gf));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  DISPATCHES  (vehicle_requisition based)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * GET /api/driver/dispatches
     * All vehicle_requisition dispatches assigned to this driver.
     *
     * Query params (optional):
     *   status — filter: pending | approved | in_progress | completed
     */
    @GetMapping("/dispatches")
    public ResponseEntity<ApiResponse<List<Dispatch>>> myDispatches(
            @RequestParam(required = false) String status) {
        String driverName = resolveDriverName();
        List<Dispatch> dispatches = dispatchRepo.findByDriverName(driverName);
        if (status != null && !status.isBlank()) {
            dispatches = dispatches.stream()
                .filter(d -> status.equals(d.getStatus())).toList();
        }
        dispatches = dispatches.stream()
            .sorted((a, b) -> Long.compare(
                b.getId() != null ? b.getId() : 0,
                a.getId() != null ? a.getId() : 0))
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(dispatches));
    }

    /**
     * GET /api/driver/dispatches/today
     * Only today's dispatches for this driver.
     */
    @GetMapping("/dispatches/today")
    public ResponseEntity<ApiResponse<List<Dispatch>>> todayDispatches() {
        String     driverName = resolveDriverName();
        LocalDate  today      = LocalDate.now();
        List<Dispatch> dispatches = dispatchRepo.findByDriverName(driverName)
            .stream()
            .filter(d -> today.equals(d.getDate()))
            .sorted((a, b) -> {
                LocalDateTime ta = a.getStartTime() != null ? a.getStartTime() : a.getDate().atStartOfDay();
                LocalDateTime tb = b.getStartTime() != null ? b.getStartTime() : b.getDate().atStartOfDay();
                return ta.compareTo(tb);
            })
            .toList();
        return ResponseEntity.ok(ApiResponse.ok(dispatches));
    }

    /**
     * GET /api/driver/dispatches/{id}
     * Single dispatch details.
     */
    @GetMapping("/dispatches/{id}")
    public ResponseEntity<ApiResponse<Dispatch>> dispatchDetail(@PathVariable Long id) {
        Dispatch d = dispatchService.findById(id);
        ensureDriverOwnsDispatch(d);
        return ResponseEntity.ok(ApiResponse.ok(d));
    }

    /**
     * POST /api/driver/dispatches/{id}/start
     * Manually start a dispatch. Sets status → in_progress, records startTime.
     */
    @PostMapping("/dispatches/{id}/start")
    public ResponseEntity<ApiResponse<Dispatch>> startDispatch(@PathVariable Long id) {
        Dispatch d = dispatchService.findById(id);
        ensureDriverOwnsDispatch(d);
        if (!"approved".equals(d.getStatus()) && !"pending".equals(d.getStatus()))
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Dispatch cannot be started (status: " + d.getStatus() + ")"));

        d.setStatus("in_progress");
        d.setStartTime(LocalDateTime.now());
        Dispatch updated = dispatchService.update(id, d);
        return ResponseEntity.ok(ApiResponse.ok("Dispatch started", updated));
    }

    /**
     * POST /api/driver/dispatches/{id}/end
     * Manually end a dispatch. Sets status → completed, records endTime.
     *
     * Optional body:
     * {
     *   "fuelUsed":  22.5,    // litres
     *   "distance":  175,     // km
     *   "remarks":   "..."
     * }
     */
    @PostMapping("/dispatches/{id}/end")
    public ResponseEntity<ApiResponse<Dispatch>> endDispatch(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Dispatch d = dispatchService.findById(id);
        ensureDriverOwnsDispatch(d);
        if (!"in_progress".equals(d.getStatus()))
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Dispatch cannot be ended (status: " + d.getStatus() + ")"));

        d.setStatus("completed");
        d.setEndTime(LocalDateTime.now());

        if (body != null) {
            if (body.containsKey("fuelUsed") && body.get("fuelUsed") != null)
                d.setFuelUsed(new java.math.BigDecimal(body.get("fuelUsed").toString()));
            if (body.containsKey("distance") && body.get("distance") != null)
                d.setDistance(Integer.parseInt(body.get("distance").toString()));
            if (body.containsKey("remarks") && body.get("remarks") != null) {
                String existing = d.getPurpose() != null ? d.getPurpose() + "\n" : "";
                d.setPurpose(existing + "Driver note: " + body.get("remarks"));
            }
        }

        Dispatch updated = dispatchService.update(id, d);
        return ResponseEntity.ok(ApiResponse.ok("Dispatch completed", updated));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════════

    private Driver resolveDriver(User user) {
        if (user == null) return null;
        Long userId = user.getId();
        // First try linking via user_id
        Driver byUserId = driverRepo.findAll().stream()
            .filter(d -> userId.equals(d.getUserId()))
            .findFirst().orElse(null);
        if (byUserId != null) return byUserId;
        // Fallback: match by full name
        String fullName = user.getFullName();
        return driverRepo.findAll().stream()
            .filter(d -> fullName != null && fullName.equalsIgnoreCase(d.getName()))
            .findFirst().orElse(null);
    }

    private String resolveDriverName() {
        User user = currentUser();
        if (user == null) return currentUsername();
        Driver driver = resolveDriver(user);
        return driver != null ? driver.getName() : user.getFullName();
    }

    private void ensureDriverOwnsRequisition(Requisition r) {
        Driver driver = resolveDriver(currentUser());
        if (driver == null) return; // admin can access all
        if (r.getDriverId() != null && !driver.getId().intValue().equals(r.getDriverId()))
            throw new IllegalStateException("Not authorized to access this trip");
    }

    private void ensureDriverOwnsDispatch(Dispatch d) {
        String myName = resolveDriverName();
        if (myName != null && !myName.equalsIgnoreCase(d.getDriverName()))
            throw new IllegalStateException("Not authorized to access this dispatch");
    }

    private User currentUser() {
        return userRepo.findByUsername(currentUsername()).orElse(null);
    }

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
