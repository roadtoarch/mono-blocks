package io.github.paulushcgcj.roadtoarch.spat.service;

import io.github.paulushcgcj.roadtoarch.spat.domain.Relationship;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityRelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntitySummary;
import io.github.paulushcgcj.roadtoarch.spat.dto.RelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.dto.RelationshipWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.repository.EntityRepository;
import io.github.paulushcgcj.roadtoarch.spat.repository.RelationshipRepository;
import io.github.paulushcgcj.roadtoarch.spat.web.ApiException;
import jakarta.persistence.criteria.Predicate;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Typed edges between any two entities, generic over {@code relationship_type}. */
@Service
@RequiredArgsConstructor
public class RelationshipService {

  private final RelationshipRepository relationshipRepository;
  private final EntityRepository entityRepository;
  private final EntityMapper mapper;

  /** All relationships in which the entity is source or target, with a direction on each row. */
  @Transactional(readOnly = true)
  public Page<EntityRelationshipView> listForEntity(
      UUID entityId, String relationshipType, Pageable pageable) {
    requireEntity(entityId);
    Specification<Relationship> specification =
        (root, query, builder) -> {
          Predicate involved =
              builder.or(
                  builder.equal(root.get("sourceId"), entityId),
                  builder.equal(root.get("targetId"), entityId));
          if (relationshipType == null || relationshipType.isBlank()) {
            return involved;
          }
          return builder.and(involved, builder.equal(root.get("relationshipType"), relationshipType));
        };
    Page<Relationship> page = relationshipRepository.findAll(specification, pageable);
    Map<UUID, EntitySummary> others = loadOthers(page.getContent(), entityId);
    return page.map(
        relationship ->
            mapper.toEntityRelationshipView(
                relationship,
                entityId.equals(relationship.getSourceId()) ? "outbound" : "inbound",
                others.get(otherId(relationship, entityId))));
  }

  /** Creates a relationship. Flushes so the composite unique constraint surfaces as a conflict. */
  @Transactional
  public RelationshipView create(RelationshipWriteRequest request) {
    if (request.sourceId().equals(request.targetId())) {
      throw ApiException.badRequest(
          "A relationship cannot reference the same entity on both sides.");
    }
    requireEntity(request.sourceId());
    requireEntity(request.targetId());
    Relationship relationship = new Relationship();
    relationship.setSourceId(request.sourceId());
    relationship.setTargetId(request.targetId());
    relationship.setRelationshipType(request.relationshipType().trim());
    relationship.setAttributes(
        request.attributes() == null
            ? new LinkedHashMap<>()
            : new LinkedHashMap<>(request.attributes()));
    return mapper.toRelationshipView(relationshipRepository.saveAndFlush(relationship));
  }

  @Transactional
  public void delete(UUID id) {
    if (!relationshipRepository.existsById(id)) {
      throw ApiException.notFound("Relationship " + id + " was not found.");
    }
    relationshipRepository.deleteById(id);
  }

  private void requireEntity(UUID id) {
    if (!entityRepository.existsById(id)) {
      throw ApiException.notFound("Entity " + id + " was not found.");
    }
  }

  private Map<UUID, EntitySummary> loadOthers(List<Relationship> relationships, UUID entityId) {
    Set<UUID> ids =
        relationships.stream()
            .map(relationship -> otherId(relationship, entityId))
            .collect(Collectors.toSet());
    if (ids.isEmpty()) {
      return Map.of();
    }
    Map<UUID, EntitySummary> summaries = new HashMap<>();
    entityRepository
        .findAllById(ids)
        .forEach(entity -> summaries.put(entity.getId(), mapper.toSummary(entity)));
    return summaries;
  }

  private UUID otherId(Relationship relationship, UUID entityId) {
    return entityId.equals(relationship.getSourceId())
        ? relationship.getTargetId()
        : relationship.getSourceId();
  }
}
