package io.github.paulushcgcj.roadtoarch.spat.dtos.keycloak;

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
 * Full user representation as returned by the Keycloak Admin REST API.
 *
 * <p>Used for GET responses and PATCH request bodies. Unknown fields are ignored
 * during deserialization for forward compatibility with newer Keycloak versions.
 */
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class KeycloakUser {

	private String id;

	private String username;

	private String firstName;

	private String lastName;

	private String email;

	private Boolean emailVerified;

	private Boolean enabled;

	private Map<String, List<String>> attributes;

	private List<String> requiredActions;

	private List<String> realmRoles;
}
