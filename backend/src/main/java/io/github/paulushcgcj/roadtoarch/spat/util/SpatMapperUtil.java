package io.github.paulushcgcj.roadtoarch.spat.util;

import io.github.paulushcgcj.roadtoarch.spat.dto.EntityWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.dto.LocationDto;
import io.github.paulushcgcj.roadtoarch.spat.exception.ApiException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;

/** Shared, static helpers referenced by MapStruct mappers via {@code @Mapper(uses = …)}. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class SpatMapperUtil {

  private static final GeometryFactory GEOMETRY_FACTORY =
      new GeometryFactory(new PrecisionModel(), 4326);

  private static final Set<String> RESERVED_ATTRIBUTE_KEYS =
      Set.of(
          "id",
          "entity_type",
          "parent_id",
          "owner_id",
          "name",
          "description",
          "status",
          "tags",
          "location",
          "attributes",
          "search",
          "created_at",
          "updated_at",
          "children");

  /** Null-safe trim (package-private so MapStruct doesn't discover it via uses=). */
  public static String trim(String value) {
    return value == null ? null : value.trim();
  }

  /** Present → trimmed; absent → {@code "active"} (not exposed to MapStruct). */
  public static String normalizeStatus(String status) {
    return isPresent(status) ? status.trim() : "active";
  }

  // Make these intentionally NOT public so MapStruct does not pick them up as potential
  // qualifiers during auto-mapping discovery. They are only called via @Mapping expressions.
  // (In Java, package-private = no access modifier.)

  /** Null → empty array; otherwise → list-to-array. */
  public static String[] normalizeTags(List<String> tags) {
    if (tags == null || tags.isEmpty()) {
      return new String[0];
    }
    return tags.toArray(new String[0]);
  }

  /** Merge {@code attributes} and {@code extra}, reject reserved keys, never return null. */
  public static Map<String, Object> mergeAttributes(EntityWriteRequest request) {
    Map<String, Object> merged = new LinkedHashMap<>();
    if (request.getAttributes() != null && !request.getAttributes().isEmpty()) {
      merged.putAll(request.getAttributes());
    }
    if (request.getExtra() != null && !request.getExtra().isEmpty()) {
      merged.putAll(request.getExtra());
    }
    rejectReservedAttributeKeys(merged);
    return merged;
  }

  /** Returns {@code true} if *key* does NOT shadow a reserved column name. */
  public static boolean flattenEnabled(String key) {
    return !RESERVED_ATTRIBUTE_KEYS.contains(key.toLowerCase(Locale.ROOT));
  }

  /** Create a WGS-84 point from a lat/lng DTO. */
  public static Point createPoint(LocationDto loc) {
    if (loc == null || loc.lat() == null || loc.lng() == null) {
      return null;
    }
    return GEOMETRY_FACTORY.createPoint(new Coordinate(loc.lng(), loc.lat()));
  }

  /** Create a lat/lng DTO from a JTS point. */
  public static LocationDto createLocationDto(Point point) {
    if (point == null) {
      return null;
    }
    return new LocationDto(point.getY(), point.getX());
  }

  private static void rejectReservedAttributeKeys(Map<String, Object> attributes) {
    if (attributes.isEmpty()) {
      return;
    }
    Map<String, Object> offenders = new LinkedHashMap<>();
    for (String key : attributes.keySet()) {
      if (RESERVED_ATTRIBUTE_KEYS.contains(key.toLowerCase(Locale.ROOT))) {
        offenders.put(key, "Reserved column name; use the dedicated field or the nested attributes object.");
      }
    }
    if (!offenders.isEmpty()) {
      throw ApiException.badRequest(
          "One or more attribute keys shadow a reserved column name.",
          Map.of("attributes", offenders));
    }
  }

  private static boolean isPresent(String value) {
    return value != null && !value.isBlank();
  }
}
