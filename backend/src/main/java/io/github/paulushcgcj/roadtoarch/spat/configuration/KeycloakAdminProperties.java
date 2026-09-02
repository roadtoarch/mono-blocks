package io.github.paulushcgcj.roadtoarch.spat.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Bindable configuration properties for the Keycloak Admin REST API client.
 *
 * <p>Bound from {@code io.github.paulushcgcj.spat.keycloak.admin.*} in
 * {@code application.yml}. The {@code clientSecret} should be supplied via an
 * environment variable in production; the default {@code changeme} value matches
 * the secret configured in the development {@code realm-forest.json}.
 *
 * @param realm         Keycloak realm name (e.g. {@code forest})
 * @param clientId      confidential client ID with service-account enabled
 * @param clientSecret  client secret for the service-account token exchange
 * @param authServerUrl base URL of the Keycloak server (e.g. {@code http://localhost:8081})
 */
@ConfigurationProperties(prefix = "io.github.paulushcgcj.spat.keycloak.admin")
public record KeycloakAdminProperties(
		String realm,
		String clientId,
		String clientSecret,
		String authServerUrl) {}
