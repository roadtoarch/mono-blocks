package io.github.paulushcgcj.roadtoarch.spat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Write payload for creating a typed edge between two entities. Relationships are append-only in
 * this API; there is no partial-update form.
 */
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public record RelationshipWriteRequest(
    @NotNull UUID sourceId,
    @NotNull UUID targetId,
    @NotBlank String relationshipType,
    Map<String, Object> attributes) {}
