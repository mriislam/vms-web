package com.nexdecade.vms.repository;

import com.nexdecade.vms.entity.NoticeRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Set;

public interface NoticeReadRepository extends JpaRepository<NoticeRead, Long> {

    boolean existsByNoticeIdAndUsername(Long noticeId, String username);

    List<NoticeRead> findByNoticeIdOrderByReadAtDesc(Long noticeId);

    long countByNoticeId(Long noticeId);

    @Query("SELECT nr.noticeId, COUNT(nr) FROM NoticeRead nr WHERE nr.noticeId IN :ids GROUP BY nr.noticeId")
    List<Object[]> countGroupByNoticeId(@Param("ids") List<Long> ids);

    @Query("SELECT nr.noticeId FROM NoticeRead nr WHERE nr.username = :username AND nr.noticeId IN :ids")
    Set<Long> findNoticeIdsReadByUser(@Param("username") String username, @Param("ids") List<Long> ids);
}
