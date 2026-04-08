package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_errors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemError {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "error_date")
    private LocalDateTime errorDate;

    @Column(name = "node_name", length = 100)
    private String nodeName;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "workflow_id", length = 50)
    private String workflowId;

    @Column(name = "execution_id", length = 50)
    private String executionId;
}
