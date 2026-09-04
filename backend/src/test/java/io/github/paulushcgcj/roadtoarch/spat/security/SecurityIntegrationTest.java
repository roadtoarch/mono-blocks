package io.github.paulushcgcj.roadtoarch.spat.security;

import io.github.paulushcgcj.roadtoarch.spat.extensions.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void protectedEndpoint_withoutAuthorization_returns401() throws Exception {
		mockMvc.perform(get("/api/me"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void protectedEndpoint_withMockJwt_returns200AndResolvesTenant() throws Exception {
		mockMvc.perform(get("/api/me")
				.with(jwt().jwt(j -> j
					.claim("tenant_id", "test-tenant-123")
					.claim("preferred_username", "testuser")
					.claim("email", "test@example.com"))))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.tenant_id").value("test-tenant-123"))
			.andExpect(jsonPath("$.username").value("testuser"))
			.andExpect(jsonPath("$.email").value("test@example.com"));
	}

	@Test
	void protectedEndpoint_withBearerTokenMissingTenantId_returns401() throws Exception {
		mockMvc.perform(get("/api/me")
				.header("Authorization", "Bearer any-token-value"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void usersEndpoint_withoutAuthorization_returns401() throws Exception {
		mockMvc.perform(get("/api/users"))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void adminEndpoint_withNonAdminRole_returns403() throws Exception {
		mockMvc.perform(post("/api/users/invite")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"email":"new@example.test","firstName":"New","lastName":"User","role":"VIEWER"}
					""")
				.with(jwt().authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_VIEWER"))
					.jwt(j -> j.claim("tenant_id", "1"))))
			.andExpect(status().isForbidden());
	}

	@Test
	void adminEndpoint_withoutAuthorization_returns401() throws Exception {
		mockMvc.perform(post("/api/users/invite")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"email":"new@example.test","firstName":"New","lastName":"User","role":"VIEWER"}
					"""))
			.andExpect(status().isUnauthorized());
	}

	@Test
	void adminPatchStatusEndpoint_withNonAdminRole_returns403() throws Exception {
		mockMvc.perform(patch("/api/users/some-user-id/status")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
					{"enabled":false}
					""")
				.with(jwt().authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_VIEWER"))
					.jwt(j -> j.claim("tenant_id", "1"))))
			.andExpect(status().isForbidden());
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class MockJwtDecoderConfig {

		@Bean
		JwtDecoder jwtDecoder() {
			return token -> Jwt.withTokenValue(token)
				.header("alg", "none")
				.claim("sub", "mock-sub")
				.build();
		}
	}
}
