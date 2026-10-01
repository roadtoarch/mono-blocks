package io.github.paulushcgcj.roadtoarch.spat.domain;

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
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * An append-only timeline entry. Optionally attached to an {@link EntityRecord}, optionally
 * attributed to an {@link #actorId}; the {@code payload} carries whatever the demo needs. There is
 * deliberately no update or delete path.
 */
@Entity
@Table(name = "events", schema = "pgcj")
@Getter
@Setter
public class Event {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "entity_id")
  private UUID entityId;

  @Column(name = "actor_id")
  private UUID actorId;

  @Column(name = "event_type", nullable = false)
  private String eventType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(columnDefinition = "jsonb")
  private Map<String, Object> payload = new LinkedHashMap<>();

  @Column(name = "occurred_at", nullable = false)
  private Instant occurredAt = Instant.now();
}