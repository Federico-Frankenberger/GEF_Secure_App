package com.gef.gefsecureapp.repository;

import com.gef.gefsecureapp.model.StateTransition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StateTransitionRepository extends JpaRepository<StateTransition, Long> {

    List<StateTransition> findByRemediationCycle_IdOrderByOccurredAtAsc(Long remediationCycleId);
}
