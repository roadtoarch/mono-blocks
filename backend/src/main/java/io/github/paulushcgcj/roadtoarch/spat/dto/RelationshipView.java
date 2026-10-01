package io.github.paulushcgcj.roadtoarch.spat.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/** Read model for a stored relationship, without any client-specific orientation. */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record RelationshipView(
    UUID id,
    UUID sourceId,
    UUID targetId,
    String relationshipType,
    Map<String, Object> attributes,
    Instant createdAt) {}
