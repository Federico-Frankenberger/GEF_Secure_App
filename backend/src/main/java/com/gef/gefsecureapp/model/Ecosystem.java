package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/** Catalogo administrable de ecosistemas de software, para el <select> de
 *  alta de Componente -- sin FK real desde software_components.ecosystem
 *  (sigue siendo texto libre). */
// M3 (docs/20-08-26/AUDITORIA_END_TO_END.md): ver Environment.java, mismo motivo.
@Entity
@Table(name = "ecosystems")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Ecosystem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 50)
    @Column(length = 50, unique = true, nullable = false)
    private String name;
}
