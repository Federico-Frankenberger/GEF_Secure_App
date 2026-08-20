package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.GhsaAdvisoryCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GhsaAdvisoryCacheRepository extends JpaRepository<GhsaAdvisoryCache, String> {
}
