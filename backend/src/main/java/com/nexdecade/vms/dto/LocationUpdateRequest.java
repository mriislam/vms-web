package com.nexdecade.vms.dto;

import lombok.Data;

@Data
public class LocationUpdateRequest {
    /** Latitude of the driver's current position */
    private Double lat;
    /** Longitude of the driver's current position */
    private Double lng;
    /** Speed in km/h (optional) */
    private Double speed;
    /** Compass heading in degrees 0–360 (optional) */
    private Double heading;
    /** GPS accuracy in metres (optional) */
    private Double accuracy;
    /** Vehicle registration — driver can supply this for multi-vehicle scenarios */
    private String vehicleReg;
}
