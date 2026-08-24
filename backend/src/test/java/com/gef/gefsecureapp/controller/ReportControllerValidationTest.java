package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.security.JwtAuthenticationFilter;
import com.gef.gefsecureapp.security.LoginRateLimitFilter;
import com.gef.gefsecureapp.service.ReportPdfService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RPT-DAYS-VALIDATION (docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md): antes,
 *  `days=abc` en /api/reports/remediation|vulnerabilities daba 500 (MethodArgumentTypeMismatchException
 *  sin handler dedicado) y `days=-5` se aceptaba sin validar, generando un PDF con una
 *  ventana de tiempo invertida/sin sentido. @WebMvcTest (no Mockito puro) porque la
 *  validacion de @RequestParam y el type mismatch son concerns de la capa MVC/Bean
 *  Validation -- invisibles llamando al metodo del controller directamente.
 *  addFilters=false + exclusion explicita de los Filter propios (Jwt/RateLimit, que si no
 *  quedan igual incluidos por el slice de @WebMvcTest -- filtra por tipo asignable a
 *  jakarta.servlet.Filter, no por auto-configuracion de seguridad -- y fallan al faltarles
 *  sus propias dependencias, que este slice no provee): RBAC de estos endpoints ya se
 *  verifico en vivo (auditoria de secciones nuevas) -- este test aisla especificamente la
 *  validacion de `days`. */
@WebMvcTest(
        controllers = ReportController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthenticationFilter.class, LoginRateLimitFilter.class})
)
@AutoConfigureMockMvc(addFilters = false)
class ReportControllerValidationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ReportPdfService reportPdfService;

    @Test
    void remediationReport_days_noNumerico_deberiaDar400_noNiSiquiera500() throws Exception {
        mockMvc.perform(get("/api/reports/remediation").param("days", "abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void remediationReport_days_negativo_deberiaDar400() throws Exception {
        mockMvc.perform(get("/api/reports/remediation").param("days", "-5"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void remediationReport_days_valido_siguefuncionando() throws Exception {
        when(reportPdfService.generateRemediationReport(anyInt())).thenReturn(new byte[]{1, 2, 3});

        mockMvc.perform(get("/api/reports/remediation").param("days", "30"))
                .andExpect(status().isOk());
    }

    @Test
    void vulnerabilitiesReport_days_noNumerico_deberiaDar400() throws Exception {
        mockMvc.perform(get("/api/reports/vulnerabilities").param("days", "abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void vulnerabilitiesReport_days_negativo_deberiaDar400() throws Exception {
        mockMvc.perform(get("/api/reports/vulnerabilities").param("days", "-1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void vulnerabilitiesReport_sinParametro_usaDefault30() throws Exception {
        when(reportPdfService.generateVulnerabilityAnalysisReport(30)).thenReturn(new byte[]{1, 2, 3});

        mockMvc.perform(get("/api/reports/vulnerabilities"))
                .andExpect(status().isOk());
    }
}
