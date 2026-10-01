package io.github.paulushcgcj.roadtoarch.spat.api;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class EntityApiIntegrationTest extends AbstractApiIntegrationTest {

  @Test
  void createThenGetReturnsFlattenedAttributes() throws Exception {
    String id = createEntity("customer", "Acme Corp",
        Map.of("billing_email", "acme@test.io", "tier", "premium"),
        Map.of("status", "active", "tags", List.of("vip")));

    mockMvc.perform(get("/api/entities/{id}", id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.id", is(id)))
        .andExpect(jsonPath("$.entity_type", is("customer")))
        .andExpect(jsonPath("$.billing_email", is("acme@test.io")))
        .andExpect(jsonPath("$.attributes.tier", is("premium")))
        .andExpect(jsonPath("$.children.content").isArray());
  }

  @Test
  void parentDetailListsChildren() throws Exception {
    String parent = createEntity("site", "Main Site", Map.of("city", "Vancouver"), Map.of());
    createEntity("equipment", "HVAC One", Map.of("serial_number", "SN-1"),
        Map.of("parent_id", parent));

    mockMvc.perform(get("/api/entities/{id}", parent))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.children.content.length()", is(1)))
        .andExpect(jsonPath("$.children.content[0].name", is("HVAC One")));
  }

  @Test
  void listFiltersNarrowResults() throws Exception {
    createEntity("customer", "Acme Corp", Map.of("billing_email", "a@acme.test"),
        Map.of("status", "active", "tags", List.of("vip")));
    createEntity("customer", "Beta LLC", Map.of("billing_email", "b@beta.test"),
        Map.of("status", "inactive", "tags", List.of("trial")));

    mockMvc.perform(get("/api/entities").param("entity_type", "customer"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()", is(2)));

    mockMvc.perform(get("/api/entities").param("entity_type", "customer").param("status", "active"))
        .andExpect(jsonPath("$.content.length()", is(1)))
        .andExpect(jsonPath("$.content[0].name", is("Acme Corp")));

    mockMvc.perform(get("/api/entities").param("entity_type", "customer").param("tag", "trial"))
        .andExpect(jsonPath("$.content.length()", is(1)))
        .andExpect(jsonPath("$.content[0].name", is("Beta LLC")));

    mockMvc.perform(get("/api/entities").param("entity_type", "customer").param("search", "Acme"))
        .andExpect(jsonPath("$.content.length()", is(1)));
  }

  @Test
  void geoRadiusFiltersByDistance() throws Exception {
    createEntity("site", "Near Site", Map.of("city", "Vancouver"),
        Map.of("location", Map.of("lat", 49.28, "lng", -123.12)));
    createEntity("site", "Far Site", Map.of("city", "Calgary"),
        Map.of("location", Map.of("lat", 51.05, "lng", -114.07)));

    mockMvc.perform(get("/api/entities")
            .param("entity_type", "site")
            .param("lat", "49.28").param("lng", "-123.12").param("radius_km", "25"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content.length()", is(1)))
        .andExpect(jsonPath("$.content[0].name", is("Near Site")));
  }

  @Test
  void patchKeepsNameAndPutReplaces() throws Exception {
    String id = createEntity("customer", "Original Name", Map.of("billing_email", "orig@test.io"),
        Map.of("status", "active"));

    mockMvc.perform(patch("/api/entities/{id}", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("status", "archived"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name", is("Original Name")))
        .andExpect(jsonPath("$.status", is("archived")));

    mockMvc.perform(put("/api/entities/{id}", id)
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("entity_type", "customer", "name", "Renamed", "status", "active"))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name", is("Renamed")))
        .andExpect(jsonPath("$.status", is("active")));
  }

  @Test
  void deleteThenGetReturns404() throws Exception {
    String id = createEntity("customer", "Temp", Map.of("billing_email", "temp@test.io"), Map.of());

    mockMvc.perform(delete("/api/entities/{id}", id)).andExpect(status().isNoContent());
    mockMvc.perform(get("/api/entities/{id}", id)).andExpect(status().isNotFound());
  }

  @Test
  void missingNameReturnsValidationError() throws Exception {
    mockMvc.perform(post("/api/entities")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("entity_type", "customer"))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.name").exists());
  }

  @Test
  void reservedAttributeKeyReturnsBadRequest() throws Exception {
    mockMvc.perform(post("/api/entities")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("entity_type", "customer", "name", "Reserved",
                "attributes", Map.of("name", "shadow")))))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.errors.attributes").exists());
  }

  @Test
  void duplicateUniqueAttributeReturnsConflict() throws Exception {
    createEntity("customer", "First", Map.of("billing_email", "dup@test.io"), Map.of());

    mockMvc.perform(post("/api/entities")
            .contentType(MediaType.APPLICATION_JSON)
            .content(body(Map.of("entity_type", "customer", "name", "Second",
                "attributes", Map.of("billing_email", "dup@test.io")))))
        .andExpect(status().isConflict());
  }

  @Test
  void checkUniqueReflectsStoredValue() throws Exception {
    mockMvc.perform(get("/api/entities/check-unique")
            .param("entity_type", "customer").param("key", "billing_email").param("value", "cq@test.io"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unique", is(true)));

    createEntity("customer", "Existing", Map.of("billing_email", "cq@test.io"), Map.of());

    mockMvc.perform(get("/api/entities/check-unique")
            .param("entity_type", "customer").param("key", "billing_email").param("value", "cq@test.io"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.unique", is(false)));
  }

  @Test
  void typesEndpointListsSeenTypes() throws Exception {
    createEntity("customer", "Type Probe", Map.of("billing_email", "types@test.io"), Map.of());

    mockMvc.perform(get("/api/entities/types"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$", hasItem("customer")));
  }

  @Test
  void unknownIdReturns404() throws Exception {
    mockMvc.perform(get("/api/entities/{id}", UUID.randomUUID()))
        .andExpect(status().isNotFound());
  }
}
