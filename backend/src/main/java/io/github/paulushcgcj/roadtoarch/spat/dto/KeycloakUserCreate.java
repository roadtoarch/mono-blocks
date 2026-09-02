package io.github.paulushcgcj.roadtoarch.spat.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Subset of user fields accepted by the Keycloak Admin REST API
 * {@code POST /users} endpoint for creating a new user.
 *
 * <p>Includes optional {@link KeycloakCredential} list so an initial password
 * can be set at creation time.
 */
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class KeycloakUserCreate {

	private String username;

	private String firstName;

	private String lastName;

	private String email;

	private Boolean enabled;

	private Map<String, List<String>> attributes;

	private List<String> requiredActions;

	private List<KeycloakCredential> credentials;
}
