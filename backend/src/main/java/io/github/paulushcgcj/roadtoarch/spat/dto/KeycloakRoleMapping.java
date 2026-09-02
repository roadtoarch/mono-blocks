package io.github.paulushcgcj.roadtoarch.spat.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Role mapping representation returned by the Keycloak Admin REST API
 * {@code /users/{id}/role-mappings/realm} endpoint.
 *
 * @see <a href="https://www.keycloak.org/docs-api/latest/rest-api/index.html#RoleRepresentation">
 *     Keycloak RoleRepresentation</a>
 */
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class KeycloakRoleMapping {

	private String id;

	private String name;

	private Boolean composite;

	private Boolean clientRole;

	private String containerId;
}
