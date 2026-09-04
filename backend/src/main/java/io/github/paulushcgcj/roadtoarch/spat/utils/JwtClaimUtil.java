package io.github.paulushcgcj.roadtoarch.spat.utils;

import java.util.Optional;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Static helpers for extracting well-known claims from a validated {@link Jwt}.
 *
 * <p>Controllers receive the {@code Jwt} via {@code @AuthenticationPrincipal} and
 * delegate claim access here so that claim names live in a single place.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class JwtClaimUtil {

	public static String getTenantId(Jwt jwt) {
		return jwt.getClaimAsString("tenant_id");
	}

	public static Optional<String> findTenantId(Jwt jwt) {
		return Optional.ofNullable(jwt.getClaimAsString("tenant_id"));
	}
}
