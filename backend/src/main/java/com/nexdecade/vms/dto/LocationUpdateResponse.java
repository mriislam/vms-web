package com.nexdecade.vms.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class LocationUpdateResponse {

    /** Whether a geofence boundary was crossed in this update */
    private boolean geofenceTriggered;

    /**
     * "TRIP_STARTED"            — driver entered pickup geofence → trip auto-started
     * "TRIP_COMPLETED"          — driver entered destination geofence → trip auto-completed
     * "APPROACHING_DESTINATION" — driver within 3× geofence radius of destination
     * null                      — no geofence event
     */
    private String geofenceEvent;

    /** Requisition ID of the triggered trip (if any) */
    private Long tripId;

    /** Booking reference (REQ-001) of the triggered trip */
    private String reqNo;

    /** Distance in metres from current position to pickup location */
    private Double distanceToPickupM;

    /** Distance in metres from current position to destination */
    private Double distanceToDestinationM;

    /** Pickup geofence radius in metres for the active trip */
    private Integer geofenceRadiusM;

    /** Human-readable status message */
    private String message;
}
