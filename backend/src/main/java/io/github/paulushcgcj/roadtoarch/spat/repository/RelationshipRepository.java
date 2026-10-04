package io.github.paulushcgcj.roadtoarch.spat.repository;

import io.github.paulushcgcj.roadtoarch.spat.entity.Relationship;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Data access for {@link Relationship}; the entity's edges are filtered via Specifications. */
public interface RelationshipRepository
    extends JpaRepository<Relationship, UUID>, JpaSpecificationExecutor<Relationship> {}