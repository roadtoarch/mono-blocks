package io.github.paulushcgcj.roadtoarch.spat.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Read model for an event.
 *
 * @param entityType the {@code entity_type} of the related entity, resolved for activity-feed
 *     rendering; {@code null} when the event is not attached to any entity
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record EventView(
    Long id,
    UUID entityId,
    String entityType,
    UUID actorId,
    String eventType,
    Map<String, Object> payload,
    Instant occurredAt) {}
