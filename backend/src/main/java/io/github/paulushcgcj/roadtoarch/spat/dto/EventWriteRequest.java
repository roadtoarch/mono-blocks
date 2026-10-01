package io.github.paulushcgcj.roadtoarch.spat.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Write payload for appending an event to the timeline. Events are append-only; there is no update
 * or delete form.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record EventWriteRequest(
    @NotBlank String eventType,
    UUID entityId,
    UUID actorId,
    Map<String, Object> payload,
    Instant occurredAt) {}
