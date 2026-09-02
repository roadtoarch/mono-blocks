package io.github.paulushcgcj.roadtoarch.spat.user.dto;

import java.util.List;

/**
 * Lightweight, read-only summary of a Keycloak user for list views.
 *
 * <p>Intentionally omits Keycloak-specific fields (required actions, attributes)
 * that the frontend does not need for the user-management table.
 *
 * @param id        Keycloak user ID
 * @param username  login name
 * @param firstName first name (may be {@code null})
 * @param lastName  last name (may be {@code null})
 * @param email     email address (may be {@code null})
 * @param enabled   whether the user account is enabled
 * @param roles     realm-level role names assigned to the user
 */
public record UserSummary(
		String id,
		String username,
		String firstName,
		String lastName,
		String email,
		boolean enabled,
		List<String> roles) {}
