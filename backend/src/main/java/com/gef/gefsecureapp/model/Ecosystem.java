package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;

/** Catalogo administrable de ecosistemas de software, para el <select> de
 *  alta de Componente -- sin FK real desde software_components.ecosystem
 *  (sigue siendo texto libre). */
@Entity
@Table(name = "ecosystems")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Ecosystem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50, unique = true, nullable = false)
    private String name;
}
