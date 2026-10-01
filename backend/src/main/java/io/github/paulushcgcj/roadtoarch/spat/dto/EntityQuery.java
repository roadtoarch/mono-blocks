package io.github.paulushcgcj.roadtoarch.spat.dto;

/**
 * Immutable bundle of the optional filters accepted by the entity list endpoint.
 *
 * <p>Every component is nullable; a {@code null} or blank value means "do not filter on this",
 * which keeps the controller signature small while the service composes one {@code Specification}
 * per populated filter.
 */
public record EntityQuery(
		String entityType,
		String status,
		String tag,
		String search,
		Double lat,
		Double lng,
		Double radiusKm,
		Double minLat,
		Double minLng,
		Double maxLat,
		Double maxLng) {
}
