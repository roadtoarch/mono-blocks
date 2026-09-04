package io.github.paulushcgcj.roadtoarch.spat.dtos.users;

import java.util.List;

/**
 * Request body for replacing the realm-level roles assigned to a user.
 *
 * <p>The supplied list is treated as the <em>desired</em> state: roles present
 * in the list but not currently assigned will be added, and roles currently
 * assigned but absent from the list will be removed.
 *
 * @param roles desired realm-level role names (each must be {@code ADMIN} or {@code MEMBER})
 */
public record UpdateUserRolesRequest(List<String> roles) {}
