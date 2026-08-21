package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/** Catalogo administrable de tipos de host, para el <select> de alta de
 *  Activo -- sin FK real desde assets.asset_type (sigue siendo texto libre). */
// M3 (docs/20-08-26/AUDITORIA_END_TO_END.md): ver Environment.java, mismo motivo.
@Entity
@Table(name = "asset_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssetType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 30)
    @Column(length = 30, unique = true, nullable = false)
    private String name;
}
