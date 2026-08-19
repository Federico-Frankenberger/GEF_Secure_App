package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.Ecosystem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EcosystemRepository extends JpaRepository<Ecosystem, Long> {
}
