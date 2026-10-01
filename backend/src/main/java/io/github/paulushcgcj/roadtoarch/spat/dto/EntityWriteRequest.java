package io.github.paulushcgcj.roadtoarch.spat.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Flat write payload for creating, replacing or partially updating an entity.
 *
 * <p>The fixed columns are declared explicitly. Every other top-level JSON property is captured by
 * {@link #putExtra(String, Object)} and merged into the free-form {@code attributes} bag, so a
 * generic client (or a seed script) can post {@code {"entity_type":"customer","name":"Acme",
 * "billing_email":"ops@acme.test"}} without the API knowing what a customer is. Reserved column
 * names are rejected by the service layer.
 */
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class EntityWriteRequest {

  @NotBlank(groups = CreateGroup.class)
  private String entityType;

  @NotBlank(groups = CreateGroup.class)
  private String name;

  private String description;
  private String status;
  private List<String> tags;

  @Valid
  private LocationDto location;

  private UUID parentId;
  private UUID ownerId;
  private Map<String, Object> attributes;

  private final Map<String, Object> extra = new LinkedHashMap<>();

  /** Collects every top-level JSON property that is not a declared fixed column. */
  @JsonAnySetter
  public void putExtra(String key, Object value) {
    extra.put(key, value);
  }
}
