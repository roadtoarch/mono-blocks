package io.github.paulushcgcj.roadtoarch.spat.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.github.paulushcgcj.roadtoarch.spat.extensions.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Shared harness for the generic core REST API integration tests. Boots the full
 * application against a PostGIS Testcontainer and exposes MockMvc plus small JSON helpers.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
abstract class AbstractApiIntegrationTest {

	@Autowired
	protected MockMvc mockMvc;

	@Autowired
	protected ObjectMapper objectMapper;

	protected JsonNode parse(MvcResult result) throws Exception {
		String content = result.getResponse().getContentAsString(StandardCharsets.UTF_8);
		return content.isBlank() ? null : objectMapper.readTree(content);
	}

	protected String body(Object value) {
		return objectMapper.writeValueAsString(value);
	}

	protected JsonNode postJson(String url, Object payload) throws Exception {
		MvcResult result = mockMvc.perform(post(url)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body(payload)))
			.andReturn();
		return parse(result);
	}

	protected String createEntity(String type, String name, Map<String, Object> attributes,
			Map<String, Object> extra) throws Exception {
		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("entity_type", type);
		payload.put("name", name);
		if (attributes != null) {
			payload.put("attributes", attributes);
		}
		if (extra != null) {
			payload.putAll(extra);
		}
		MvcResult result = mockMvc.perform(post("/api/entities")
				.contentType(MediaType.APPLICATION_JSON)
				.content(body(payload)))
			.andExpect(status().isCreated())
			.andReturn();
		return parse(result).get("id").asText();
	}
}
