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

    private final RestClient.Builder restClientBuilder;

    public void triggerScanForAsset(String assetName) {
        trigger(assetName, TODOS);
    }

    public void triggerScanForEnvironment(String environmentName) {
        trigger(TODOS, environmentName);
    }

    public void triggerGlobalScan() {
        trigger(TODOS, TODOS);
    }

    private void trigger(String activoName, String entorno) {
        Map<String, Object> payload = Map.of(
                "activo_name", activoName,
                "entorno", entorno
        );
        try {
            restClientBuilder.build()
                    .post()
                    .uri(webhookUrl)
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .retrieve()
                    .body(String.class);
            log.info("n8n webhook ok — activo_name={} entorno={}", activoName, entorno);
        } catch (Exception ex) {
            log.error("Error llamando webhook n8n (activo_name={}, entorno={}): {}",
                    activoName, entorno, ex.getMessage());
            throw new N8nUnavailableException(
                    "No se pudo disparar el scan en n8n: " + ex.getMessage(), ex);
        }
    }
}
