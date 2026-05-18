package com.nexdecade.vms.service;

import com.nexdecade.vms.entity.Notice;
import com.nexdecade.vms.exception.ResourceNotFoundException;
import com.nexdecade.vms.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.List;

@Service @RequiredArgsConstructor
public class NoticeService {
    private final NoticeRepository repo;

    public List<Notice> findAll() { return repo.findAllByOrderByDateDesc(); }

    public Notice findById(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Notice not found: " + id));
    }

    public Notice save(Notice n) {
        if (n.getDate() == null) n.setDate(LocalDate.now());
        return repo.save(n);
    }

    public Notice update(Long id, Notice n) {
        Notice existing = findById(id);
        n.setId(existing.getId());
        n.setCreatedAt(existing.getCreatedAt());
        n.setAttachmentName(existing.getAttachmentName());
        n.setAttachmentPath(existing.getAttachmentPath());
        return repo.save(n);
    }

    public Notice saveAttachment(Long id, MultipartFile file, String uploadDir) throws IOException {
        Notice notice = findById(id);
        if (notice.getAttachmentPath() != null) {
            Files.deleteIfExists(Paths.get(notice.getAttachmentPath()));
        }
        Path dir = Paths.get(uploadDir);
        Files.createDirectories(dir);
        String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
        String stored = id + "_" + System.currentTimeMillis() + (ext != null ? "." + ext : "");
        Path dest = dir.resolve(stored);
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        notice.setAttachmentName(file.getOriginalFilename());
        notice.setAttachmentPath(dest.toString());
        return repo.save(notice);
    }

    public void removeAttachment(Long id) throws IOException {
        Notice notice = findById(id);
        if (notice.getAttachmentPath() != null) {
            Files.deleteIfExists(Paths.get(notice.getAttachmentPath()));
            notice.setAttachmentName(null);
            notice.setAttachmentPath(null);
            repo.save(notice);
        }
    }

    public void delete(Long id) {
        Notice notice = findById(id);
        if (notice.getAttachmentPath() != null) {
            try { Files.deleteIfExists(Paths.get(notice.getAttachmentPath())); } catch (IOException ignored) {}
        }
        repo.deleteById(id);
    }
}
