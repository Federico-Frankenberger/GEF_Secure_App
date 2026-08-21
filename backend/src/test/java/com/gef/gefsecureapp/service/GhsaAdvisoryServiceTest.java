package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.GhsaAdvisoryDTO;
import com.gef.gefsecureapp.exception.GhsaAdvisoryUnavailableException;
import com.gef.gefsecureapp.model.GhsaAdvisoryCache;
import com.gef.gefsecureapp.repository.GhsaAdvisoryCacheRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GhsaAdvisoryServiceTest {

    @Mock private GhsaAdvisoryCacheRepository cacheRepository;
    @Mock private RestClient.Builder restClientBuilder;

    private GhsaAdvisoryService service() {
        return new GhsaAdvisoryService(cacheRepository, restClientBuilder);
    }

    @Test
    @DisplayName("getByGhsaId() rechaza un ghsaId vacío sin consultar nada")
    void getByGhsaId_should_reject_blankId() {
        assertThatThrownBy(() -> service().getByGhsaId("  "))
                .isInstanceOf(GhsaAdvisoryUnavailableException.class);
        verifyNoInteractions(cacheRepository, restClientBuilder);
    }

    @Test
    @DisplayName("getByGhsaId() devuelve lo cacheado sin llamar a GitHub cuando ya existe")
    void getByGhsaId_should_returnFromCache_when_present() {
        GhsaAdvisoryCache cached = GhsaAdvisoryCache.builder()
                .ghsaId("GHSA-xxxx")
                .summary("Resumen")
                .description("Descripción larga")
                .referenceUrls("https://a.com\nhttps://b.com")
                .fetchedAt(LocalDateTime.now())
                .build();
        when(cacheRepository.findById("GHSA-xxxx")).thenReturn(Optional.of(cached));

        GhsaAdvisoryDTO result = service().getByGhsaId("GHSA-xxxx");

        assertThat(result.getSummary()).isEqualTo("Resumen");
        assertThat(result.getReferences()).containsExactly("https://a.com", "https://b.com");
        verifyNoInteractions(restClientBuilder);
    }

    @Test
    @DisplayName("M4: getByGhsaId() ignora el cache y reintenta contra GitHub cuando pasó el TTL de 30 días")
    void getByGhsaId_should_refetch_when_cache_isStale() {
        GhsaAdvisoryCache stale = GhsaAdvisoryCache.builder()
                .ghsaId("GHSA-stale")
                .summary("Resumen viejo")
                .fetchedAt(LocalDateTime.now().minusDays(31))
                .build();
        when(cacheRepository.findById("GHSA-stale")).thenReturn(Optional.of(stale));
        when(restClientBuilder.build()).thenThrow(new RuntimeException("fetch simulado, no debe usarse una respuesta real en este test"));

        assertThatThrownBy(() -> service().getByGhsaId("GHSA-stale"))
                .isInstanceOf(GhsaAdvisoryUnavailableException.class);

        verify(restClientBuilder).build();
    }
}
