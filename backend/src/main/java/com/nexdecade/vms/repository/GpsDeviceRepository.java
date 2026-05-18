package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.GpsDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GpsDeviceRepository extends JpaRepository<GpsDevice, Long> {

    Optional<GpsDevice> findByVehicleReg(String vehicleReg);

    Optional<GpsDevice> findByImei(String imei);

    Optional<GpsDevice> findByMsisdn(String msisdn);

    Optional<GpsDevice> findByClientId(String clientId);

    Optional<GpsDevice> findByClientMobile(String clientMobile);

    List<GpsDevice> findByStatus(String status);
}
