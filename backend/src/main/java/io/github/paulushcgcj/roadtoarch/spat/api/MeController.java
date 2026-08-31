package io.github.paulushcgcj.roadtoarch.spat.api;

import io.github.paulushcgcj.roadtoarch.spat.security.TenantContext;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes information about the currently authenticated user so the frontend can
 * confirm the end-to-end JWT flow and tenant resolution.
 */
@RestController
@RequestMapping("/api")
public class MeController {

	@GetMapping("/me")
	Map<String, Object> me() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		Map<String, Object> result = new LinkedHashMap<>();
		if (authentication.getPrincipal() instanceof Jwt jwt) {
			result.put("username", jwt.getClaimAsString("preferred_username"));
			result.put("email", jwt.getClaimAsString("email"));
			List<String> roles = authentication.getAuthorities().stream()
				.map(GrantedAuthority::getAuthority)
				.toList();
			result.put("roles", roles);
		} else {
			result.put("username", authentication.getName());
		}
		result.put("tenant_id", TenantContext.getTenantId());
		return result;
	}
}
