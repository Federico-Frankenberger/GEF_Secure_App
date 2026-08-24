package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.GhsaAdvisoryDTO;
import com.gef.gefsecureapp.exception.GhsaAdvisoryUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/** RPT-GHSA-404 (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): reproducido en
 *  vivo -- la Ficha de CVE/GHSA rompia con 500 (UnexpectedRollbackException) para
 *  cualquier CVE cuyo GHSA asociado ya no existiera en GitHub, aunque
 *  ReportPdfService.fetchAdvisoryOrNull() ya atrapaba GhsaAdvisoryUnavailableException a
 *  proposito para degradar sin descripcion. Causa raiz: getByGhsaId() era @Transactional
 *  con propagation REQUIRED -- al fallar, participaba de la MISMA transaccion que su
 *  caller (tambien @Transactional) y la marcaba rollback-only antes de que el catch la
 *  viera; al terminar el metodo exterior, Spring intenta comitear, encuentra la marca, y
 *  tira UnexpectedRollbackException -- aunque el caller ya hubiera manejado el error.
 *
 *  Test de integracion real (@SpringBootTest, no Mockito puro) porque el bug es de
 *  AOP/propagacion de transacciones -- invisible a un mock de POJO. CallerProbe replica
 *  la MISMA forma que ReportPdfService.fetchAdvisoryOrNull (un @Transactional que llama a
 *  getByGhsaId y atrapa GhsaAdvisoryUnavailableException) sin tocar ningun dato de negocio
 *  real -- no hace falta sembrar/limpiar AssetVulnerability para reproducir el bug. */
@SpringBootTest
@ActiveProfiles("test")
class GhsaAdvisoryServiceTransactionTest {

    @TestConfiguration
    static class ProbeConfig {
        @Bean
        CallerProbe callerProbe(GhsaAdvisoryService service) {
            return new CallerProbe(service);
        }
    }

    static class CallerProbe {
        private final GhsaAdvisoryService service;

        CallerProbe(GhsaAdvisoryService service) {
            this.service = service;
        }

        // Mismo shape que ReportPdfService.fetchAdvisoryOrNull(): un @Transactional que
        // llama a getByGhsaId() y atrapa la excepcion para degradar sin romper.
        @Transactional(readOnly = true)
        GhsaAdvisoryDTO fetchOrNullThenReturn(String ghsaId) {
            try {
                return service.getByGhsaId(ghsaId);
            } catch (GhsaAdvisoryUnavailableException ignored) {
                return null;
            }
        }
    }

    @Autowired
    private CallerProbe callerProbe;

    @MockBean
    private RestClient.Builder restClientBuilder;

    @Test
    void callerCatchingTheException_should_stillCompleteItsOwnTransaction_withoutUnexpectedRollback() {
        when(restClientBuilder.build()).thenThrow(new RuntimeException("GitHub caído (simulado)"));

        // Antes del fix esto tira UnexpectedRollbackException (el bug real RPT-GHSA-404),
        // aunque fetchOrNullThenReturn() ya atrapó la excepción internamente.
        GhsaAdvisoryDTO result = callerProbe.fetchOrNullThenReturn("GHSA-no-existe-mas-test");

        assertThat(result).isNull();
    }
}
