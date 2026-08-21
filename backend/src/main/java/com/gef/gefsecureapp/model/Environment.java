package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.time.LocalDateTime;

// M3 (docs/20-08-26/AUDITORIA_END_TO_END.md): EnvironmentController bindeaba esta
// entidad JPA directo del @RequestBody sin @Valid ni ninguna anotacion de Bean
// Validation -- name/businessCriticality podian llegar en blanco/null, dependiendo
// solo de que la constraint de la base (NOT NULL) frenara con un 500 crudo en vez de
// un 400 legible.
@Entity
@Table(name = "environments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Environment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "El nombre es requerido")
    @Size(max = 50)
    @Column(length = 50, unique = true, nullable = false)
    private String name;

    @NotBlank(message = "La criticidad de negocio es requerida")
    @Size(max = 20)
    @Column(name = "business_criticality", length = 20, nullable = false)
    private String businessCriticality;

    @Column(columnDefinition = "text")
    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
