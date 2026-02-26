package de.csiem.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties appProperties;

    public WebConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> origins = appProperties.getCorsOriginsAsList();
        registry.addMapping("/api/**")
            .allowedOrigins(origins.toArray(new String[0]))
            .allowedMethods("GET", "POST")
            .allowedHeaders("*");
    }
}
