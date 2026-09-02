package io.github.paulushcgcj.roadtoarch.spat.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Credential representation for the Keycloak Admin REST API.
 *
 * @see <a href="https://www.keycloak.org/docs-api/latest/rest-api/index.html#CredentialRepresentation">
 *     Keycloak CredentialRepresentation</a>
 */
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class KeycloakCredential {

	private String type;

	private String value;

	private Boolean temporary;
}
