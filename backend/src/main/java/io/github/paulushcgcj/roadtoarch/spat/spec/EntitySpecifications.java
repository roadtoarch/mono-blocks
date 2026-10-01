package io.github.paulushcgcj.roadtoarch.spat.spec;

import io.github.paulushcgcj.roadtoarch.spat.domain.EntityRecord;
import org.springframework.data.jpa.domain.Specification;

/**
 * Composable {@link Specification}s for the generic entity list endpoint.
 *
 * <p>Text search, tag containment and the geospatial predicates are expressed through the
 * PostgreSQL helper functions created in {@code V1__generic_core.sql}, so the generated
 * {@code search} tsvector, the GIN indexes and the GIST index on {@code location} do the work
 * instead of {@code LIKE} scans. Every predicate is domain-agnostic: it only ever refers to
 * {@code entity_type} / {@code status} / {@code tag} strings supplied by the caller.
 */
public final class EntitySpecifications {

	private EntitySpecifications() {
	}

	/**
	 * Filters on the exact {@code entity_type} value.
	 *
	 * @param entityType value to match; blank or {@code null} disables the filter
	 * @return a specification that is a no-op when {@code entityType} is blank
	 */
	public static Specification<EntityRecord> entityType(String entityType) {
		return (root, query, cb) -> isBlank(entityType)
				? cb.conjunction()
				: cb.equal(root.get("entityType"), entityType);
	}

	/**
	 * Filters on the exact {@code status} value.
	 *
	 * @param status value to match; blank or {@code null} disables the filter
	 * @return a specification that is a no-op when {@code status} is blank
	 */
	public static Specification<EntityRecord> status(String status) {
		return (root, query, cb) -> isBlank(status)
				? cb.conjunction()
				: cb.equal(root.get("status"), status);
	}

	/**
	 * Full-text search over the stored {@code search} tsvector column via {@code fts_match}.
	 *
	 * @param term free-text query; blank or {@code null} disables the filter
	 * @return a specification that is a no-op when {@code term} is blank
	 */
	public static Specification<EntityRecord> textSearch(String term) {
		return (root, query, cb) -> isBlank(term)
				? cb.conjunction()
				: cb.isTrue(cb.function("fts_match", Boolean.class, root.get("id"), cb.literal(term)));
	}

	/**
	 * Filters to entities whose {@code tags} array contains the given tag via {@code tags_contains}.
	 *
	 * @param tag tag to look for; blank or {@code null} disables the filter
	 * @return a specification that is a no-op when {@code tag} is blank
	 */
	public static Specification<EntityRecord> hasTag(String tag) {
		return (root, query, cb) -> isBlank(tag)
				? cb.conjunction()
				: cb.isTrue(cb.function("tags_contains", Boolean.class, root.get("id"), cb.literal(tag)));
	}

	/**
	 * Filters to entities within {@code radiusKm} of a point via {@code geo_within_radius}.
	 *
	 * <p>The filter only applies when all three coordinates are present; a partial triple is
	 * treated as "no geo filter" so the client can send the three inputs independently.
	 *
	 * @param lat latitude in WGS-84 degrees
	 * @param lng longitude in WGS-84 degrees
	 * @param radiusKm radius in kilometres
	 * @return a specification that is a no-op unless all three arguments are non-null
	 */
	public static Specification<EntityRecord> withinRadius(Double lat, Double lng, Double radiusKm) {
		return (root, query, cb) -> (lat == null || lng == null || radiusKm == null)
				? cb.conjunction()
				: cb.isTrue(cb.function("geo_within_radius", Boolean.class, root.get("id"),
						cb.literal(lat), cb.literal(lng), cb.literal(radiusKm)));
	}

	/**
	 * Filters to entities inside a bounding box via {@code geo_within_bbox}.
	 *
	 * @param minLat southern bound in WGS-84 degrees
	 * @param minLng western bound in WGS-84 degrees
	 * @param maxLat northern bound in WGS-84 degrees
	 * @param maxLng eastern bound in WGS-84 degrees
	 * @return a specification that is a no-op unless all four arguments are non-null
	 */
	public static Specification<EntityRecord> withinBoundingBox(
			Double minLat, Double minLng, Double maxLat, Double maxLng) {
		return (root, query, cb) -> (minLat == null || minLng == null || maxLat == null || maxLng == null)
				? cb.conjunction()
				: cb.isTrue(cb.function("geo_within_bbox", Boolean.class, root.get("id"),
						cb.literal(minLat), cb.literal(minLng), cb.literal(maxLat), cb.literal(maxLng)));
	}

	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}
}