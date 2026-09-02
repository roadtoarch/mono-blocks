package io.github.paulushcgcj.roadtoarch.spat.keycloak;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import io.github.paulushcgcj.roadtoarch.spat.config.KeycloakAdminProperties;
import io.github.paulushcgcj.roadtoarch.spat.dto.KeycloakRoleMapping;
import io.github.paulushcgcj.roadtoarch.spat.dto.KeycloakUser;
import io.github.paulushcgcj.roadtoarch.spat.dto.KeycloakUserCreate;
import jakarta.annotation.Nullable;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/**
 * HTTP client for the Keycloak Admin REST API.
 *
 * <p>Acquires a service-account access token via the OAuth2 {@code client_credentials}
 * grant, caches the token with a 30-second safety buffer before expiry, and refreshes
 * transparently on expiry or HTTP 401. Uses Spring 6 {@link RestClient} — no additional
 * dependencies required.
 *
 * <p>Methods in this class expose the raw Keycloak HTTP plumbing. Business logic and
 * tenant-isolation checks are layered on top by higher-level services in later slices.
 */
@Slf4j
@Service
@EnableConfigurationProperties(KeycloakAdminProperties.class)
public class KeycloakAdminClient {

	private static final int TOKEN_EXPIRY_BUFFER_SECONDS = 30;

	private final KeycloakAdminProperties properties;

	private final RestClient tokenRestClient;

	private final RestClient adminRestClient;

	private final ObjectMapper objectMapper;

	@Nullable
	private volatile String cachedAccessToken;

	@Nullable
	private volatile Instant tokenExpiry;

	public KeycloakAdminClient(KeycloakAdminProperties properties, ObjectMapper objectMapper) {
		this.properties = Objects.requireNonNull(properties);
		this.objectMapper = Objects.requireNonNull(objectMapper);
		this.tokenRestClient = RestClient.create();
		this.adminRestClient = RestClient.create(properties.authServerUrl());
	}

	// ── User operations ────────────────────────────────────────────────

	/**
	 * Searches for Keycloak users in the configured realm whose {@code tenant_id}
	 * attribute matches the given value.
	 *
	 * @param tenantId tenant identifier to filter by
	 * @param first    zero-based offset of the first result
	 * @param max      maximum number of results to return
	 * @return list of matching users (may be empty, never {@code null})
	 */
	public List<KeycloakUser> getUsers(String tenantId, int first, int max) {
		String response = executeWithTokenRefresh(client -> client.get()
			.uri(uriBuilder -> uriBuilder
				.path("/admin/realms/{realm}/users")
				.queryParam("attribute:tenant_id", tenantId)
				.queryParam("first", first)
				.queryParam("max", max)
				.build(Map.of("realm", properties.realm())))
			.retrieve()
			.body(String.class));
		return deserializeList(response, KeycloakUser.class);
	}

	/**
	 * Creates a new user in the configured realm.
	 *
	 * @param user the user creation payload
	 * @return the newly created user's Keycloak ID, extracted from the {@code Location}
	 *     header of the {@code 201 Created} response
	 */
	public String createUser(KeycloakUserCreate user) {
		ResponseEntity<Void> response = executeWithTokenRefresh(client -> {
			RestClient.ResponseSpec spec = client.post()
				.uri("/admin/realms/{realm}/users", properties.realm())
				.contentType(MediaType.APPLICATION_JSON)
				.body(user)
				.retrieve();
			return spec.toBodilessEntity();
		});
		URI location = response.getHeaders().getLocation();
		return location != null ? extractLastPathSegment(location) : null;
	}

	/**
	 * Partially updates an existing user in the configured realm.
	 *
	 * @param userId Keycloak user ID
	 * @param patch  partial user representation with only the fields to update
	 */
	public void updateUser(String userId, KeycloakUser patch) {
		executeWithTokenRefresh(client -> client.patch()
			.uri("/admin/realms/{realm}/users/{userId}",
				Map.of("realm", properties.realm(), "userId", userId))
			.contentType(MediaType.APPLICATION_JSON)
			.body(patch)
			.retrieve()
			.toBodilessEntity());
	}

	/**
	 * Retrieves the realm-level role mappings for a given user.
	 *
	 * @param userId Keycloak user ID
	 * @return list of realm-level role mappings
	 */
	public List<KeycloakRoleMapping> getUserRoleMappings(String userId) {
		String response = executeWithTokenRefresh(client -> client.get()
			.uri("/admin/realms/{realm}/users/{userId}/role-mappings/realm",
				Map.of("realm", properties.realm(), "userId", userId))
			.retrieve()
			.body(String.class));
		return deserializeList(response, KeycloakRoleMapping.class);
	}

