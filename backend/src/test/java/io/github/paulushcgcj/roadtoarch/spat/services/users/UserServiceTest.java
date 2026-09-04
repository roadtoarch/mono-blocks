package io.github.paulushcgcj.roadtoarch.spat.services.users;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import io.github.paulushcgcj.roadtoarch.spat.dtos.keycloak.KeycloakRoleMapping;
import io.github.paulushcgcj.roadtoarch.spat.dtos.keycloak.KeycloakUser;
import io.github.paulushcgcj.roadtoarch.spat.dtos.keycloak.KeycloakUserCreate;
import io.github.paulushcgcj.roadtoarch.spat.exceptions.TenantIsolationException;
import io.github.paulushcgcj.roadtoarch.spat.keycloak.KeycloakAdminClient;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.InviteUserRequest;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.UpdateUserRolesRequest;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.UpdateUserStatusRequest;
import io.github.paulushcgcj.roadtoarch.spat.dtos.users.UserSummary;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

	private static final String TENANT_ID = "tenant-abc";

	@Mock
	private KeycloakAdminClient keycloakAdminClient;

	private UserService userService;

	@BeforeEach
	void setUp() {
		userService = new UserService(keycloakAdminClient);
	}

	// ── listUsers ──────────────────────────────────────────────────────

	@Nested
	class ListUsers {

		@Test
		void emptyResult_returnsEmptyPage() {
			when(keycloakAdminClient.getUsers(TENANT_ID, 0, 20)).thenReturn(List.of());

			Page<UserSummary> result = userService.listUsers(TENANT_ID, 0, 20);

			assertThat(result.getContent()).isEmpty();
			assertThat(result.getTotalElements()).isZero();
			assertThat(result.getNumber()).isZero();
			verify(keycloakAdminClient).getUsers(TENANT_ID, 0, 20);
		}

		@Test
		void computesOffsetFromPageAndSize() {
			when(keycloakAdminClient.getUsers(TENANT_ID, 40, 20)).thenReturn(List.of());

			userService.listUsers(TENANT_ID, 2, 20);

			verify(keycloakAdminClient).getUsers(TENANT_ID, 40, 20);
		}

		@Test
		void mapsKeycloakUserToUserSummary() {
			KeycloakUser user = KeycloakUser.builder()
				.id("user-1")
				.username("jdoe")
				.firstName("John")
				.lastName("Doe")
				.email("jdoe@example.com")
				.enabled(true)
				.attributes(Map.of("tenant_id", List.of(TENANT_ID)))
				.build();

			KeycloakRoleMapping adminRole = KeycloakRoleMapping.builder()
				.id("role-1")
				.name("ADMIN")
				.clientRole(false)
				.build();

			when(keycloakAdminClient.getUsers(eq(TENANT_ID), anyInt(), anyInt()))
				.thenReturn(List.of(user));
			when(keycloakAdminClient.getUserRoleMappings("user-1"))
				.thenReturn(List.of(adminRole));

			Page<UserSummary> result = userService.listUsers(TENANT_ID, 0, 20);

			assertThat(result.getContent()).hasSize(1);
			UserSummary summary = result.getContent().getFirst();
			assertThat(summary.id()).isEqualTo("user-1");
			assertThat(summary.username()).isEqualTo("jdoe");
			assertThat(summary.firstName()).isEqualTo("John");
			assertThat(summary.lastName()).isEqualTo("Doe");
			assertThat(summary.email()).isEqualTo("jdoe@example.com");
			assertThat(summary.enabled()).isTrue();
			assertThat(summary.roles()).containsExactly("ADMIN");
		}

		@Test
		void filtersOutClientRoles() {
			KeycloakUser user = KeycloakUser.builder()
				.id("user-2")
				.username("jsmith")
				.enabled(true)
				.build();

			KeycloakRoleMapping realmRole = KeycloakRoleMapping.builder()
				.name("VIEWER")
				.clientRole(false)
				.build();
			KeycloakRoleMapping clientRole = KeycloakRoleMapping.builder()
				.name("app-admin")
				.clientRole(true)
				.build();

			when(keycloakAdminClient.getUsers(eq(TENANT_ID), anyInt(), anyInt()))
				.thenReturn(List.of(user));
			when(keycloakAdminClient.getUserRoleMappings("user-2"))
				.thenReturn(List.of(realmRole, clientRole));

			Page<UserSummary> result = userService.listUsers(TENANT_ID, 0, 10);

			assertThat(result.getContent().getFirst().roles()).containsExactly("VIEWER");
			verifyNoMoreInteractions(keycloakAdminClient);
		}

		@Test
		void treatsNullEnabledAsDisabled() {
			KeycloakUser user = KeycloakUser.builder()
				.id("user-3")
				.username("noreply")
				.enabled(null)
				.build();

			when(keycloakAdminClient.getUsers(eq(TENANT_ID), anyInt(), anyInt()))
				.thenReturn(List.of(user));
			when(keycloakAdminClient.getUserRoleMappings("user-3"))
				.thenReturn(List.of());

			Page<UserSummary> result = userService.listUsers(TENANT_ID, 0, 10);

			assertThat(result.getContent().getFirst().enabled()).isFalse();
		}
	}

	// ── inviteUser ─────────────────────────────────────────────────────

	@Nested
	class InviteUser {

		@Test
		void createsUserAndAssignsRequestedRole() {
			InviteUserRequest request = new InviteUserRequest(
				"jane@example.com", "Jane", "Doe", "MEMBER");

			KeycloakRoleMapping memberRole = KeycloakRoleMapping.builder()
				.id("role-member")
				.name("MEMBER")
				.clientRole(false)
				.containerId("forest")
				.build();

			when(keycloakAdminClient.createUser(any(KeycloakUserCreate.class)))
				.thenReturn("new-user-id");
			when(keycloakAdminClient.getAvailableRealmRoles())
				.thenReturn(List.of(memberRole));

			String userId = userService.inviteUser(TENANT_ID, request);

			assertThat(userId).isEqualTo("new-user-id");

			ArgumentCaptor<KeycloakUserCreate> createCaptor =
				ArgumentCaptor.forClass(KeycloakUserCreate.class);
			verify(keycloakAdminClient).createUser(createCaptor.capture());
			KeycloakUserCreate captured = createCaptor.getValue();
			assertThat(captured.getUsername()).isEqualTo("jane@example.com");
			assertThat(captured.getEmail()).isEqualTo("jane@example.com");
			assertThat(captured.getFirstName()).isEqualTo("Jane");
			assertThat(captured.getLastName()).isEqualTo("Doe");
			assertThat(captured.getEnabled()).isTrue();
			assertThat(captured.getAttributes()).containsEntry("tenant_id", List.of(TENANT_ID));
			assertThat(captured.getRequiredActions()).containsExactly("UPDATE_PASSWORD");

			verify(keycloakAdminClient).addUserRoleMappings(
				eq("new-user-id"), eq(List.of(memberRole)));
		}

		@Test
		void invalidRole_throwsIllegalArgument() {
			InviteUserRequest request = new InviteUserRequest(
				"user@example.com", "First", "Last", "SUPERADMIN");

			assertThatThrownBy(() -> userService.inviteUser(TENANT_ID, request))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("SUPERADMIN");

			verify(keycloakAdminClient, never()).createUser(any());
		}
	}

	// ── updateUserStatus ───────────────────────────────────────────────

	@Nested
	class UpdateUserStatus {

		@Test
		void patchesEnabledFlag() {
			KeycloakUser target = KeycloakUser.builder()
				.id("target-1")
				.username("victim")
				.enabled(true)
				.attributes(Map.of("tenant_id", List.of(TENANT_ID)))
				.build();

			when(keycloakAdminClient.getUsers(TENANT_ID, 0, 1000))
				.thenReturn(List.of(target));

			UpdateUserStatusRequest request = new UpdateUserStatusRequest(false);
			userService.updateUserStatus(TENANT_ID, "target-1", request);

			ArgumentCaptor<KeycloakUser> patchCaptor = ArgumentCaptor.forClass(KeycloakUser.class);
			verify(keycloakAdminClient).updateUser(eq("target-1"), patchCaptor.capture());
			assertThat(patchCaptor.getValue().getEnabled()).isFalse();
		}

		@Test
		void userNotFound_throwsResponseStatusException() {
			when(keycloakAdminClient.getUsers(TENANT_ID, 0, 1000))
				.thenReturn(List.of());

			UpdateUserStatusRequest request = new UpdateUserStatusRequest(false);

			assertThatThrownBy(() ->
				userService.updateUserStatus(TENANT_ID, "nonexistent", request))
				.isInstanceOf(ResponseStatusException.class);
		}

		@Test
		void crossTenant_throwsTenantIsolationException() {
			KeycloakUser otherTenantUser = KeycloakUser.builder()
				.id("other-tenant-user")
				.username("outsider")
				.attributes(Map.of("tenant_id", List.of("other-tenant")))
				.build();

			when(keycloakAdminClient.getUsers(TENANT_ID, 0, 1000))
				.thenReturn(List.of(otherTenantUser));

			UpdateUserStatusRequest request = new UpdateUserStatusRequest(false);

			assertThatThrownBy(() ->
				userService.updateUserStatus(TENANT_ID, "other-tenant-user", request))
				.isInstanceOf(TenantIsolationException.class);
		}
	}

	// ── updateUserRoles ────────────────────────────────────────────────

	@Nested
	class UpdateUserRoles {

		private final KeycloakRoleMapping adminRole = KeycloakRoleMapping.builder()
			.id("role-admin")
			.name("ADMIN")
			.clientRole(false)
			.containerId("forest")
			.build();

		private final KeycloakRoleMapping memberRole = KeycloakRoleMapping.builder()
			.id("role-member")
			.name("MEMBER")
			.clientRole(false)
			.containerId("forest")
			.build();

		@Test
		void addsAndRemovesRolesDifferentially() {
			KeycloakUser target = KeycloakUser.builder()
				.id("target-1")
				.username("user")
				.attributes(Map.of("tenant_id", List.of(TENANT_ID)))
				.build();

			// User currently has ADMIN
			KeycloakRoleMapping currentAdmin = KeycloakRoleMapping.builder()
				.id("role-admin")
				.name("ADMIN")
				.clientRole(false)
				.build();

			when(keycloakAdminClient.getUsers(TENANT_ID, 0, 1000))
				.thenReturn(List.of(target));
			when(keycloakAdminClient.getUserRoleMappings("target-1"))
				.thenReturn(List.of(currentAdmin));
			when(keycloakAdminClient.getAvailableRealmRoles())
				.thenReturn(List.of(adminRole, memberRole));

			// Desired state: only MEMBER (remove ADMIN, add MEMBER)
			UpdateUserRolesRequest request = new UpdateUserRolesRequest(List.of("MEMBER"));
			userService.updateUserRoles(TENANT_ID, "target-1", request);

			verify(keycloakAdminClient).addUserRoleMappings(
				eq("target-1"), eq(List.of(memberRole)));
			verify(keycloakAdminClient).removeUserRoleMappings(
				eq("target-1"), eq(List.of(adminRole)));
		}

		@Test
		void noChangesWhenRolesAlreadyMatch() {
			KeycloakUser target = KeycloakUser.builder()
				.id("target-1")
				.username("user")
				.attributes(Map.of("tenant_id", List.of(TENANT_ID)))
				.build();

			KeycloakRoleMapping currentMember = KeycloakRoleMapping.builder()
				.id("role-member")
				.name("MEMBER")
				.clientRole(false)
				.build();

			when(keycloakAdminClient.getUsers(TENANT_ID, 0, 1000))
				.thenReturn(List.of(target));
			when(keycloakAdminClient.getUserRoleMappings("target-1"))
				.thenReturn(List.of(currentMember));

			UpdateUserRolesRequest request = new UpdateUserRolesRequest(List.of("MEMBER"));
			userService.updateUserRoles(TENANT_ID, "target-1", request);

			verify(keycloakAdminClient, never()).addUserRoleMappings(any(), any());
			verify(keycloakAdminClient, never()).removeUserRoleMappings(any(), any());
		}

		@Test
		void invalidRole_throwsIllegalArgument() {
			UpdateUserRolesRequest request = new UpdateUserRolesRequest(List.of("SUPERADMIN"));

			assertThatThrownBy(() ->
				userService.updateUserRoles(TENANT_ID, "target-1", request))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("SUPERADMIN");
		}
	}
}
