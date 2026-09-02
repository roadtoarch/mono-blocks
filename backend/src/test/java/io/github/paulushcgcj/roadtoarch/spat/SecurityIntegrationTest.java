package io.github.paulushcgcj.roadtoarch.spat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
