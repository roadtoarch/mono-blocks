package io.github.paulushcgcj.roadtoarch.spat.services.users;

import io.github.paulushcgcj.roadtoarch.spat.dtos.keycloak.KeycloakRoleMapping;
import io.github.paulushcgcj.roadtoarch.spat.dtos.keycloak.KeycloakUser;
import io.github.paulushcgcj.roadtoarch.spat.dtos.keycloak.KeycloakUserCreate;
import io.github.paulushcgcj.roadtoarch.spat.keycloak.KeycloakAdminClient;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.InviteUserRequest;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.UpdateUserRolesRequest;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.UpdateUserStatusRequest;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.UserSummary;
import io.github.paulushcgcj.roadtoarch.spat.utils.TenantIsolationUtil;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Orchestrates user management operations by combining Keycloak admin API calls
 * with tenant-isolation enforcement.
 *
 * <p>Tenant isolation is enforced at the Keycloak query level: the
 * {@code getUsers} call filters by {@code tenant_id} attribute, so callers
 * only see users belonging to their own tenant. Mutating operations additionally
 * verify that the target user's tenant matches the caller's JWT tenant.
 */
@Service
public class UserService {

	private static final Set<String> ALLOWED_ROLES = Set.of("ADMIN", "VIEWER", "AUDITOR", "SUBMITTER");

	private static final int USER_SEARCH_MAX = 1000;

	private final KeycloakAdminClient keycloakAdminClient;

	public UserService(KeycloakAdminClient keycloakAdminClient) {
		this.keycloakAdminClient = Objects.requireNonNull(keycloakAdminClient);
	}

	/**
	 * Returns a paginated list of user summaries for the given tenant.
	 *
	 * <p>For each user returned by Keycloak, the service fetches realm-level
	 * role mappings and extracts the role names.
	 *
	 * @param tenantId tenant identifier to filter users by
	 * @param page     zero-based page index
	 * @param size     maximum number of users per page
	 * @return paginated user summaries (never {@code null})
	 */
	public Page<UserSummary> listUsers(String tenantId, int page, int size) {
		int offset = page * size;
		List<KeycloakUser> keycloakUsers = keycloakAdminClient.getUsers(tenantId, offset, size);

		// TODO: N+1 role-mapping calls — acceptable for dozens of users per tenant;
		//  consider a batched endpoint or composite projection if tenant sizes grow.
		List<UserSummary> summaries = keycloakUsers.stream()
			.map(this::toUserSummary)
			.toList();

		PageRequest pageable = PageRequest.of(page, size);
		return new PageImpl<>(summaries, pageable, summaries.size());
	}

	/**
	 * Invites a new user to the caller's tenant by creating a Keycloak user
	 * and assigning the requested realm-level role.
	 *
	 * <p>The user is created with {@code UPDATE_PASSWORD} as a required action
	 * so they must set a password on first login.
	 *
	 * @param tenantId tenant identifier from the caller's JWT
	 * @param request  invite payload containing email, name, and role
	 * @return the newly created Keycloak user ID
	 * @throws IllegalArgumentException if the requested role is not valid
	 */
	public String inviteUser(String tenantId, InviteUserRequest request) {
		validateRoles(List.of(request.role()));

		KeycloakUserCreate create = KeycloakUserCreate.builder()
			.username(request.email())
			.email(request.email())
			.firstName(request.firstName())
			.lastName(request.lastName())
			.enabled(true)
			.attributes(Map.of("tenant_id", List.of(tenantId)))
			.requiredActions(List.of("UPDATE_PASSWORD"))
			.build();

		String userId = keycloakAdminClient.createUser(create);

		KeycloakRoleMapping matchingRole = findRealmRoleByName(request.role());
		keycloakAdminClient.addUserRoleMappings(userId, List.of(matchingRole));

		return userId;
	}

	/**
	 * Enables or disables a user account after verifying tenant isolation.
	 *
	 * @param jwtTenantId tenant identifier from the caller's JWT
	 * @param userId      Keycloak user ID of the target user
	 * @param request     status update payload
	 * @throws ResponseStatusException   if the user is not found in the caller's tenant
	 * @throws TenantIsolationException  if the target user belongs to a different tenant
	 */
	public void updateUserStatus(String jwtTenantId, String userId, UpdateUserStatusRequest request) {
		KeycloakUser target = findUserInTenant(jwtTenantId, userId);

		KeycloakUser patch = KeycloakUser.builder()
			.enabled(request.enabled())
			.build();
		keycloakAdminClient.updateUser(userId, patch);
	}

