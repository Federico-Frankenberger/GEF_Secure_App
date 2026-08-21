package com.gef.gefsecureapp.exception;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.assertj.core.api.Assertions.assertThat;

/** Cubre C6 (auditoria docs/20-08-26/AUDITORIA_END_TO_END.md): el catch-all antes
 *  devolvia ex.getMessage() crudo -- nombres de tabla/columna/constraint u otros
 *  detalles internos expuestos al cliente ante cualquier excepcion no mapeada. */
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleDataIntegrityViolation_devuelve409ConMensajeGenerico_sinDetalleDeLaConstraint() {
        var ex = new DataIntegrityViolationException(
                "duplicate key value violates unique constraint \"unique_component_per_asset\" DETAIL: Key (asset_id, software, ecosystem, version)=(9, express, npm, 4.18.2) already exists.");

        var response = handler.handleDataIntegrityViolation(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().message).doesNotContain("unique_component_per_asset", "asset_id", "DETAIL");
        assertThat(response.getBody().message).isEqualTo("El registro ya existe o viola una regla de integridad");
    }

    @Test
    void handleMaxUploadSizeExceeded_devuelve413() {
        var ex = new MaxUploadSizeExceededException(20L * 1024 * 1024);

        var response = handler.handleMaxUploadSizeExceeded(ex);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }

    @Test
    void handleGeneric_devuelve500ConMensajeFijo_sinExponerElDetalleInternoDeLaExcepcion() {
        var ex = new NullPointerException("Cannot invoke \"com.gef.gefsecureapp.model.Asset.getEnvironment()\" because \"asset\" is null");

        var response = handler.handleGeneric(ex, null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody().message).isEqualTo("Error interno del servidor");
        assertThat(response.getBody().message).doesNotContain("Asset", "getEnvironment", "NullPointer");
    }
}
