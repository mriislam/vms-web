package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Requisition;
import com.nexdecade.vms.repository.GpsDeviceRepository;
import com.nexdecade.vms.repository.RequisitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Every 5 minutes:
 *  1. Pre-start reminder: approved trips whose fromDatetime is 30 min away
 *  2. Auto-start: approved trips whose fromDatetime passed >15 min ago (no VTS trigger)
 *  3. Geo-fence check: compare latest VTS position against origin/destination fence
 *  4. Approaching-destination alert: in_progress trips nearing their destination
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TripGeoFenceScheduler {

    private final RequisitionRepository reqRepo;
    private final GpsDeviceRepository   gpsRepo;
    private final RequisitionService    reqService;
    private final TripNotificationService notif;

    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    public void runChecks() {
        LocalDateTime now = LocalDateTime.now();
        checkPreStartReminders(now);
        checkAutoStart(now);
        checkGeoFences(now);
    }

    // ── 30-min reminder ──────────────────────────────────────────────

    private void checkPreStartReminders(LocalDateTime now) {
        List<Requisition> approved = reqRepo.findByStatusAndFromDatetimeIsNotNull("approved");
        for (Requisition r : approved) {
            LocalDateTime remind = r.getFromDatetime().minusMinutes(30);
            // within a 5-min window around the reminder time
            if (!remind.isBefore(now.minusMinutes(5)) && remind.isBefore(now.plusMinutes(5))) {
                log.info("Pre-start reminder for {}", r.getReqNo());
                notif.notifyStartReminder(r);
            }
        }
    }

    // ── Auto-start if departure time passed and no VTS trigger ───────

    private void checkAutoStart(LocalDateTime now) {
        List<Requisition> approved = reqRepo.findByStatusAndFromDatetimeIsNotNull("approved");
        for (Requisition r : approved) {
            if (r.getFromDatetime().plusMinutes(15).isBefore(now)) {
                log.info("Auto-starting trip {} (overdue by >15 min)", r.getReqNo());
                reqService.setStatus(r.getId(), "in_progress", "system-auto");
                notif.notifyAutoStarted(r);
            }
        }
    }

    // ── VTS geo-fence check ──────────────────────────────────────────

    private void checkGeoFences(LocalDateTime now) {
        // Only process trips that have coordinates stored
        List<Requisition> active = reqRepo.findByStatusIn(List.of("approved", "in_progress"))
            .stream()
            .filter(r -> r.getVehicleReg() != null && r.getFromLat() != null)
            .toList();

        for (Requisition r : active) {
            gpsRepo.findByVehicleReg(r.getVehicleReg()).ifPresent(gps -> {
                if (gps.getLastLat() == null || gps.getLastLng() == null) return;
                int radius = r.getGeofenceRadiusM() != null ? r.getGeofenceRadiusM() : 500;

                if ("approved".equals(r.getStatus()) && r.getFromLat() != null) {
                    double distToOrigin = haversineMeters(
                        gps.getLastLat(), gps.getLastLng(),
                        r.getFromLat(), r.getFromLng());
                    if (distToOrigin <= radius) {
                        log.info("VTS geo-fence: {} entered origin fence — starting trip {}", r.getVehicleReg(), r.getReqNo());
                        reqService.setStatus(r.getId(), "in_progress", "vts-geofence");
                        notif.notifyTripStarted(r, "VTS geo-fence");
                    }
                }

                if ("in_progress".equals(r.getStatus()) && r.getToLat() != null) {
                    double distToDest = haversineMeters(
                        gps.getLastLat(), gps.getLastLng(),
                        r.getToLat(), r.getToLng());
                    if (distToDest <= radius) {
                        log.info("VTS geo-fence: {} entered destination fence — completing trip {}", r.getVehicleReg(), r.getReqNo());
                        reqService.setStatus(r.getId(), "completed", "vts-geofence");
                        notif.notifyTripEnded(r, "VTS geo-fence");
                    } else if (distToDest <= radius * 3) {
                        notif.notifyApproachingDestination(r);
                    }
                }
            });
        }
    }

    // ── Haversine distance (metres) ──────────────────────────────────

    static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
