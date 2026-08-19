package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "software_components")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SoftwareComponent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 255)
    private String name;

    @Column(length = 255)
    private String software;

    @Column(length = 50)
    private String ecosystem;

    @Column(length = 50)
    private String version;

    @Column(name = "last_scan")
    private LocalDateTime lastScan;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private boolean catalogued;

    @Column(length = 400)
    private String purl;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    private Asset asset;
}
