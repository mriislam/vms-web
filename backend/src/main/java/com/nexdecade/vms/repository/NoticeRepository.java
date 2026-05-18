package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {
    List<Notice> findByPriority(String priority);
    List<Notice> findByCategory(String category);
    List<Notice> findAllByOrderByDateDesc();
}
