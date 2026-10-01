package io.github.paulushcgcj.roadtoarch.spat.repository;

import io.github.paulushcgcj.roadtoarch.spat.domain.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

/** Data access for {@link Event}; the timeline and global feed are filtered via Specifications. */
public interface EventRepository extends JpaRepository<Event, Long>, JpaSpecificationExecutor<Event> {}