package io.github.paulushcgcj.roadtoarch.spat.user.dto;

/**
 * Request body for inviting a new user to the caller's tenant.
 *
 * @param email     email address (also used as the Keycloak username)
 * @param firstName first name
 * @param lastName  last name
 * @param role      realm-level role to assign ({@code ADMIN} or {@code MEMBER})
 */
public record InviteUserRequest(String email, String firstName, String lastName, String role) {}
