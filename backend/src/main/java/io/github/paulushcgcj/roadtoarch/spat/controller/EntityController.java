package io.github.paulushcgcj.roadtoarch.spat.controller;

import io.github.paulushcgcj.roadtoarch.spat.dto.CreateGroup;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityDetailView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityQuery;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntityWriteRequest;
import io.github.paulushcgcj.roadtoarch.spat.dto.UniqueCheckResponse;
import io.github.paulushcgcj.roadtoarch.spat.service.EntityService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Generic REST surface over the entity table, agnostic of any business domain. */
@RestController
@RequestMapping("/api/entities")
@RequiredArgsConstructor
public class EntityController {

  private final EntityService entityService;

  /** Paginated, filterable entity list. All filters are optional. */
  @GetMapping
  public Page<EntityView> list(
      @RequestParam(name = "entity_type", required = false) String entityType,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String tag,
      @RequestParam(required = false) String search,
      @RequestParam(required = false) Double lat,
      @RequestParam(required = false) Double lng,
      @RequestParam(name = "radius_km", required = false) Double radiusKm,
      @RequestParam(name = "min_lat", required = false) Double minLat,
      @RequestParam(name = "min_lng", required = false) Double minLng,
      @RequestParam(name = "max_lat", required = false) Double maxLat,
      @RequestParam(name = "max_lng", required = false) Double maxLng,
      @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC)
          Pageable pageable) {
    EntityQuery query =
        new EntityQuery(
            entityType, status, tag, search, lat, lng, radiusKm, minLat, minLng, maxLat, maxLng);
    return entityService.list(query, pageable);
  }

  /** Distinct entity types currently present, for client-side filter dropdowns. */
  @GetMapping("/types")
  public List<String> types() {
    return entityService.distinctTypes();
  }

  /** Advisory uniqueness probe for a registered attribute key. */
  @GetMapping("/check-unique")
  public UniqueCheckResponse checkUnique(
      @RequestParam(name = "entity_type") String entityType,
      @RequestParam String key,
      @RequestParam String value,
      @RequestParam(required = false) UUID excludeId) {
    return new UniqueCheckResponse(entityService.isUnique(entityType, key, value, excludeId));
  }

  /** Single entity plus its direct children (default page size 10). */
  @GetMapping("/{id}")
  public EntityDetailView get(
      @PathVariable UUID id, @PageableDefault(size = 10) Pageable childPageable) {
    return entityService.getDetail(id, childPageable);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public EntityView create(
      @Validated(CreateGroup.class) @RequestBody EntityWriteRequest request) {
    return entityService.create(request);
  }

  @PutMapping("/{id}")
  public EntityView replace(
      @PathVariable UUID id,
      @Validated(CreateGroup.class) @RequestBody EntityWriteRequest request) {
    return entityService.replace(id, request);
  }

  @PatchMapping("/{id}")
  public EntityView patch(@PathVariable UUID id, @RequestBody EntityWriteRequest request) {
    return entityService.patch(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable UUID id) {
    entityService.delete(id);
  }
}
