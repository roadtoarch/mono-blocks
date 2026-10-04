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
import org.locationtech.jts.geom.Point;

/**
 * A generic, domain-neutral record. Everything domain-specific is carried by the free-form
 * {@link #entityType} discriminator and the {@link #attributes} JSON bag; the remaining columns are
 * a fixed, reusable spine shared by every demo built on this schema.
 *
 * <p>Named {@code EntityRecord} rather than {@code Entity} so the type does not collide with the
 * {@code jakarta.persistence.Entity} annotation that decorates it.
 */
@Entity
@Table(name = "entities", schema = "pgcj")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntityRecord {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "entity_type", nullable = false)
  private String entityType;

  @Column(name = "parent_id")
  private UUID parentId;

  @Column(name = "owner_id")
  private UUID ownerId;

  @Column(nullable = false)
  private String name;

  private String description;

  @Column(nullable = false)
  private String status = "active";

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(columnDefinition = "text[]")
  private String[] tags = new String[0];

  /** Nullable point on WGS-84; absent unless a demo is actually geospatial. */
  @JdbcTypeCode(SqlTypes.GEOGRAPHY)
  private Point location;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> attributes = new LinkedHashMap<>();

  @Generated(event = {EventType.INSERT, EventType.UPDATE})
  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @Generated(event = {EventType.INSERT, EventType.UPDATE})
  @Column(name = "updated_at", insertable = false, updatable = false)
  private Instant updatedAt;
}