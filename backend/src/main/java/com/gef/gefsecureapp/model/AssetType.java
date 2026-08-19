package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;

/** Catalogo administrable de tipos de host, para el <select> de alta de
 *  Activo -- sin FK real desde assets.asset_type (sigue siendo texto libre). */
@Entity
@Table(name = "asset_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssetType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 30, unique = true, nullable = false)
    private String name;
}
