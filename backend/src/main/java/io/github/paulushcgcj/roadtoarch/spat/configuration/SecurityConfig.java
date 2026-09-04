package io.github.paulushcgcj.roadtoarch.spat.configuration;

import java.util.Collection;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * HTTP security configuration for the SPAT backend.
 *
 * <ul>
 *   <li>Stateless session management for JWT bearer-token authentication.</li>
 *   <li>CORS policy derived from {@link FrontendProperties}.</li>
 *   <li>CSRF disabled because the API is stateless.</li>
 *   <li>JWT authentication requires a non-blank {@code tenant_id} claim.</li>
 * </ul>
 */
@Configuration
@EnableConfigurationProperties(FrontendProperties.class)
public class SecurityConfig {

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, FrontendProperties props) {
		http
			.csrf(AbstractHttpConfigurer::disable)
			.cors(cors -> cors.configurationSource(corsConfigurationSource(props)))
			.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/actuator/health/**").permitAll()
				.anyRequest().authenticated())
			.oauth2ResourceServer(oauth2 -> oauth2
				.jwt(jwt -> jwt.jwtAuthenticationConverter(tenantAwareJwtConverter())));
		return http.build();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(FrontendProperties props) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(props.cors().origins());
		config.setAllowedHeaders(props.cors().headers());
		config.setAllowedMethods(props.cors().methods());
		config.setMaxAge(props.cors().age());
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	/**
	 * Returns a converter that validates the presence of a non-blank {@code tenant_id}
	 * claim before delegating authority extraction to the default scope/role mapper.
	 *
	 * <p>If the claim is missing or blank, an {@link OAuth2AuthenticationException} is
	 * thrown, which the bearer-token filter translates into a {@code 401 Unauthorized}
	 * response with a {@code WWW-Authenticate} header.
	 */
	private Converter<Jwt, AbstractAuthenticationToken> tenantAwareJwtConverter() {
		JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
		return jwt -> {
			String tenantId = jwt.getClaimAsString("tenant_id");
			if (tenantId == null || tenantId.isBlank()) {
				throw new OAuth2AuthenticationException(
					new OAuth2Error("invalid_token", "Missing required claim: tenant_id", null));
			}
			Collection<GrantedAuthority> authorities = authoritiesConverter.convert(jwt);
			return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
		};
	}
}