	/**
	 * Replaces the realm-level roles of a user with the requested set.
	 *
	 * <p>Roles present in the request but not currently assigned are added;
	 * roles currently assigned but absent from the request are removed.
	 *
	 * @param jwtTenantId tenant identifier from the caller's JWT
	 * @param userId      Keycloak user ID of the target user
	 * @param request     role update payload containing the desired role names
	 * @throws IllegalArgumentException  if any requested role is not valid
	 * @throws ResponseStatusException   if the user is not found in the caller's tenant
	 * @throws TenantIsolationException  if the target user belongs to a different tenant
	 */
	public void updateUserRoles(String jwtTenantId, String userId, UpdateUserRolesRequest request) {
		validateRoles(request.roles());
		findUserInTenant(jwtTenantId, userId);

		Set<String> currentRoles = new HashSet<>(resolveRealmRoles(userId));
		Set<String> desiredRoles = new HashSet<>(request.roles());

		Set<String> toAdd = new HashSet<>(desiredRoles);
		toAdd.removeAll(currentRoles);

		Set<String> toRemove = new HashSet<>(currentRoles);
		toRemove.removeAll(desiredRoles);

		if (!toAdd.isEmpty()) {
			List<KeycloakRoleMapping> addMappings = toAdd.stream()
				.map(this::findRealmRoleByName)
				.toList();
			keycloakAdminClient.addUserRoleMappings(userId, addMappings);
		}

		if (!toRemove.isEmpty()) {
			List<KeycloakRoleMapping> removeMappings = toRemove.stream()
				.map(this::findRealmRoleByName)
				.toList();
			keycloakAdminClient.removeUserRoleMappings(userId, removeMappings);
		}
	}

	private UserSummary toUserSummary(KeycloakUser user) {
		List<String> roles = resolveRealmRoles(user.getId());
		boolean enabled = user.getEnabled() != null && user.getEnabled();
		return new UserSummary(
			user.getId(),
			user.getUsername(),
			user.getFirstName(),
			user.getLastName(),
			user.getEmail(),
			enabled,
			roles);
	}

	private List<String> resolveRealmRoles(String userId) {
		List<KeycloakRoleMapping> mappings = keycloakAdminClient.getUserRoleMappings(userId);
		return mappings.stream()
			.filter(mapping -> !Boolean.TRUE.equals(mapping.getClientRole()))
			.map(KeycloakRoleMapping::getName)
			.toList();
	}

	/**
	 * Fetches a user by ID within the caller's tenant and asserts tenant isolation.
	 *
	 * @throws ResponseStatusException  with {@code 404} if the user is not found
	 * @throws TenantIsolationException if the user belongs to a different tenant
	 */
	private KeycloakUser findUserInTenant(String jwtTenantId, String userId) {
		List<KeycloakUser> users = keycloakAdminClient.getUsers(jwtTenantId, 0, USER_SEARCH_MAX);
		KeycloakUser target = users.stream()
			.filter(user -> userId.equals(user.getId()))
			.findFirst()
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

		String targetTenantId = extractTenantId(target);
		TenantIsolationUtil.assertTenantMatch(jwtTenantId, targetTenantId);
		return target;
	}

	private static String extractTenantId(KeycloakUser user) {
		Map<String, List<String>> attributes = user.getAttributes();
		if (attributes == null) {
			return null;
		}
		List<String> tenantIds = attributes.get("tenant_id");
		return (tenantIds != null && !tenantIds.isEmpty()) ? tenantIds.getFirst() : null;
	}

	private KeycloakRoleMapping findRealmRoleByName(String roleName) {
		return keycloakAdminClient.getAvailableRealmRoles().stream()
			.filter(role -> roleName.equals(role.getName()))
			.findFirst()
			.orElseThrow(() -> new IllegalStateException(
				"Realm role '%s' not found in Keycloak".formatted(roleName)));
	}

	private static void validateRoles(List<String> roles) {
		for (String role : roles) {
			if (!ALLOWED_ROLES.contains(role)) {
				throw new IllegalArgumentException(
					"Invalid role '%s'; allowed roles: %s".formatted(role, ALLOWED_ROLES));
			}
		}
	}
}
