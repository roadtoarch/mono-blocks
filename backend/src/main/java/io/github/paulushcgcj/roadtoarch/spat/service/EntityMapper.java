package io.github.paulushcgcj.roadtoarch.spat.service;

import io.github.paulushcgcj.roadtoarch.spat.domain.EntityRecord;
import io.github.paulushcgcj.roadtoarch.spat.domain.Event;
import io.github.paulushcgcj.roadtoarch.spat.domain.Relationship;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityDetailView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityRelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntitySummary;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.dto.EventView;
import io.github.paulushcgcj.roadtoarch.spat.dto.LocationDto;
import io.github.paulushcgcj.roadtoarch.spat.dto.RelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.web.ApiException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

/**
 * Translates between the generic persistence model and the wire DTOs.
 *
 * <p>Keeps the domain-agnostic promise: the mapper only knows about the fixed columns and the
 * free-form {@code attributes} bag, never about any particular {@code entity_type}.
 */
@Component
public class EntityMapper {

  private static final GeometryFactory GEOMETRY_FACTORY =
      new GeometryFactory(new PrecisionModel(), 4326);

  /**
   * Column (and structural) names a free-form attribute key may not shadow, so the flattened
   * response stays unambiguous. Comparison is case-insensitive.
   */
  private static final Set<String> RESERVED_ATTRIBUTE_KEYS =
      Set.of(
          "id", "entity_type", "parent_id", "owner_id", "name", "description", "status", "tags",
          "location", "attributes", "search", "created_at", "updated_at", "children");

  /** Builds a new entity from a create payload. */
  public EntityRecord newEntity(EntityWriteRequest request) {
    EntityRecord entity = new EntityRecord();
    entity.setEntityType(request.getEntityType().trim());
    entity.setName(request.getName().trim());
    entity.setDescription(request.getDescription());
    entity.setStatus(normalizeStatus(request.getStatus()));
    entity.setTags(normalizeTags(request.getTags()));
    entity.setLocation(toPoint(request.getLocation()));
    entity.setParentId(request.getParentId());
    entity.setOwnerId(request.getOwnerId());
    entity.setAttributes(mergeAttributes(request));
    return entity;
  }

  /** Applies a full replacement (PUT) onto an existing entity. */
  public void applyReplace(EntityRecord entity, EntityWriteRequest request) {
    entity.setEntityType(request.getEntityType().trim());
    entity.setName(request.getName().trim());
    entity.setDescription(request.getDescription());
    entity.setStatus(normalizeStatus(request.getStatus()));
    entity.setTags(normalizeTags(request.getTags()));
    entity.setLocation(toPoint(request.getLocation()));
    entity.setParentId(request.getParentId());
    entity.setOwnerId(request.getOwnerId());
    entity.setAttributes(mergeAttributes(request));
  }

  /**
   * Applies a partial update (PATCH) onto an existing entity.
   *
   * <p>Fields absent from the payload are left untouched; {@code attributes} entries are merged
   * rather than replaced, so a client can patch a single key without resending the whole bag.
   */
  public void applyPatch(EntityRecord entity, EntityWriteRequest request) {
    if (isPresent(request.getEntityType())) {
      entity.setEntityType(request.getEntityType().trim());
    }
    if (isPresent(request.getName())) {
      entity.setName(request.getName().trim());
    }
    if (request.getDescription() != null) {
      entity.setDescription(request.getDescription());
    }
    if (isPresent(request.getStatus())) {
      entity.setStatus(normalizeStatus(request.getStatus()));
    }
    if (request.getTags() != null) {
      entity.setTags(normalizeTags(request.getTags()));
    }
    if (request.getLocation() != null) {
      entity.setLocation(toPoint(request.getLocation()));
    }
    if (request.getParentId() != null) {
      entity.setParentId(request.getParentId());
    }
    if (request.getOwnerId() != null) {
      entity.setOwnerId(request.getOwnerId());
    }
    Map<String, Object> merged = mergeAttributes(request);
    if (!merged.isEmpty()) {
      entity.getAttributes().putAll(merged);
    }
  }

  /** Projects an entity onto its list/read model, flattening {@code attributes} to the top level. */
  public EntityView toView(EntityRecord entity) {
    EntityView view = new EntityView();
    copyFixedColumns(entity, view);
    view.setAttributes(new LinkedHashMap<>(entity.getAttributes()));
    view.getFlattened().putAll(flattenableAttributes(entity.getAttributes()));
    return view;
  }

