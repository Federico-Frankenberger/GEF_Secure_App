package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.exception.N8nUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class N8nWebhookService {

    private static final String TODOS = "TODOS";

    @Value("${n8n.webhook.url}")
    private String webhookUrl;

    @Value("${n8n.inject-webhook.url}")
    private String injectWebhookUrl;

    private final RestClient.Builder restClientBuilder;

    public void triggerScanForAsset(String assetName, Long scanId) {
        trigger(assetName, TODOS, scanId);
    }

    /** Escaneo por Activo/host completo (todos sus SoftwareComponent): a diferencia de
     *  triggerScanForAsset (que manda entorno=TODOS porque apunta a 1 solo componente por
     *  nombre), acá se manda el entorno real del activo -- si no, un Activo homónimo en
     *  otro entorno (permitido por el schema, ver §4.2) podría matchear también. */
    public void triggerScanForAssetHost(String assetName, String environmentName, Long scanId) {
        trigger(assetName, environmentName, scanId);
    }

    public void triggerScanForEnvironment(String environmentName, Long scanId) {
        trigger(TODOS, environmentName, scanId);
    }

    public void triggerGlobalScan(Long scanId) {
        trigger(TODOS, TODOS, scanId);
    }

    /** Flujo inyector (§11.16): crea 1 activo de prueba con 5 componentes de software
     *  real y vulnerable, sin body -- n8n resuelve todo (fetch + insert) del otro lado. */
    public void triggerAssetInjection() {
        try {
            restClientBuilder.build()
                    .post()
                    .uri(injectWebhookUrl)
                    .retrieve()
                    .toBodilessEntity();
            log.info("n8n webhook de inyección de activo disparado ok");
        } catch (Exception ex) {
            log.error("Error llamando webhook de inyección de n8n: {}", ex.getMessage());
            throw new N8nUnavailableException(
                    "No se pudo disparar la inyección de activo en n8n: " + ex.getMessage(), ex);
        }
    }

    private void trigger(String activoName, String entorno, Long scanId) {
        Map<String, Object> payload = Map.of(
                "activo_name", activoName,
                "entorno", entorno,
                "scan_id", scanId
        );
        try {
            restClientBuilder.build()
                    .post()
                    .uri(webhookUrl)
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .retrieve()
                    .body(String.class);
            log.info("n8n webhook ok — activo_name={} entorno={} scan_id={}", activoName, entorno, scanId);
        } catch (Exception ex) {
            log.error("Error llamando webhook n8n (activo_name={}, entorno={}, scan_id={}): {}",
                    activoName, entorno, scanId, ex.getMessage());
            throw new N8nUnavailableException(
                    "No se pudo disparar el scan en n8n: " + ex.getMessage(), ex);
        }
    }
}
