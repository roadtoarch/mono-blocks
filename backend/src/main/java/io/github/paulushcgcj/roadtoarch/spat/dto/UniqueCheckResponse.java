package io.github.paulushcgcj.roadtoarch.spat.dto;

/**
 * Response body for the attribute-uniqueness probe exposed by
 * {@code GET /api/entities/check-unique}.
 *
 * @param unique {@code true} when no other entity of the same type uses the value
 */
public record UniqueCheckResponse(boolean unique) {
}
