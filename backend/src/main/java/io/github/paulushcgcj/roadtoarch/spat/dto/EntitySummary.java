package io.github.paulushcgcj.roadtoarch.spat.dto;

import java.util.UUID;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Lightweight reference to an entity, used for children lists and for the "far side" of a
 * relationship.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record EntitySummary(UUID id, String entityType, String name, String status) {}
