package io.github.paulushcgcj.roadtoarch.spat.service;

import io.github.paulushcgcj.roadtoarch.spat.domain.EntityRecord;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityDetailView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityQuery;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntitySummary;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.repository.EntityRepository;
import io.github.paulushcgcj.roadtoarch.spat.spec.EntitySpecifications;
import io.github.paulushcgcj.roadtoarch.spat.web.ApiException;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Domain-agnostic CRUD and querying over the generic entity table. */
@Service
@RequiredArgsConstructor
public class EntityService {

  private final EntityRepository entityRepository;
  private final EntityMapper mapper;

  /** Paginated, filtered list. Every filter is optional and composed as a Specification. */
  @Transactional(readOnly = true)
  public Page<EntityView> list(EntityQuery query, Pageable pageable) {
    Specification<EntityRecord> specification =
        EntitySpecifications.entityType(query.entityType())
            .and(EntitySpecifications.status(query.status()))
            .and(EntitySpecifications.textSearch(query.search()))
            .and(EntitySpecifications.hasTag(query.tag()))
            .and(EntitySpecifications.withinRadius(query.lat(), query.lng(), query.radiusKm()))
            .and(
                EntitySpecifications.withinBoundingBox(
                    query.minLat(), query.minLng(), query.maxLat(), query.maxLng()));
    return entityRepository.findAll(specification, pageable).map(mapper::toView);
  }

  /** Single entity plus its direct children, paginated with the default size. */
  @Transactional(readOnly = true)
  public EntityDetailView getDetail(UUID id, Pageable childPageable) {
    EntityRecord entity = load(id);
    Page<EntitySummary> children =
        entityRepository.findByParentId(id, childPageable).map(mapper::toSummary);
    return mapper.toDetailView(entity, children);
  }

  /** Distinct {@code entity_type} values currently present. */
  @Transactional(readOnly = true)
  public List<String> distinctTypes() {
    return entityRepository.findDistinctEntityTypes();
  }

  /**
   * Advisory uniqueness probe for a registered attribute key.
   *
   * <p>The authoritative enforcement is a database trigger that raises a unique violation; this
   * endpoint only lets a form warn before submitting. Unregistered keys are simply reported unique.
   */
  @Transactional(readOnly = true)
  public boolean isUnique(String entityType, String key, String value, UUID excludeId) {
    if (isBlank(entityType) || isBlank(key) || isBlank(value)) {
      throw ApiException.badRequest("entity_type, key and value are required.");
    }
    long matches =
        excludeId == null
            ? entityRepository.countByAttributeValue(entityType, key, value)
            : entityRepository.countByAttributeValueExcluding(entityType, key, value, excludeId);
    return matches == 0;
  }

  /** Creates an entity. Flushes so the uniqueness trigger surfaces as a conflict immediately. */
  @Transactional
  public EntityView create(EntityWriteRequest request) {
    EntityRecord entity = mapper.newEntity(request);
    requireValidParent(entity.getParentId(), null);
    return mapper.toView(entityRepository.saveAndFlush(entity));
  }

  /** Full replacement (PUT). */
  @Transactional
  public EntityView replace(UUID id, EntityWriteRequest request) {
    EntityRecord entity = load(id);
    mapper.applyReplace(entity, request);
    requireValidParent(entity.getParentId(), id);
    return mapper.toView(entityRepository.saveAndFlush(entity));
  }

  /** Partial update (PATCH). */
  @Transactional
  public EntityView patch(UUID id, EntityWriteRequest request) {
    EntityRecord entity = load(id);
    mapper.applyPatch(entity, request);
    requireValidParent(entity.getParentId(), id);
    return mapper.toView(entityRepository.saveAndFlush(entity));
  }

  @Transactional
  public void delete(UUID id) {
    entityRepository.delete(load(id));
  }

  private EntityRecord load(UUID id) {
    return entityRepository
        .findById(id)
        .orElseThrow(() -> ApiException.notFound("Entity " + id + " was not found."));
  }

  private void requireValidParent(UUID parentId, UUID selfId) {
    if (parentId == null) {
      return;
    }
    if (parentId.equals(selfId)) {
      throw ApiException.badRequest("An entity cannot be its own parent.");
    }
    if (!entityRepository.existsById(parentId)) {
      throw ApiException.badRequest(
          "parent_id " + parentId + " does not reference an existing entity.");
    }
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }
}
