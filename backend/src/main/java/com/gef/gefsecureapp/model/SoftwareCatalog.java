package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "software_catalog")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SoftwareCatalog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "package_name", length = 255, nullable = false)
    private String packageName;

    @Column(length = 50, nullable = false)
    private String ecosystem;

    @Column(name = "display_name", length = 255)
    private String displayName;

    @Column(length = 30, nullable = false)
    private String source;

    @Column(name = "first_seen_at")
    private LocalDateTime firstSeenAt;

    @Column(name = "last_seen_at")
    private LocalDateTime lastSeenAt;
}
