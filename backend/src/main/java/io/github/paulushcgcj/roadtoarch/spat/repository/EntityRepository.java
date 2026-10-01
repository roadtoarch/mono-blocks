package io.github.paulushcgcj.roadtoarch.spat.repository;

import io.github.paulushcgcj.roadtoarch.spat.domain.EntityRecord;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Data access for {@link EntityRecord}; dynamic filtering is expressed via Specifications. */
public interface EntityRepository
    extends JpaRepository<EntityRecord, UUID>, JpaSpecificationExecutor<EntityRecord> {

  /** Distinct {@code entity_type} values currently present, for populating client dropdowns. */
  @Query("select distinct e.entityType from EntityRecord e order by e.entityType")
  List<String> findDistinctEntityTypes();

  /** Direct children of an entity (entities whose {@code parent_id} points at it). */
  Page<EntityRecord> findByParentId(UUID parentId, Pageable pageable);

  /**
   * Counts entities of a type whose free-form {@code attributes} bag holds {@code key = value}.
   *
   * <p>Backs the advisory {@code check-unique} endpoint. The authoritative check still happens in
   * the database trigger; this only spares the client a failed round-trip on the common case.
   */
  @Query(
      value =
          "select count(*) from pgcj.entities e"
              + " where e.entity_type = :entityType"
              + " and jsonb_extract_path_text(e.attributes, :key) = :value",
      nativeQuery = true)
  long countByAttributeValue(
      @Param("entityType") String entityType,
      @Param("key") String key,
      @Param("value") String value);

  /** Same as {@link #countByAttributeValue} but ignores one entity, for edit screens. */
  @Query(
      value =
          "select count(*) from pgcj.entities e"
              + " where e.entity_type = :entityType"
              + " and jsonb_extract_path_text(e.attributes, :key) = :value"
              + " and e.id <> cast(:excludeId as uuid)",
      nativeQuery = true)
  long countByAttributeValueExcluding(
      @Param("entityType") String entityType,
      @Param("key") String key,
      @Param("value") String value,
      @Param("excludeId") UUID excludeId);
}