  /** Projects an entity plus its paginated direct children. */
  public EntityDetailView toDetailView(EntityRecord entity, Page<EntitySummary> children) {
    EntityDetailView view = new EntityDetailView();
    copyFixedColumns(entity, view);
    view.setAttributes(new LinkedHashMap<>(entity.getAttributes()));
    view.getFlattened().putAll(flattenableAttributes(entity.getAttributes()));
    view.setChildren(children);
    return view;
  }

  /** Lightweight projection used for children, relationship endpoints and pickers. */
  public EntitySummary toSummary(EntityRecord entity) {
    return new EntitySummary(
        entity.getId(), entity.getEntityType(), entity.getName(), entity.getStatus());
  }

  /** Projects a stored relationship without orientation information. */
  public RelationshipView toRelationshipView(Relationship relationship) {
    return new RelationshipView(
        relationship.getId(),
        relationship.getSourceId(),
        relationship.getTargetId(),
        relationship.getRelationshipType(),
        new LinkedHashMap<>(relationship.getAttributes()),
        relationship.getCreatedAt());
  }

  /** Projects a relationship from the perspective of the entity that was queried. */
  public EntityRelationshipView toEntityRelationshipView(
      Relationship relationship, String direction, EntitySummary other) {
    return new EntityRelationshipView(
        relationship.getId(),
        relationship.getSourceId(),
        relationship.getTargetId(),
        relationship.getRelationshipType(),
        new LinkedHashMap<>(relationship.getAttributes()),
        relationship.getCreatedAt(),
        direction,
        other);
  }

  /** Projects a stored event, resolving the related entity's type for feed rendering. */
  public EventView toEventView(Event event, String entityType) {
    return new EventView(
        event.getId(),
        event.getEntityId(),
        entityType,
        event.getActorId(),
        event.getEventType(),
        new LinkedHashMap<>(event.getPayload()),
        event.getOccurredAt());
  }

  /** Converts a JTS point to the plain {@code {lat, lng}} wire shape; {@code null} stays null. */
  public LocationDto toLocation(Point point) {
    if (point == null) {
      return null;
    }
    return new LocationDto(point.getY(), point.getX());
  }

  /** Converts the plain {@code {lat, lng}} wire shape to a JTS point; blank stays null. */
  public Point toPoint(LocationDto location) {
    if (location == null || location.lat() == null || location.lng() == null) {
      return null;
    }
    return GEOMETRY_FACTORY.createPoint(new Coordinate(location.lng(), location.lat()));
  }

  private void copyFixedColumns(EntityRecord entity, EntityView view) {
    view.setId(entity.getId());
    view.setEntityType(entity.getEntityType());
    view.setParentId(entity.getParentId());
    view.setOwnerId(entity.getOwnerId());
    view.setName(entity.getName());
    view.setDescription(entity.getDescription());
    view.setStatus(entity.getStatus());
    view.setTags(List.of(entity.getTags()));
    view.setLocation(toLocation(entity.getLocation()));
    view.setCreatedAt(entity.getCreatedAt());
    view.setUpdatedAt(entity.getUpdatedAt());
  }

  private Map<String, Object> mergeAttributes(EntityWriteRequest request) {
    Map<String, Object> merged = new LinkedHashMap<>();
    if (request.getAttributes() != null) {
      merged.putAll(request.getAttributes());
    }
    merged.putAll(request.getExtra());
    rejectReservedAttributeKeys(merged);
    return merged;
  }

  private void rejectReservedAttributeKeys(Map<String, Object> attributes) {
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

  private Map<String, Object> flattenableAttributes(Map<String, Object> attributes) {
    Map<String, Object> flattened = new LinkedHashMap<>();
    attributes.forEach(
        (key, value) -> {
          if (!RESERVED_ATTRIBUTE_KEYS.contains(key.toLowerCase(Locale.ROOT))) {
            flattened.put(key, value);
          }
        });
    return flattened;
  }

  private String normalizeStatus(String status) {
    return isPresent(status) ? status.trim() : "active";
  }

  private String[] normalizeTags(List<String> tags) {
    if (tags == null) {
      return new String[0];
    }
    return tags.toArray(new String[0]);
  }

  private boolean isPresent(String value) {
    return value != null && !value.isBlank();
  }
}
