package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Maintenance;
import com.nexdecade.vms.entity.MaintenancePart;
import com.nexdecade.vms.entity.ServiceCenter;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.MaintenancePartRepository;
import com.nexdecade.vms.repository.MaintenanceRepository;
import com.nexdecade.vms.repository.ServiceCenterRepository;
import com.nexdecade.vms.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/service-centers")
@RequiredArgsConstructor
public class ServiceCenterController {

    private final ServiceCenterRepository scRepo;
    private final MaintenanceRepository   maintRepo;
    private final MaintenancePartRepository partsRepo;
    private final AuditLogService         audit;

    // ═══════════════════════════════════════════════════════════════════════
    //  Service Center CRUD
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping
    public ResponseEntity<ApiResponse<List<ServiceCenter>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok(scRepo.findAllByOrderByNameAsc()));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ServiceCenter>>> getActive() {
        return ResponseEntity.ok(ApiResponse.ok(scRepo.findByStatus("active")));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceCenter>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
            scRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Service center not found"))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceCenter>> create(@RequestBody ServiceCenter body, HttpServletRequest req) {
        ServiceCenter saved = scRepo.save(body);
        audit.log(user(), null, "ServiceCenter", "Create", "Created " + saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Service center created", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceCenter>> update(@PathVariable Long id,
            @RequestBody ServiceCenter body, HttpServletRequest req) {
        ServiceCenter sc = scRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found"));
        sc.setName(body.getName()); sc.setContactPerson(body.getContactPerson());
        sc.setPhone(body.getPhone()); sc.setEmail(body.getEmail());
        sc.setAddress(body.getAddress()); sc.setSpecialization(body.getSpecialization());
        sc.setTaxId(body.getTaxId()); sc.setStatus(body.getStatus());
        ServiceCenter saved = scRepo.save(sc);
        audit.log(user(), null, "ServiceCenter", "Update", "Updated " + saved.getName(), req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Updated", saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        scRepo.deleteById(id);
        audit.log(user(), null, "ServiceCenter", "Delete", "Deleted SC id=" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Deleted", null));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Maintenance Parts API
    // ═══════════════════════════════════════════════════════════════════════

    /** GET /api/service-centers/maintenance/{id}/parts — parts for a maintenance job */
    @GetMapping("/maintenance/{maintId}/parts")
    public ResponseEntity<ApiResponse<List<MaintenancePart>>> getParts(@PathVariable Long maintId) {
        return ResponseEntity.ok(ApiResponse.ok(partsRepo.findByMaintenanceIdOrderByCreatedAtAsc(maintId)));
    }

    /** POST /api/service-centers/maintenance/{id}/parts — save parts list (replaces existing) */
    @PostMapping("/maintenance/{maintId}/parts")
    @Transactional
    public ResponseEntity<ApiResponse<List<MaintenancePart>>> saveParts(
            @PathVariable Long maintId, @RequestBody List<MaintenancePart> parts) {
        partsRepo.deleteByMaintenanceId(maintId);
        List<MaintenancePart> saved = new ArrayList<>();
        for (MaintenancePart p : parts) {
            p.setMaintenanceId(maintId);
            if (p.getUnitCost() != null && p.getQuantity() != null) {
                p.setTotalCost(p.getUnitCost().multiply(p.getQuantity()).setScale(2, RoundingMode.HALF_UP));
            }
            saved.add(partsRepo.save(p));
        }
        // Compute total after saving
        BigDecimal grandTotal = saved.stream()
            .filter(p -> p.getTotalCost() != null)
            .map(MaintenancePart::getTotalCost)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        // Update estimated cost on maintenance record
        maintRepo.findById(maintId).ifPresent(m -> {
            m.setEstimatedCost(grandTotal); maintRepo.save(m);
        });
        return ResponseEntity.ok(ApiResponse.ok("Parts saved", saved));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Maintenance Workflow
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * PATCH /api/service-centers/maintenance/{id}/workflow
     * Advance or update the workflow state.
     *
     * Body: { action, serviceCenterId, invoiceNo, invoiceDate, estimatedCost, approvedCost, notes }
     * Actions: submit | estimate | approve | reject | start | complete
     */
    @PatchMapping("/maintenance/{maintId}/workflow")
    public ResponseEntity<ApiResponse<Maintenance>> workflow(
            @PathVariable Long maintId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest req) {

        Maintenance m = maintRepo.findById(maintId)
            .orElseThrow(() -> new ResourceNotFoundException("Maintenance not found: " + maintId));

        String action = (String) body.getOrDefault("action", "");
        String u      = user();

        switch (action) {
            case "submit" -> {
                m.setWorkflowStatus("pending_estimate");
                m.setSubmittedBy(u); m.setSubmittedAt(LocalDateTime.now());
                if (body.get("serviceCenterId") != null)
                    m.setServiceCenterId(Long.parseLong(body.get("serviceCenterId").toString()));
                if (body.get("requesterNotes") != null)
                    m.setRequesterNotes(body.get("requesterNotes").toString());
            }
            case "estimate" -> {
                m.setWorkflowStatus("pending_approval");
                if (body.get("estimatedCost") != null)
                    m.setEstimatedCost(new BigDecimal(body.get("estimatedCost").toString()));
                if (body.get("invoiceNo") != null)    m.setInvoiceNo(body.get("invoiceNo").toString());
                if (body.get("invoiceDate") != null)  m.setInvoiceDate(LocalDate.parse(body.get("invoiceDate").toString()));
            }
            case "approve" -> {
                m.setWorkflowStatus("approved"); m.setStatus("in_progress");
                if (body.get("approvedCost") != null)
                    m.setApprovedCost(new BigDecimal(body.get("approvedCost").toString()));
                if (body.get("approverNotes") != null) m.setApproverNotes(body.get("approverNotes").toString());
                // Set final cost
                BigDecimal finalCost = m.getApprovedCost() != null ? m.getApprovedCost() : m.getEstimatedCost();
                if (finalCost != null) m.setCost(finalCost);
            }
            case "reject" -> {
                m.setWorkflowStatus("rejected"); m.setStatus("pending");
                if (body.get("approverNotes") != null) m.setApproverNotes(body.get("approverNotes").toString());
            }
            case "start"    -> { m.setWorkflowStatus("in_progress");  m.setStatus("in_progress"); }
            case "complete" -> { m.setWorkflowStatus("completed");    m.setStatus("completed"); }
        }

        Maintenance saved = maintRepo.save(m);
        audit.log(u, null, "Maintenance", "Workflow", m.getVehicleReg() + " → " + action, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Workflow updated", saved));
    }

    /** GET /api/service-centers/maintenance/{id}/invoice — structured invoice data */
    @GetMapping("/maintenance/{maintId}/invoice")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getInvoice(@PathVariable Long maintId) {
        Maintenance m = maintRepo.findById(maintId)
            .orElseThrow(() -> new ResourceNotFoundException("Maintenance not found"));
        List<MaintenancePart> parts = partsRepo.findByMaintenanceIdOrderByCreatedAtAsc(maintId);
        ServiceCenter sc = m.getServiceCenterId() != null
            ? scRepo.findById(m.getServiceCenterId()).orElse(null) : null;

        BigDecimal total = parts.stream()
            .filter(p -> p.getTotalCost() != null)
            .map(MaintenancePart::getTotalCost)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> inv = new LinkedHashMap<>();
        inv.put("invoiceNo",      m.getInvoiceNo() != null ? m.getInvoiceNo() : "DRAFT-" + maintId);
        inv.put("invoiceDate",    m.getInvoiceDate() != null ? m.getInvoiceDate() : LocalDate.now());
        inv.put("vehicleReg",     m.getVehicleReg());
        inv.put("maintenanceType", m.getType());
        inv.put("serviceCenter",  sc != null ? Map.of("name", sc.getName(), "phone", sc.getPhone() != null ? sc.getPhone() : "", "taxId", sc.getTaxId() != null ? sc.getTaxId() : "") : null);
        inv.put("parts",          parts);
        inv.put("subtotal",       total);
        inv.put("estimatedCost",  m.getEstimatedCost());
        inv.put("approvedCost",   m.getApprovedCost());
        inv.put("finalCost",      m.getApprovedCost() != null ? m.getApprovedCost() : m.getEstimatedCost());
        inv.put("workflowStatus", m.getWorkflowStatus());
        inv.put("submittedBy",    m.getSubmittedBy());
        inv.put("approverNotes",  m.getApproverNotes());
        return ResponseEntity.ok(ApiResponse.ok(inv));
    }

    private String user() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
