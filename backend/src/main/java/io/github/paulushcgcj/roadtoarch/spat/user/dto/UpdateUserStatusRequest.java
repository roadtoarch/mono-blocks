package io.github.paulushcgcj.roadtoarch.spat.user.dto;

/**
 * Request body for enabling or disabling a user account.
 *
 * @param enabled {@code true} to activate the account, {@code false} to deactivate
 */
public record UpdateUserStatusRequest(boolean enabled) {}
