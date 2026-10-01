package io.github.paulushcgcj.roadtoarch.spat.service;

import io.github.paulushcgcj.roadtoarch.spat.domain.EntityRecord;
import io.github.paulushcgcj.roadtoarch.spat.domain.Event;
import io.github.paulushcgcj.roadtoarch.spat.dto.EventView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EventWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.repository.EntityRepository;
import io.github.paulushcgcj.roadtoarch.spat.repository.EventRepository;
import io.github.paulushcgcj.roadtoarch.spat.web.ApiException;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Append-only event timeline, usable both per entity and as a global activity feed. */
@Service
@RequiredArgsConstructor
public class EventService {

  private final EventRepository eventRepository;
  private final EntityRepository entityRepository;
  private final EntityMapper mapper;

  /** Events for a single entity, newest first by default. */
  @Transactional(readOnly = true)
  public Page<EventView> listForEntity(
      UUID entityId, String eventType, Instant from, Instant to, Pageable pageable) {
    if (!entityRepository.existsById(entityId)) {
      throw ApiException.notFound("Entity " + entityId + " was not found.");
    }
    Specification<Event> specification =
        baseSpec(eventType, from, to)
            .and((root, query, builder) -> builder.equal(root.get("entityId"), entityId));
    return toViewPage(eventRepository.findAll(specification, pageable));
  }

  /** Global feed, optionally narrowed to the related entity's {@code entity_type}. */
  @Transactional(readOnly = true)
  public Page<EventView> feed(
      String eventType, String entityType, Instant from, Instant to, Pageable pageable) {
    Specification<Event> specification = baseSpec(eventType, from, to);
    if (entityType != null && !entityType.isBlank()) {
      specification =
          specification.and(
              (root, query, builder) -> {
                Subquery<UUID> subquery = query.subquery(UUID.class);
                Root<EntityRecord> entityRoot = subquery.from(EntityRecord.class);
                subquery.select(entityRoot.get("id")).where(
                    builder.equal(entityRoot.get("entityType"), entityType));
                return root.get("entityId").in(subquery);
              });
    }
    return toViewPage(eventRepository.findAll(specification, pageable));
  }

  /** Appends an event. There is intentionally no update or delete counterpart. */
  @Transactional
  public EventView create(EventWriteRequest request) {
    if (request.entityId() != null && !entityRepository.existsById(request.entityId())) {
      throw ApiException.notFound("Entity " + request.entityId() + " was not found.");
    }
    Event event = new Event();
    event.setEventType(request.eventType().trim());
    event.setEntityId(request.entityId());
    event.setActorId(request.actorId());
    event.setPayload(
        request.payload() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(request.payload()));
    if (request.occurredAt() != null) {
      event.setOccurredAt(request.occurredAt());
    }
    Event saved = eventRepository.saveAndFlush(event);
    return mapper.toEventView(saved, resolveEntityType(saved.getEntityId()));
  }

  private Specification<Event> baseSpec(String eventType, Instant from, Instant to) {
    return (root, query, builder) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (eventType != null && !eventType.isBlank()) {
        predicates.add(builder.equal(root.get("eventType"), eventType));
      }
      if (from != null) {
        predicates.add(builder.greaterThanOrEqualTo(root.get("occurredAt"), from));
      }
      if (to != null) {
        predicates.add(builder.lessThanOrEqualTo(root.get("occurredAt"), to));
      }
      return predicates.isEmpty() ? builder.conjunction() : builder.and(predicates.toArray(new Predicate[0]));
    };
  }

  private Page<EventView> toViewPage(Page<Event> page) {
    Set<UUID> entityIds =
        page.getContent().stream()
            .map(Event::getEntityId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
    Map<UUID, String> types = new HashMap<>();
    if (!entityIds.isEmpty()) {
      entityRepository
          .findAllById(entityIds)
          .forEach(entity -> types.put(entity.getId(), entity.getEntityType()));
    }
    return page.map(
        event ->
            mapper.toEventView(
                event, event.getEntityId() == null ? null : types.get(event.getEntityId())));
  }

  private String resolveEntityType(UUID entityId) {
    if (entityId == null) {
      return null;
    }
    return entityRepository.findById(entityId).map(EntityRecord::getEntityType).orElse(null);
  }
}
