package io.github.paulushcgcj.roadtoarch.spat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import lombok.*;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

/**
 * A typed, directed edge between two {@link EntityRecord}s. The {@link #relationshipType} is a free
 * string so the same table serves any demo's vocabulary (owns, works_at, installed_at, ...).
 */
@Entity
@Table(name = "relationships", schema = "pgcj")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Relationship {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "source_id", nullable = false)
  private UUID sourceId;

  @Column(name = "target_id", nullable = false)
  private UUID targetId;

  @Column(name = "relationship_type", nullable = false)
  private String relationshipType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> attributes = new LinkedHashMap<>();

  @Generated(event = EventType.INSERT)
  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;
}