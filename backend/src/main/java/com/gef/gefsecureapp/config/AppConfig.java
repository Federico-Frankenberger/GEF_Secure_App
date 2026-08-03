package com.gef.gefsecureapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    // Orígenes permitidos — se inyectan desde application.properties
    // y pueden sobreescribirse con variable de entorno ALLOWED_ORIGINS
    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String[] allowedOrigins;

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

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)          // orígenes explícitos, no wildcard
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);                            // cachea el preflight 1 hora
    }
}
