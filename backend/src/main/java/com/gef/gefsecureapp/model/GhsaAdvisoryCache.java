package com.gef.gefsecureapp.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Cache local de advisories de GitHub Advisory Database, por GHSA ID -- una fila por
 *  advisory, reutilizada por todas las vulnerabilidades que la referencian (el mismo
 *  CVE puede aparecer en varios componentes/activos, no tiene sentido duplicar el texto).
 *  Se llena de forma perezosa: la primera vez que se pide un GHSA ID no visto, se
 *  consulta la API publica de GitHub y se guarda aca para las proximas veces. */
@Entity
@Table(name = "ghsa_advisory_cache")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GhsaAdvisoryCache {

    @Id
    @Column(name = "ghsa_id", length = 30)
    private String ghsaId;

    @Column(length = 500)
    private String summary;

    @Column(columnDefinition = "text")
    private String description;

    /** URLs de referencia, una por linea -- evita modelar un tipo array/jsonb para un
     *  campo de solo lectura que nunca se filtra ni se busca por su contenido. */
    @Column(name = "reference_urls", columnDefinition = "text")
    private String referenceUrls;

    @Column(name = "fetched_at")
    private LocalDateTime fetchedAt;

    // Fase 8 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md), Componente D: GitHub
    // distingue advisories revisadas (reviewed=true, validadas por una persona) de no
    // revisadas (sincronizadas automaticamente desde NVD). withdrawnAt no-null significa
    // que GitHub retiro el advisory despues de publicado.
    private Boolean reviewed;

    @Column(name = "withdrawn_at")
    private LocalDateTime withdrawnAt;
}
