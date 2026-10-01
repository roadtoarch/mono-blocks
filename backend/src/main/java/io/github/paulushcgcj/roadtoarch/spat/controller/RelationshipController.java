package io.github.paulushcgcj.roadtoarch.spat.controller;

import io.github.paulushcgcj.roadtoarch.spat.dto.EntityRelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.dto.RelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.dto.RelationshipWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.service.RelationshipService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Typed relationships between entities. */
@RestController
@RequiredArgsConstructor
public class RelationshipController {

  private final RelationshipService relationshipService;

  /** Relationships where the entity is source or target, each carrying a direction. */
  @GetMapping("/api/entities/{id}/relationships")
  public Page<EntityRelationshipView> listForEntity(
      @PathVariable UUID id,
      @RequestParam(name = "relationship_type", required = false) String relationshipType,
      @PageableDefault(size = 10) Pageable pageable) {
    return relationshipService.listForEntity(id, relationshipType, pageable);
  }

  @PostMapping("/api/relationships")
  @ResponseStatus(HttpStatus.CREATED)
  public RelationshipView create(@Valid @RequestBody RelationshipWriteRequest request) {
    return relationshipService.create(request);
  }

  @DeleteMapping("/api/relationships/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    relationshipService.delete(id);
  }
}
