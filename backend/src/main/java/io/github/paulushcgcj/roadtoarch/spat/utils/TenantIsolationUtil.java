package io.github.paulushcgcj.roadtoarch.spat.utils;

import io.github.paulushcgcj.roadtoarch.spat.exceptions.TenantIsolationException;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * Utility for enforcing tenant isolation at the service layer.
 *
 * <p>Callers pass the tenant ID extracted from the JWT (via {@link JwtClaimUtil})
 * and the tenant ID associated with the target resource. If the IDs do not match,
 * a {@link TenantIsolationException} is thrown, which translates to HTTP 403.
 */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class TenantIsolationUtil {

	/**
	 * Asserts that the JWT tenant matches the target user's tenant.
	 *
	 * @param jwtTenantId       tenant ID extracted from the authenticated JWT
	 * @param targetUserTenantId tenant ID associated with the target Keycloak user
	 * @throws TenantIsolationException if the IDs differ or the target has no tenant
	 */
	public static void assertTenantMatch(String jwtTenantId, String targetUserTenantId) {
		if (!jwtTenantId.equals(targetUserTenantId)) {
			throw new TenantIsolationException("Cross-tenant access denied");
		}
	}
}
