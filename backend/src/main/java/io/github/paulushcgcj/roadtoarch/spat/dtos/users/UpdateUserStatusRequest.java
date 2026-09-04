package io.github.paulushcgcj.roadtoarch.spat.dtos.users;

/**
 * Request body for enabling or disabling a user account.
 *
 * @param enabled {@code true} to activate the account, {@code false} to deactivate
 */
public record UpdateUserStatusRequest(boolean enabled) {}
