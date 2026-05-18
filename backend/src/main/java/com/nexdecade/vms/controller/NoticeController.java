package com.nexdecade.vms.controller;

import com.nexdecade.vms.dto.ApiResponse;
import com.nexdecade.vms.entity.Notice;
import com.nexdecade.vms.entity.NoticeRead;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.NoticeReadRepository;
import com.nexdecade.vms.repository.UserRepository;
import com.nexdecade.vms.service.AuditLogService;
import com.nexdecade.vms.service.NoticeService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService service;
    private final AuditLogService audit;
    private final NoticeReadRepository noticeReadRepository;
    private final UserRepository userRepository;

    @Value("${vms.upload.dir}")
    private String uploadDir;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        String currentUser = user();
        List<Notice> notices = service.findAll();
        if (notices.isEmpty()) return ResponseEntity.ok(ApiResponse.ok(List.of()));

        List<Long> ids = notices.stream().map(Notice::getId).collect(Collectors.toList());

        Map<Long, Long> countMap = noticeReadRepository.countGroupByNoticeId(ids)
                .stream().collect(Collectors.toMap(r -> (Long) r[0], r -> (Long) r[1]));

        Set<Long> readByMe = noticeReadRepository.findNoticeIdsReadByUser(currentUser, ids);

        List<Map<String, Object>> result = notices.stream().map(n -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id",             n.getId());
            m.put("title",          n.getTitle());
            m.put("body",           n.getBody());
            m.put("priority",       n.getPriority());
            m.put("category",       n.getCategory());
            m.put("postedBy",       n.getPostedBy());
            m.put("date",           n.getDate());
            m.put("createdAt",      n.getCreatedAt());
            m.put("attachmentName", n.getAttachmentName());
            m.put("readCount",      countMap.getOrDefault(n.getId(), 0L));
            m.put("readByMe",       readByMe.contains(n.getId()));
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Notice>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.findById(id)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(@PathVariable Long id, HttpServletRequest req) {
        String username = user();
        if (!noticeReadRepository.existsByNoticeIdAndUsername(id, username)) {
            String fullName = userRepository.findByUsername(username)
                    .map(u -> u.getFullName()).orElse(username);
            noticeReadRepository.save(new NoticeRead(id, username, fullName));
        }
        return ResponseEntity.ok(ApiResponse.ok("Marked as read", null));
    }

    @GetMapping("/{id}/reads")
    public ResponseEntity<ApiResponse<List<NoticeRead>>> getReads(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(
                noticeReadRepository.findByNoticeIdOrderByReadAtDesc(id)));
    }

    @PostMapping("/{id}/attachment")
    public ResponseEntity<ApiResponse<Notice>> uploadAttachment(@PathVariable Long id,
            @RequestParam("file") MultipartFile file, HttpServletRequest req) throws IOException {
        Notice updated = service.saveAttachment(id, file, uploadDir);
        audit.log(user(), null, "Notices", "Upload Attachment",
                "Uploaded \"" + file.getOriginalFilename() + "\" for notice #" + id,
                req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Attachment uploaded", updated));
    }

    @DeleteMapping("/{id}/attachment")
    public ResponseEntity<ApiResponse<Void>> removeAttachment(@PathVariable Long id,
            HttpServletRequest req) throws IOException {
        service.removeAttachment(id);
        audit.log(user(), null, "Notices", "Remove Attachment",
                "Removed attachment from notice #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Attachment removed", null));
    }

    @GetMapping("/{id}/attachment")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long id) throws IOException {
        Notice notice = service.findById(id);
        if (notice.getAttachmentPath() == null)
            throw new ResourceNotFoundException("No attachment for notice " + id);
        var path = Paths.get(notice.getAttachmentPath());
        Resource resource = new UrlResource(Objects.requireNonNull(path.toUri()));
        if (!resource.exists()) throw new ResourceNotFoundException("Attachment file not found");
        String contentType = Files.probeContentType(path);
        if (contentType == null) contentType = "application/octet-stream";
        String encoded = URLEncoder.encode(notice.getAttachmentName(), StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + notice.getAttachmentName() + "\"; filename*=UTF-8''" + encoded)
                .body(resource);
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Notice>> create(@RequestBody Notice n, HttpServletRequest req) {
        Notice saved = service.save(n);
        audit.log(user(), null, "Notices", "Post Notice",
                "Posted \"" + saved.getTitle() + "\"", req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Notice posted", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Notice>> update(@PathVariable Long id,
            @RequestBody Notice n, HttpServletRequest req) {
        Notice updated = service.update(id, n);
        audit.log(user(), null, "Notices", "Edit Notice",
                "Updated \"" + updated.getTitle() + "\"", req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Notice updated", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id, HttpServletRequest req) {
        service.delete(id);
        audit.log(user(), null, "Notices", "Delete Notice",
                "Deleted notice #" + id, req.getRemoteAddr(), "success");
        return ResponseEntity.ok(ApiResponse.ok("Notice deleted", null));
    }

    private String user() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
