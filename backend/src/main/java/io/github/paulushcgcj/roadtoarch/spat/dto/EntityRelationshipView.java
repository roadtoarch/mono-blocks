package io.github.paulushcgcj.roadtoarch.spat.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Read model for a relationship as seen from one entity.
 *
 * @param direction {@code outbound} when the queried entity is the source, {@code inbound} when it
 *     is the target
 * @param other the entity on the opposite side of the edge relative to the queried entity
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record EntityRelationshipView(
    UUID id,
    UUID sourceId,
    UUID targetId,
    String relationshipType,
    Map<String, Object> attributes,
    Instant createdAt,
    String direction,
    EntitySummary other) {}