	/**
	 * Adds realm-level role mappings to a user. Note: this is additive — it does
	 * <b>not</b> replace existing mappings.
	 *
	 * @param userId Keycloak user ID
	 * @param roles  role mappings to add
	 */
	public void addUserRoleMappings(String userId, List<KeycloakRoleMapping> roles) {
		executeWithTokenRefresh(client -> client.put()
			.uri("/admin/realms/{realm}/users/{userId}/role-mappings/realm",
				Map.of("realm", properties.realm(), "userId", userId))
			.contentType(MediaType.APPLICATION_JSON)
			.body(roles)
			.retrieve()
			.toBodilessEntity());
	}

	/**
	 * Retrieves all realm-level roles defined in the configured realm.
	 *
	 * @return list of realm roles (may be empty, never {@code null})
	 */
	public List<KeycloakRoleMapping> getAvailableRealmRoles() {
		String response = executeWithTokenRefresh(client -> client.get()
			.uri("/admin/realms/{realm}/roles", Map.of("realm", properties.realm()))
			.retrieve()
			.body(String.class));
		return deserializeList(response, KeycloakRoleMapping.class);
	}

	/**
	 * Removes realm-level role mappings from a user.
	 *
	 * @param userId Keycloak user ID
	 * @param roles  role mappings to remove
	 */
	public void removeUserRoleMappings(String userId, List<KeycloakRoleMapping> roles) {
		executeWithTokenRefresh(client -> client.method(org.springframework.http.HttpMethod.DELETE)
			.uri("/admin/realms/{realm}/users/{userId}/role-mappings/realm",
				Map.of("realm", properties.realm(), "userId", userId))
			.contentType(MediaType.APPLICATION_JSON)
			.body(roles)
			.retrieve()
			.toBodilessEntity());
	}

	// ── Token management ───────────────────────────────────────────────

	/**
	 * Functional interface for a REST call that may need to be retried after a
	 * token refresh.
	 */
	@FunctionalInterface
	private interface RestCall<T> {

		T execute(RestClient client);
	}

	/**
	 * Executes a REST call with the current access token. If the call fails with
	 * HTTP 401 (or the token is already known to be expired), the token is refreshed
	 * and the call is retried exactly once.
	 */
	private <T> T executeWithTokenRefresh(RestCall<T> call) {
		ensureValidToken();
		try {
			return call.execute(adminRestClientWithToken());
		} catch (RestClientResponseException ex) {
			if (ex.getStatusCode().value() == 401) {
				log.debug("Received 401 from Keycloak admin API; refreshing token and retrying");
				forceRefreshToken();
				return call.execute(adminRestClientWithToken());
			}
			throw ex;
		}
	}

	private RestClient adminRestClientWithToken() {
		return adminRestClient.mutate()
			.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + cachedAccessToken)
			.build();
	}

	private void ensureValidToken() {
		if (cachedAccessToken != null && tokenExpiry != null && Instant.now().isBefore(tokenExpiry)) {
			return;
		}
		acquireToken();
	}

	private void forceRefreshToken() {
		cachedAccessToken = null;
		tokenExpiry = null;
		acquireToken();
	}

	private void acquireToken() {
		MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
		formData.add("grant_type", "client_credentials");
		formData.add("client_id", properties.clientId());
		formData.add("client_secret", properties.clientSecret());

		String tokenEndpoint = "%s/realms/%s/protocol/openid-connect/token".formatted(
			properties.authServerUrl(), properties.realm());

		log.debug("Acquiring service-account token from {}", tokenEndpoint);

		String responseBody = tokenRestClient.post()
			.uri(tokenEndpoint)
			.contentType(MediaType.APPLICATION_FORM_URLENCODED)
			.body(formData)
			.retrieve()
			.body(String.class);

		parseTokenResponse(Objects.requireNonNull(responseBody));
	}

	private void parseTokenResponse(String responseBody) {
		try {
			JsonNode json = objectMapper.readTree(responseBody);
			cachedAccessToken = json.get("access_token").asText();
			int expiresIn = json.get("expires_in").asInt();
			tokenExpiry = Instant.now().plusSeconds(expiresIn - TOKEN_EXPIRY_BUFFER_SECONDS);
			log.debug("Service-account token acquired; expires in {}s", expiresIn);
		} catch (Exception ex) {
			throw new IllegalStateException("Failed to parse Keycloak token response", ex);
		}
	}

	private static String extractLastPathSegment(URI uri) {
		String path = uri.getPath();
		int lastSlash = path.lastIndexOf('/');
		return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
	}

	private <T> List<T> deserializeList(@Nullable String json, Class<T> elementType) {
		if (json == null || json.isBlank()) {
			return List.of();
		}
		try {
			var listType = objectMapper.getTypeFactory().constructCollectionType(List.class, elementType);
			return objectMapper.readValue(json, listType);
		} catch (Exception ex) {
			throw new IllegalStateException("Failed to deserialize Keycloak response", ex);
		}
	}
}
