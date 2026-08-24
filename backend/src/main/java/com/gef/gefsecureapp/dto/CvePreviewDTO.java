package com.gef.gefsecureapp.dto;

import lombok.*;

/** Preview liviano para la pestaña "Ficha de CVE/GHSA" del Centro de Informes
 *  (docs/bitacora/23-08-26): antes de generar el PDF completo, muestra si el
 *  identificador tiene coincidencias reales y cuántos activos afectados hay --
 *  evita el "a ciegas" (exportar y recién ahí enterarse con un 404). */
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CvePreviewDTO {
    private boolean found;
    private Long affectedAssetsCount;
    private String priority;
    private String cvss;
    private String summary;
}
