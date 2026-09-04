package io.github.paulushcgcj.roadtoarch.spat.controllers;

import io.github.paulushcgcj.roadtoarch.spat.utils.JwtClaimUtil;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
@RequestMapping("/api/me")
public class SelfController {

	@GetMapping
	Map<String, Object> getMyData(@AuthenticationPrincipal Jwt jwt) {
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("username", jwt.getClaimAsString("preferred_username"));
		result.put("email", jwt.getClaimAsString("email"));
		List<String> roles = SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream()
			.map(GrantedAuthority::getAuthority)
			.toList();
		result.put("roles", roles);
		result.put("tenant_id", JwtClaimUtil.getTenantId(jwt));
		return result;
	}
}
