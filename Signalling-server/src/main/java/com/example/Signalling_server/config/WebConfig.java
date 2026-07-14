package com.example.Signalling_server.config;


import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Exposes http://localhost:8443/images/some-uuid.jpg
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:/app/uploads/avatars/");
    }
}
