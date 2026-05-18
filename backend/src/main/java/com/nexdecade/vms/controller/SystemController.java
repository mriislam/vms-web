package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.net.InetAddress;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
public class SystemController {

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = new HashMap<>();

        // CPU & OS via com.sun.management.OperatingSystemMXBean
        com.sun.management.OperatingSystemMXBean osMx =
            (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();

        double cpuLoad = osMx.getCpuLoad();
        stats.put("cpu", cpuLoad < 0 ? 0 : (int) Math.round(cpuLoad * 100));
        stats.put("availableProcessors", osMx.getAvailableProcessors());

        // OS name
        String osName = System.getProperty("os.name", "Unknown");
        String osVersion = System.getProperty("os.version", "");
        stats.put("os", osName + " " + osVersion);

        // Physical memory
        long totalRam = osMx.getTotalMemorySize();
        long freeRam  = osMx.getFreeMemorySize();
        long usedRam  = totalRam - freeRam;
        stats.put("ramTotal", totalRam);
        stats.put("ramUsed",  usedRam);
        stats.put("ramPct",   totalRam > 0 ? (int) Math.round((double) usedRam / totalRam * 100) : 0);

        // Disk — pick the root with the most total space (main drive)
        long bestTotal = 0, bestUsed = 0;
        for (File root : File.listRoots()) {
            long t = root.getTotalSpace();
            if (t > bestTotal) {
                bestTotal = t;
                bestUsed  = t - root.getUsableSpace();
            }
        }
        stats.put("diskTotal", bestTotal);
        stats.put("diskUsed",  bestUsed);
        stats.put("diskPct",   bestTotal > 0 ? (int) Math.round((double) bestUsed / bestTotal * 100) : 0);

        // Uptime
        RuntimeMXBean rtMx = ManagementFactory.getRuntimeMXBean();
        long ms    = rtMx.getUptime();
        long days  = ms / 86_400_000L;
        long hours = (ms % 86_400_000L) / 3_600_000L;
        long mins  = (ms % 3_600_000L)  / 60_000L;
        stats.put("uptime", String.format("%dd %02dh %02dm", days, hours, mins));

        // Runtime (Java)
        stats.put("runtime", "Java " + System.getProperty("java.version", "17"));

        // Local IP
        try {
            stats.put("ip", InetAddress.getLocalHost().getHostAddress());
        } catch (Exception e) {
            stats.put("ip", "N/A");
        }

        // Environment
        String profile = System.getProperty("spring.profiles.active", "development");
        stats.put("environment", profile.substring(0, 1).toUpperCase() + profile.substring(1));

        // App info
        stats.put("version", "v1.0.0");
        stats.put("build",   "2026.04.18");

        return ResponseEntity.ok(ApiResponse.ok(stats));
    }
}
