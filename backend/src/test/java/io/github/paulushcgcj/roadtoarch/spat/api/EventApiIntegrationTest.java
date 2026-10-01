package io.github.paulushcgcj.roadtoarch.spat.api;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class EventApiIntegrationTest extends AbstractApiIntegrationTest {

  @Test
  void eventsAreListedNewestFirstAndCarryEntityType() throws Exception {
    String id = createEntity("customer", "Evented", Map.of("billing_email", "ev@test.io"), Map.of());

    postEvent(id, "note_added", "2024-01-01T00:00:00Z");
    postEvent(id, "status_changed", "2025-01-01T00:00:00Z");
    postEvent(id, "created", "2026-01-01T00:00:00Z");

    mockMvc.perform(get("/api/entities/{id}/events", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()", is(3)))
        .andExpect(jsonPath("$.content[0].event_type", is("created")))
        .andExpect(jsonPath("$.content[0].entity_type", is("customer")))
        .andExpect(jsonPath("$.content[2].event_type", is("note_added")));
  }

  @Test
  void globalFeedFiltersByEntityTypeAndEventType() throws Exception {
    String id = createEntity("customer", "Feed", Map.of("billing_email", "feed@test.io"), Map.of());

    postEvent(id, "created", "2026-01-01T00:00:00Z");
    postEvent(id, "note_added", "2026-02-01T00:00:00Z");

    mockMvc.perform(get("/api/events").param("entity_type", "customer"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()", is(2)));

    mockMvc.perform(get("/api/events").param("event_type", "note_added"))
        .andExpect(jsonPath("$.content.length()", is(1)))
        .andExpect(jsonPath("$.content[0].entity_id", is(id)));
  }

  @Test
  void eventsAreAppendOnly() throws Exception {
    mockMvc.perform(put("/api/events")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isMethodNotAllowed());

    mockMvc.perform(delete("/api/events"))
        .andExpect(status().isMethodNotAllowed());
  }

  private void postEvent(String entityId, String eventType, String occurredAt) throws Exception {
    mockMvc.perform(post("/api/events")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of(
                "entity_id", entityId,
                "event_type", eventType,
                "occurred_at", occurredAt))))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.entity_type", is("customer")));
  }
}
