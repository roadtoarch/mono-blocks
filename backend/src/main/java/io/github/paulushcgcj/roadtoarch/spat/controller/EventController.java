package io.github.paulushcgcj.roadtoarch.spat.controller;

import io.github.paulushcgcj.roadtoarch.spat.dto.EventView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EventWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.service.EventService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Append-only event timeline, per entity and as a global activity feed. */
@RestController
@RequiredArgsConstructor
public class EventController {

  private final EventService eventService;

  /** Events for one entity, newest first. */
  @GetMapping("/api/entities/{id}/events")
  public Page<EventView> listForEntity(
      @PathVariable UUID id,
      @RequestParam(name = "event_type", required = false) String eventType,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
      @PageableDefault(size = 10, sort = "occurredAt", direction = Sort.Direction.DESC)
          Pageable pageable) {
    return eventService.listForEntity(id, eventType, from, to, pageable);
  }

  /** Global feed, optionally narrowed by event type, date range and the related entity type. */
  @GetMapping("/api/events")
  public Page<EventView> feed(
      @RequestParam(name = "event_type", required = false) String eventType,
      @RequestParam(name = "entity_type", required = false) String entityType,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
      @PageableDefault(size = 10, sort = "occurredAt", direction = Sort.Direction.DESC)
          Pageable pageable) {
    return eventService.feed(eventType, entityType, from, to, pageable);
  }

  @PostMapping("/api/events")
  @ResponseStatus(HttpStatus.CREATED)
  public EventView create(@Valid @RequestBody EventWriteRequest request) {
    return eventService.create(request);
  }
}
