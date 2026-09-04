package io.github.paulushcgcj.roadtoarch.spat.configuration;

import io.github.paulushcgcj.roadtoarch.spat.security.TenantJwtAuthenticationConverter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * HTTP security configuration for the SPAT backend.
 *
 * <p>A thin composer that wires the security filter chain from focused, single-responsibility
 * beans. CORS is handled by {@link io.github.paulushcgcj.roadtoarch.spat.security.CorsConfig},
 * JWT conversion and authority extraction by
 * {@link TenantJwtAuthenticationConverter}.
 *
 * <ul>
 *   <li>Stateless session management for JWT bearer-token authentication.</li>
 *   <li>CORS policy derived from {@link FrontendProperties}.</li>
 *   <li>CSRF disabled because the API is stateless.</li>
 *   <li>Method-level security enabled via {@link EnableMethodSecurity} for
 *       {@code @PreAuthorize} annotations on controller methods.</li>
 * </ul>
 */
@Configuration
@EnableConfigurationProperties(FrontendProperties.class)
@EnableMethodSecurity
public class SecurityConfiguration {

	private final TenantJwtAuthenticationConverter jwtAuthenticationConverter;
	private final CorsConfigurationSource corsConfigurationSource;

	public SecurityConfiguration(
			TenantJwtAuthenticationConverter jwtAuthenticationConverter,
			CorsConfigurationSource corsConfigurationSource) {
		this.jwtAuthenticationConverter = jwtAuthenticationConverter;
		this.corsConfigurationSource = corsConfigurationSource;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable)
			.cors(cors -> cors.configurationSource(corsConfigurationSource))
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health/**").permitAll()
				.anyRequest().authenticated())
			.oauth2ResourceServer(oauth2 -> oauth2
				.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));
		return http.build();
	}
}
