package io.github.paulushcgcj.roadtoarch.spat.security;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TenantJwtAuthenticationConverterTest {

	private final TenantJwtAuthenticationConverter converter = new TenantJwtAuthenticationConverter();

	@Test
	void convert_withValidJwt_extractsRealmRolesWithPrefix() {
		Jwt jwt = jwtBuilder()
			.claim("tenant_id", "1")
			.claim("realm_access", Map.of("roles", List.of("ADMIN", "VIEWER")))
			.build();

		AbstractAuthenticationToken result = converter.convert(jwt);

		assertThat(result).isInstanceOf(JwtAuthenticationToken.class);
		assertThat(result.getAuthorities())
			.extracting(GrantedAuthority::getAuthority)
			.contains("ROLE_ADMIN", "ROLE_VIEWER");
	}

	@Test
	void convert_withValidJwt_extractsScopeAuthorities() {
		Jwt jwt = jwtBuilder()
			.claim("tenant_id", "1")
			.claim("scope", "openid profile")
			.build();

		AbstractAuthenticationToken result = converter.convert(jwt);

		assertThat(result.getAuthorities())
			.extracting(GrantedAuthority::getAuthority)
			.contains("SCOPE_openid", "SCOPE_profile");
	}

	@Test
	void convert_withValidJwt_setsPrincipalToSubject() {
		Jwt jwt = jwtBuilder()
			.claim("tenant_id", "1")
			.build();

		JwtAuthenticationToken result = (JwtAuthenticationToken) converter.convert(jwt);

		assertThat(result.getName()).isEqualTo("mock-sub");
	}

	@Test
	void convert_withMissingTenantId_throwsOAuth2AuthenticationException() {
		Jwt jwt = jwtBuilder().build();

		assertThatThrownBy(() -> converter.convert(jwt))
			.isInstanceOf(OAuth2AuthenticationException.class)
			.satisfies(ex -> assertThat(((OAuth2AuthenticationException) ex).getError().getErrorCode())
				.isEqualTo("invalid_token"));
	}

	@Test
	void convert_withBlankTenantId_throwsOAuth2AuthenticationException() {
		Jwt jwt = jwtBuilder()
			.claim("tenant_id", "   ")
			.build();

		assertThatThrownBy(() -> converter.convert(jwt))
			.isInstanceOf(OAuth2AuthenticationException.class);
	}

	@Test
	void convert_withEmptyRealmAccess_returnsNoRoleAuthorities() {
		Jwt jwt = jwtBuilder()
			.claim("tenant_id", "1")
			.build();

		AbstractAuthenticationToken result = converter.convert(jwt);

		assertThat(result.getAuthorities())
			.extracting(GrantedAuthority::getAuthority)
			.noneMatch(a -> a.startsWith("ROLE_"));
	}

	@Test
	void convert_withEmptyRolesList_returnsNoRoleAuthorities() {
		Jwt jwt = jwtBuilder()
			.claim("tenant_id", "1")
			.claim("realm_access", Map.of("roles", List.of()))
			.build();

		AbstractAuthenticationToken result = converter.convert(jwt);

		assertThat(result.getAuthorities())
			.extracting(GrantedAuthority::getAuthority)
			.noneMatch(a -> a.startsWith("ROLE_"));
	}

	@Test
	void convert_withMultipleRoles_allPrefixed() {
		Jwt jwt = jwtBuilder()
			.claim("tenant_id", "1")
			.claim("realm_access", Map.of("roles", List.of("ADMIN", "VIEWER", "AUDITOR", "SUBMITTER")))
			.build();

		AbstractAuthenticationToken result = converter.convert(jwt);

		assertThat(result.getAuthorities())
			.extracting(GrantedAuthority::getAuthority)
			.containsExactlyInAnyOrder("ROLE_ADMIN", "ROLE_VIEWER", "ROLE_AUDITOR", "ROLE_SUBMITTER");
	}

	private static Jwt.Builder jwtBuilder() {
		return Jwt.withTokenValue("mock-token")
			.header("alg", "RS256")
			.claim("sub", "mock-sub");
	}
}
