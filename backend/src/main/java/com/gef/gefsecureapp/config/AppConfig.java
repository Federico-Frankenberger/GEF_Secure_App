package com.gef.gefsecureapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AppConfig {

    // El CORS vive en SecurityConfig desde la Fase 3: Spring Security intercepta
    // antes que el WebMvcConfigurer, así que si no se reconfigura ahí, el
    // preflight OPTIONS del login queda bloqueado antes de llegar a esta clase.
    @Bean
    public RestClient.Builder restClientBuilder() {
        // Sin timeout explícito, RestClient puede quedar colgado indefinidamente
        // si n8n no responde (verificado: el bean por defecto no tiene límite).
        // El webhook de n8n responde "onReceived" casi al instante en operación
        // normal, así que estos valores son generosos, no ajustados al límite.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(3_000);
        factory.setReadTimeout(5_000);
        return RestClient.builder().requestFactory(factory);
    }
}
