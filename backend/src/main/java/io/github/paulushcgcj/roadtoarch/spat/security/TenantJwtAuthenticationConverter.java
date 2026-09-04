package io.github.paulushcgcj.roadtoarch.spat.security;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;

/**
 * Converts a Keycloak-issued {@link Jwt} into a {@link JwtAuthenticationToken}
 * with tenant validation and realm-role authority extraction.
 *
 * <p>This converter performs three tasks:
 * <ol>
 *   <li>Validates that the JWT contains a non-blank {@code tenant_id} claim.
 *       If missing or blank, an {@link OAuth2AuthenticationException} is thrown,
 *       which the bearer-token filter translates into a {@code 401 Unauthorized}
 *       response with a {@code WWW-Authenticate} header.</li>
 *   <li>Extracts realm roles from the nested {@code realm_access.roles} claim
 *       and maps each to a {@link SimpleGrantedAuthority} with the {@code ROLE_} prefix
 *       (Spring Security convention for {@code @PreAuthorize} checks).</li>
 *   <li>Delegates scope-based authority extraction to the standard
 *       {@link JwtGrantedAuthoritiesConverter} (produces {@code SCOPE_}-prefixed authorities).</li>
 * </ol>
 */
@Component
public class TenantJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

	private static final String REALM_ACCESS_CLAIM = "realm_access";
	private static final String ROLES_KEY = "roles";
	private static final String ROLE_PREFIX = "ROLE_";

	private final JwtGrantedAuthoritiesConverter scopeAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();

	@Override
	@NonNull
	public AbstractAuthenticationToken convert(@NonNull Jwt jwt) {
		String tenantId = jwt.getClaimAsString("tenant_id");
		if (tenantId == null || tenantId.isBlank()) {
			throw new OAuth2AuthenticationException(
				new OAuth2Error("invalid_token", "Missing required claim: tenant_id", null));
		}

		Collection<GrantedAuthority> authorities = new ArrayList<>();

		// Scope-based authorities (SCOPE_ prefix) from standard converter.
		Collection<GrantedAuthority> scopeAuthorities = scopeAuthoritiesConverter.convert(jwt);
		if (scopeAuthorities != null) {
			authorities.addAll(scopeAuthorities);
		}

		// Realm-role authorities (ROLE_ prefix) from realm_access.roles.
		authorities.addAll(extractRealmRoles(jwt));

		return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
	}

	/**
	 * Extracts realm roles from the nested {@code realm_access.roles} claim
	 * and maps each to a {@code ROLE_}-prefixed {@link SimpleGrantedAuthority}.
	 *
	 * <p>The Keycloak JWT structure is:
	 * <pre>
	 * {
	 *   "realm_access": {
	 *     "roles": ["ADMIN", "VIEWER"]
	 *   }
	 * }
	 * </pre>
	 */
	private List<GrantedAuthority> extractRealmRoles(Jwt jwt) {
		Map<String, Object> realmAccess = jwt.getClaimAsMap(REALM_ACCESS_CLAIM);
		if (realmAccess == null) {
			return Collections.emptyList();
		}

		@SuppressWarnings("unchecked")
		List<String> roles = (List<String>) realmAccess.get(ROLES_KEY);
		if (roles == null || roles.isEmpty()) {
			return Collections.emptyList();
		}

		return roles.stream()
			.map(role -> new SimpleGrantedAuthority(ROLE_PREFIX + role))
			.map(GrantedAuthority.class::cast)
			.toList();
	}
}
