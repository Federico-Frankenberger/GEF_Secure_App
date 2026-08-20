package com.gef.gefsecureapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.gef.gefsecureapp.dto.GhsaAdvisoryDTO;
import com.gef.gefsecureapp.exception.GhsaAdvisoryUnavailableException;
import com.gef.gefsecureapp.model.GhsaAdvisoryCache;
import com.gef.gefsecureapp.repository.GhsaAdvisoryCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Frente 3 (tablero de Auditoria): trae el resumen/descripcion real de una
 *  advisory de GitHub -- lo que escribio quien reporto la vulnerabilidad, en vez
 *  de una plantilla generica armada por nosotros. Se cachea por GHSA ID: el
 *  mismo CVE puede aparecer en varios componentes/activos, no tiene sentido
 *  pedirle la misma advisory a GitHub una vez por cada uno. No requiere token
 *  con el volumen actual (limite publico de la API), pero admite uno opcional
 *  via github.token si hiciera falta mas adelante. */
@Service
@RequiredArgsConstructor
@Slf4j
public class GhsaAdvisoryService {

    private static final String ADVISORIES_URL = "https://api.github.com/advisories/{ghsaId}";

    private final GhsaAdvisoryCacheRepository cacheRepository;
    private final RestClient.Builder restClientBuilder;

    @Value("${github.token:}")
    private String githubToken;

    @Transactional
    public GhsaAdvisoryDTO getByGhsaId(String ghsaId) {
        if (ghsaId == null || ghsaId.isBlank())
            throw new GhsaAdvisoryUnavailableException("Este hallazgo no tiene un GHSA ID asociado");

        return cacheRepository.findById(ghsaId)
                .map(this::toDto)
                .orElseGet(() -> fetchAndCache(ghsaId));
    }

    private GhsaAdvisoryDTO fetchAndCache(String ghsaId) {
        try {
            RestClient.RequestHeadersSpec<?> request = restClientBuilder.build()
                    .get()
                    .uri(ADVISORIES_URL, ghsaId)
                    .header("Accept", "application/vnd.github+json");
            if (!githubToken.isBlank())
                request = request.header("Authorization", "Bearer " + githubToken);

            JsonNode body = request.retrieve().body(JsonNode.class);
            if (body == null) throw new GhsaAdvisoryUnavailableException("GitHub no devolvió información para " + ghsaId);

            GhsaAdvisoryCache entity = GhsaAdvisoryCache.builder()
                    .ghsaId(ghsaId)
                    .summary(textOrNull(body.path("summary")))
                    .description(textOrNull(body.path("description")))
                    .referenceUrls(joinReferences(body.path("references")))
                    .fetchedAt(LocalDateTime.now())
                    .build();
            cacheRepository.save(entity);
            log.info("Advisory {} cacheada desde GitHub", ghsaId);
            return toDto(entity);
        } catch (GhsaAdvisoryUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("No se pudo obtener la advisory {} de GitHub: {}", ghsaId, ex.getMessage());
            throw new GhsaAdvisoryUnavailableException(
                    "No se pudo obtener la descripción de " + ghsaId + " desde GitHub: " + ex.getMessage());
        }
    }

    private String textOrNull(JsonNode node) {
        return node.isMissingNode() || node.isNull() ? null : node.asText();
    }

    private String joinReferences(JsonNode referencesNode) {
        if (!referencesNode.isArray()) return null;
        List<String> urls = new ArrayList<>();
        referencesNode.forEach(n -> urls.add(n.asText()));
        return String.join("\n", urls);
    }

    private GhsaAdvisoryDTO toDto(GhsaAdvisoryCache entity) {
        List<String> refs = entity.getReferenceUrls() == null || entity.getReferenceUrls().isBlank()
                ? List.of()
                : List.of(entity.getReferenceUrls().split("\n"));
        return GhsaAdvisoryDTO.builder()
                .ghsaId(entity.getGhsaId())
                .summary(entity.getSummary())
                .description(entity.getDescription())
                .references(refs)
                .cachedAt(entity.getFetchedAt())
                .build();
    }
}
