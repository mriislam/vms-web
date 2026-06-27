package com.nexdecade.vms.service;

import com.nexdecade.vms.dto.LocationUpdateRequest;
import com.nexdecade.vms.dto.LocationUpdateResponse;
import com.nexdecade.vms.entity.Dispatch;
import com.nexdecade.vms.entity.Driver;
import com.nexdecade.vms.entity.GpsDevice;
import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.repository.DispatchRepository;
import com.nexdecade.vms.repository.GpsDeviceRepository;
import com.nexdecade.vms.repository.RequisitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Processes a real-time GPS location update from the mobile driver app.
 *
 * Flow:
 *  1. Update gps_devices table with the latest position
 *  2. Find all active Requisitions assigned to this driver that have coordinates
 *  3. For each "approved" requisition: check if within pickup geofence → auto-start
 *  4. For each "in_progress" requisition: check if within destination geofence → auto-end
 *  5. Return a rich response so the app can update the UI immediately
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DriverLocationService {

    private final GpsDeviceRepository    gpsRepo;
    private final RequisitionRepository  reqRepo;
    private final DispatchRepository     dispatchRepo;
    private final RequisitionService     reqService;
    private final TripNotificationService notif;

    // ── Public entry point ──────────────────────────────────────────────────

    public LocationUpdateResponse processLocation(Driver driver,
                                                   LocationUpdateRequest req) {
        double lat = req.getLat();
        double lng = req.getLng();

        // 1. Determine which vehicle this driver is associated with
        String vehicleReg = resolveVehicleReg(driver, req.getVehicleReg());

        // 2. Update GPS device record
        if (vehicleReg != null) {
            updateGpsDevice(vehicleReg, lat, lng, req.getSpeed(), req.getHeading());
        }

        // 3. Geofence check against Requisitions (booking requests)
        LocationUpdateResponse geoResult = checkRequisitionGeofences(driver, lat, lng);
        if (geoResult.isGeofenceTriggered()) return geoResult;

        // 4. Geofence check against Dispatches (vehicle_requisition)
        return checkDispatchGeofences(driver, vehicleReg, lat, lng);
    }

    // ── Geofence: Requisitions ──────────────────────────────────────────────

    private LocationUpdateResponse checkRequisitionGeofences(Driver driver, double lat, double lng) {
        if (driver == null) return noEvent("Location recorded");

        List<Requisition> active = reqRepo.findByDriverId(driver.getId().intValue())
            .stream()
            .filter(r -> List.of("approved", "in_progress").contains(r.getStatus()))
            .filter(r -> r.getFromLat() != null)
            .toList();

        for (Requisition r : active) {
            int radius = r.getGeofenceRadiusM() != null ? r.getGeofenceRadiusM() : 500;

            if ("approved".equals(r.getStatus())) {
                double distOrigin = haversineM(lat, lng, r.getFromLat(), r.getFromLng());
                if (distOrigin <= radius) {
                    log.info("GEOFENCE: Driver {} entered pickup zone for {} (dist={}m)", driver.getName(), r.getReqNo(), (int)distOrigin);
                    reqService.setStatus(r.getId(), "in_progress", "geofence-auto");
                    notif.notifyTripStarted(r, "geofence");
                    return LocationUpdateResponse.builder()
                        .geofenceTriggered(true)
                        .geofenceEvent("TRIP_STARTED")
                        .tripId(r.getId())
                        .reqNo(r.getReqNo())
                        .distanceToPickupM(distOrigin)
                        .geofenceRadiusM(radius)
                        .message("Trip started — you entered the pickup zone (" + (int)distOrigin + " m from pickup)")
                        .build();
                }
            }

            if ("in_progress".equals(r.getStatus()) && r.getToLat() != null) {
                double distDest = haversineM(lat, lng, r.getToLat(), r.getToLng());
                double distOrigin = r.getFromLat() != null ? haversineM(lat, lng, r.getFromLat(), r.getFromLng()) : -1;

                if (distDest <= radius) {
                    log.info("GEOFENCE: Driver {} reached destination for {} (dist={}m)", driver.getName(), r.getReqNo(), (int)distDest);
                    reqService.setStatus(r.getId(), "completed", "geofence-auto");
                    notif.notifyTripEnded(r, "geofence");
                    return LocationUpdateResponse.builder()
                        .geofenceTriggered(true)
                        .geofenceEvent("TRIP_COMPLETED")
                        .tripId(r.getId())
                        .reqNo(r.getReqNo())
                        .distanceToDestinationM(distDest)
                        .distanceToPickupM(distOrigin >= 0 ? distOrigin : null)
                        .geofenceRadiusM(radius)
                        .message("Trip completed — you reached the destination!")
                        .build();
                }

                // Approaching destination (within 3× radius)
                if (distDest <= radius * 3) {
                    notif.notifyApproachingDestination(r);
                    return LocationUpdateResponse.builder()
                        .geofenceTriggered(true)
                        .geofenceEvent("APPROACHING_DESTINATION")
                        .tripId(r.getId())
                        .reqNo(r.getReqNo())
                        .distanceToDestinationM(distDest)
                        .geofenceRadiusM(radius)
                        .message("Approaching destination — " + (int)distDest + " m away")
                        .build();
                }
            }
        }
        return noEvent("Location updated");
    }

    // ── Geofence: Dispatches (vehicle_requisition) ──────────────────────────

    private LocationUpdateResponse checkDispatchGeofences(Driver driver, String vehicleReg, double lat, double lng) {
        if (vehicleReg == null && driver == null) return noEvent("Location recorded");

        List<Dispatch> dispatches;
        if (vehicleReg != null) {
            dispatches = dispatchRepo.findByVehicleReg(vehicleReg);
        } else {
            dispatches = dispatchRepo.findByDriverName(driver.getName());
        }

        for (Dispatch d : dispatches) {
            if (!List.of("approved", "in_progress").contains(d.getStatus())) continue;

            // Dispatches store origin/destination as text — geofence via linked requisition
            // If dispatch is linked to a requisition (same date + vehicle), use requisition coords
            // For now, just track status transitions triggered externally
        }

        return noEvent("Location updated");
    }

    // ── GPS device update ───────────────────────────────────────────────────

    private void updateGpsDevice(String vehicleReg, double lat, double lng,
                                  Double speed, Double heading) {
        Optional<GpsDevice> existing = gpsRepo.findByVehicleReg(vehicleReg);
        GpsDevice gps = existing.orElseGet(GpsDevice::new);
        if (gps.getVehicleReg() == null) {
            // New device record — fill required fields with defaults
            gps.setVehicleReg(vehicleReg);
            gps.setImei("DRV-" + vehicleReg);
            gps.setMsisdn("0000000000");
            gps.setClientId("DRV-" + vehicleReg);
        }
        gps.setLastLat(lat);
        gps.setLastLng(lng);
        gps.setLastSeen(LocalDateTime.now());
        if (speed != null)   gps.setLastSpeed(speed);
        if (heading != null) gps.setEngineStatus(speed != null && speed > 0 ? "on" : "off");
        gpsRepo.save(gps);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private String resolveVehicleReg(Driver driver, String providedReg) {
        if (providedReg != null && !providedReg.isBlank()) return providedReg;
        // Find the most recent in_progress dispatch for this driver
        if (driver == null) return null;
        return dispatchRepo.findByDriverName(driver.getName())
            .stream()
            .filter(d -> "in_progress".equals(d.getStatus()))
            .map(Dispatch::getVehicleReg)
            .findFirst()
            .orElse(null);
    }

    private LocationUpdateResponse noEvent(String message) {
        return LocationUpdateResponse.builder()
            .geofenceTriggered(false)
            .message(message)
            .build();
    }

    /** Haversine distance in metres between two lat/lng points */
    static double haversineM(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
