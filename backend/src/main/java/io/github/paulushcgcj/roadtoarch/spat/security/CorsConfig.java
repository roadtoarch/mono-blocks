package io.github.paulushcgcj.roadtoarch.spat.security;

import io.github.paulushcgcj.roadtoarch.spat.configuration.FrontendProperties;
import java.util.Objects;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS configuration derived from {@link FrontendProperties}.
 *
 * <p>Produces a {@link CorsConfigurationSource} bean consumed by both the Spring Security
 * filter chain (for preflight handling) and Spring MVC (for response header enrichment).
 * Allowed origins, headers, methods, and max-age are all externalized in {@code application.yml}
 * under {@code io.github.paulushcgcj.spat.frontend.cors.*}.
 */
@Configuration
public class CorsConfig {

	private final FrontendProperties frontendProperties;

	public CorsConfig(FrontendProperties frontendProperties) {
		this.frontendProperties = Objects.requireNonNull(frontendProperties);
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource() {
		FrontendProperties.Cors cors = frontendProperties.cors();
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(cors.origins());
		config.setAllowedHeaders(cors.headers());
		config.setAllowedMethods(cors.methods());
		config.setMaxAge(cors.age());
		config.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
