package io.github.paulushcgcj.roadtoarch.spat.config;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

/**
 * Factory that builds a {@link SecurityContext} from a {@link WithMockJwt} annotation.
 *
 * <p>Constructs a {@link Jwt} with the attributes specified in the annotation and
 * populates the {@link SecurityContextHolder} with a {@link JwtAuthenticationToken}
 * carrying the correct authorities (realm roles as {@code ROLE_}-prefixed, scopes as
 * {@code SCOPE_}-prefixed).
 */
public class WithMockJwtSecurityContextFactory implements WithSecurityContextFactory<WithMockJwt> {

	@Override
	public SecurityContext createSecurityContext(WithMockJwt annotation) {
		SecurityContext context = SecurityContextHolder.createEmptyContext();

		Jwt jwt = buildJwt(annotation);
		Collection<SimpleGrantedAuthority> authorities = buildAuthorities(annotation);
		JwtAuthenticationToken authentication = new JwtAuthenticationToken(
			jwt, authorities, jwt.getSubject());
		context.setAuthentication(authentication);

		return context;
	}

	private Jwt buildJwt(WithMockJwt annotation) {
		return Jwt.withTokenValue("mock-token")
			.header("alg", "RS256")
			.claim("sub", UUID.randomUUID().toString())
			.claim("preferred_username", annotation.username())
			.claim("email", annotation.email())
			.claim("tenant_id", annotation.tenantId())
			.claim("realm_access", Map.of("roles", List.of(annotation.roles())))
			.build();
	}

	private Collection<SimpleGrantedAuthority> buildAuthorities(WithMockJwt annotation) {
		return List.of(annotation.roles()).stream()
			.map(role -> new SimpleGrantedAuthority("ROLE_" + role))
			.toList();
	}
}
