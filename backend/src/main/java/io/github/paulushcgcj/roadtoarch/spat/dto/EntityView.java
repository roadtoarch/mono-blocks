package io.github.paulushcgcj.roadtoarch.spat.dto;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Read model for a single entity.
 *
 * <p>The fixed columns are declared; the {@code attributes} bag is additionally flattened onto the
 * top level so generic clients can read domain fields (for example {@code billing_email}) directly.
 * Keys that collide with a reserved column name are only exposed inside the nested
 * {@code attributes} object to keep the JSON unambiguous.
 */
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class EntityView {

  private UUID id;
  private String entityType;
  private UUID parentId;
  private UUID ownerId;
  private String name;
  private String description;
  private String status;
  private List<String> tags;
  private LocationDto location;
  private Map<String, Object> attributes;
  private Instant createdAt;
  private Instant updatedAt;

  @Getter(AccessLevel.NONE)
  private final Map<String, Object> flattened = new LinkedHashMap<>();

  @JsonAnyGetter
  public Map<String, Object> getFlattened() {
    return flattened;
  }
}
