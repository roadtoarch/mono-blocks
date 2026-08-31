package io.github.paulushcgcj.roadtoarch.spat.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.stereotype.Component;

/**
 * Extracts the {@code tenant_id} claim from the validated JWT and stores it in
 * {@link TenantContext} for the duration of the request.
 *
 * <p>Registered after {@link org.springframework.security.oauth2.server.resource
 * .web.authentication.BearerTokenAuthenticationFilter} so the authentication is already
 * available by the time this filter runs.
 */
@Component
public class TenantFilter extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(
			HttpServletRequest request,
			HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		try {
			Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
			if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
				TenantContext.setTenantId(jwt.getClaimAsString("tenant_id"));
			}
			filterChain.doFilter(request, response);
		} finally {
			TenantContext.clear();
		}
	}
}
