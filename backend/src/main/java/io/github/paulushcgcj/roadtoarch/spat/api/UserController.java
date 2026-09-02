package io.github.paulushcgcj.roadtoarch.spat.api;

import io.github.paulushcgcj.roadtoarch.spat.user.UserService;
import io.github.paulushcgcj.roadtoarch.spat.user.dto.InviteUserRequest;
import io.github.paulushcgcj.roadtoarch.spat.user.dto.UpdateUserRolesRequest;
import io.github.paulushcgcj.roadtoarch.spat.user.dto.UpdateUserStatusRequest;
import io.github.paulushcgcj.roadtoarch.spat.user.dto.UserSummary;
import io.github.paulushcgcj.roadtoarch.spat.util.JwtClaimUtil;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST endpoints for user management within the caller's tenant.
 *
 * <p>Listing users is available to any authenticated user (filtered by tenant).
 * Invite, deactivate, and role-change operations require the {@code ADMIN}
 * realm role.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

	private final UserService userService;

	public UserController(UserService userService) {
		this.userService = userService;
	}

	/**
	 * Returns a paginated list of user summaries for the caller's tenant.
	 *
	 * @param jwt  the authenticated caller's JWT (injected by Spring Security)
	 * @param page zero-based page index (default {@code 0})
	 * @param size page size (default {@code 20})
	 * @return paginated response containing {@code content}, {@code totalElements},
	 *     {@code totalPages}, {@code number}, and {@code size}
	 */
	@GetMapping
	public Page<UserSummary> listUsers(
			@AuthenticationPrincipal Jwt jwt,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		String tenantId = JwtClaimUtil.getTenantId(jwt);
		return userService.listUsers(tenantId, page, size);
	}

	/**
	 * Invites a new user to the caller's tenant.
	 *
	 * <p>Creates a Keycloak user with the {@code tenant_id} attribute set to the
	 * caller's tenant, assigns the requested realm role, and requires the user
	 * to update their password on first login.
	 *
	 * @param jwt     the authenticated admin's JWT
	 * @param request invite payload (email, name, role)
	 * @return {@code 201 Created} with the new user's Keycloak ID
	 */
	@PostMapping("/invite")
	@ResponseStatus(HttpStatus.CREATED)
	public String inviteUser(@AuthenticationPrincipal Jwt jwt, @RequestBody InviteUserRequest request) {
		requireAdmin(jwt);
		String tenantId = JwtClaimUtil.getTenantId(jwt);
		return userService.inviteUser(tenantId, request);
	}

	/**
	 * Enables or disables a user account.
	 *
	 * @param jwt     the authenticated admin's JWT
	 * @param userId  Keycloak user ID of the target user
	 * @param request status update payload
	 * @return {@code 200 OK} on success
	 */
	@PatchMapping("/{userId}/status")
	public ResponseEntity<Void> updateUserStatus(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable String userId,
			@RequestBody UpdateUserStatusRequest request) {
		requireAdmin(jwt);
		String tenantId = JwtClaimUtil.getTenantId(jwt);
		userService.updateUserStatus(tenantId, userId, request);
		return ResponseEntity.ok().build();
	}

	/**
	 * Replaces the realm-level roles assigned to a user.
	 *
	 * @param jwt     the authenticated admin's JWT
	 * @param userId  Keycloak user ID of the target user
	 * @param request role update payload containing the desired role names
	 * @return {@code 200 OK} on success
	 */
	@PatchMapping("/{userId}/roles")
	public ResponseEntity<Void> updateUserRoles(
			@AuthenticationPrincipal Jwt jwt,
			@PathVariable String userId,
			@RequestBody UpdateUserRolesRequest request) {
		requireAdmin(jwt);
		String tenantId = JwtClaimUtil.getTenantId(jwt);
		userService.updateUserRoles(tenantId, userId, request);
		return ResponseEntity.ok().build();
	}

	/**
	 * Asserts that the JWT carries the {@code ADMIN} realm role.
	 *
	 * @throws ResponseStatusException with {@code 403 Forbidden} if not an admin
	 */
	private static void requireAdmin(Jwt jwt) {
		List<String> roles = jwt.getClaimAsStringList("realm_access.roles");
		if (roles == null || !roles.contains("ADMIN")) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required");
		}
	}
}
