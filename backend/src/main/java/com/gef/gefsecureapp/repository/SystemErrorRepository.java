package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.SystemError;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SystemErrorRepository extends JpaRepository<SystemError, Long> {
    List<SystemError> findTop50ByOrderByErrorDateDesc();
}
