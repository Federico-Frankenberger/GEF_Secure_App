package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.SystemError;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemErrorRepository extends JpaRepository<SystemError, Long> {
    Page<SystemError> findAllByOrderByErrorDateDesc(Pageable pageable);
}
