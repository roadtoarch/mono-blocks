package io.github.paulushcgcj.roadtoarch.spat.api;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class RelationshipApiIntegrationTest extends AbstractApiIntegrationTest {

  @Test
  void createAndListShowsDirectionAndOther() throws Exception {
    String alpha = createEntity("customer", "Alpha", Map.of("billing_email", "alpha@rel.test"), Map.of());
    String beta = createEntity("site", "Beta Site", Map.of("city", "Victoria"), Map.of());

    MvcResult created = mockMvc.perform(post("/api/relationships")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("source_id", alpha, "target_id", beta, "relationship_type", "owns"))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.source_id", is(alpha)))
        .andExpect(jsonPath("$.relationship_type", is("owns")))
        .andReturn();
    String relId = parse(created).get("id").asText();

    mockMvc.perform(get("/api/entities/{id}/relationships", alpha))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()", is(1)))
        .andExpect(jsonPath("$.content[0].direction", is("outbound")))
        .andExpect(jsonPath("$.content[0].other.name", is("Beta Site")));

    mockMvc.perform(get("/api/entities/{id}/relationships", beta))
        .andExpect(jsonPath("$.content[0].direction", is("inbound")))
        .andExpect(jsonPath("$.content[0].other.name", is("Alpha")));

    mockMvc.perform(delete("/api/relationships/{id}", relId)).andExpect(status().isNoContent());
    mockMvc.perform(get("/api/entities/{id}/relationships", alpha))
        .andExpect(jsonPath("$.content.length()", is(0)));
  }

  @Test
  void duplicateRelationshipReturnsConflict() throws Exception {
    String a = createEntity("customer", "D One", Map.of("billing_email", "d1@rel.test"), Map.of());
    String b = createEntity("customer", "D Two", Map.of("billing_email", "d2@rel.test"), Map.of());

    mockMvc.perform(post("/api/relationships")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("source_id", a, "target_id", b, "relationship_type", "linked_to"))))
        .andExpect(status().isCreated());

    mockMvc.perform(post("/api/relationships")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("source_id", a, "target_id", b, "relationship_type", "linked_to"))))
        .andExpect(status().isConflict());
  }

  @Test
  void selfRelationshipReturnsBadRequest() throws Exception {
    String a = createEntity("customer", "Self Ref", Map.of("billing_email", "self@rel.test"), Map.of());

    mockMvc.perform(post("/api/relationships")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("source_id", a, "target_id", a, "relationship_type", "self"))))
        .andExpect(status().isBadRequest());
  }
}
