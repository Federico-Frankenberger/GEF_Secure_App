package com.gef.gefsecureapp.service;

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

    @Value("${n8n.webhook.url}")
    private String webhookUrl;

    private final RestClient.Builder restClientBuilder;

    public void triggerScan(Long assetId, String software, String version, String ecosystem) {
        Map<String, Object> payload = Map.of(
                "assetId",   assetId,
                "software",  software  != null ? software  : "",
                "version",   version   != null ? version   : "",
                "ecosystem", ecosystem != null ? ecosystem : ""
        );
        try {
            String response = restClientBuilder.build()
                    .post()
                    .uri(webhookUrl)
                    .header("Content-Type", "application/json")
                    .body(payload)
                    .retrieve()
                    .body(String.class);
            log.info("n8n webhook ok — assetId={} response={}", assetId, response);
        } catch (Exception ex) {
            log.error("Error llamando webhook n8n para assetId={}: {}", assetId, ex.getMessage());
        }
    }
}
