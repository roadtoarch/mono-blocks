package io.github.paulushcgcj.roadtoarch.spat.config;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.test.context.support.WithSecurityContext;

/**
 * Annotation for integration tests that need an authenticated security context
 * with a mock Keycloak JWT.
 *
 * <p>The {@link WithMockJwtSecurityContextFactory} builds a {@link org.springframework.security.oauth2.jwt.Jwt}
 * with the configured attributes and populates the {@link org.springframework.security.core.context.SecurityContext}.
 *
 * <p>Usage:
 * <pre>
 * {@literal @}Test
 * {@literal @}WithMockJwt(tenantId = "1", roles = {"ADMIN"}, username = "alice")
 * void adminEndpoint_withAdminRole_returns200() {
 *     // ...
 * }
 * </pre>
 */
@Target({java.lang.annotation.ElementType.TYPE, java.lang.annotation.ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockJwtSecurityContextFactory.class)
public @interface WithMockJwt {

	/** Username for the {@code preferred_username} JWT claim. */
	String username() default "test-user";

	/** Email for the {@code email} JWT claim. */
	String email() default "test@example.test";

	/** Tenant identifier for the {@code tenant_id} JWT claim. */
	String tenantId() default "1";

	/** Realm roles for the {@code realm_access.roles} JWT claim. */
	String[] roles() default {"VIEWER"};
}
