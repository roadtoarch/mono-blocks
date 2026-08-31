package io.github.paulushcgcj.roadtoarch.spat.security;

import java.util.Optional;

/**
 * Request-scoped holder for the tenant resolved from the authenticated JWT.
 *
 * <p>The value is set by {@link TenantFilter} after Spring Security validates the
 * bearer token and is cleared once the request processing completes.
 */
public final class TenantContext {

	private static final ThreadLocal<String> TENANT_ID = new ThreadLocal<>();

	private TenantContext() {
	}

	/**
	 * Returns the tenant id for the current request, if present.
	 *
	 * @return the tenant id or {@code null} when no authenticated tenant is available
	 */
	public static String getTenantId() {
		return TENANT_ID.get();
	}

	/**
	 * Returns the tenant id for the current request, if present.
	 *
	 * @return an {@link Optional} wrapping the tenant id
	 */
	public static Optional<String> findTenantId() {
		return Optional.ofNullable(TENANT_ID.get());
	}

	static void setTenantId(String tenantId) {
		TENANT_ID.set(tenantId);
	}

	static void clear() {
		TENANT_ID.remove();
	}
}
