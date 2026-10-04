package io.github.paulushcgcj.roadtoarch.spat.service;

import io.github.paulushcgcj.roadtoarch.spat.dto.EventView;
import io.github.paulushcgcj.roadtoarch.spat.entity.Event;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.stereotype.Component;

/** MapStruct interface mapping Event → wire read model. */
@Component
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface EventMapper {

  /** Payload deep-copied so downstream mutation never affects stored state. */
  @Mapping(target = "payload", expression = "java(new java.util.LinkedHashMap<>(event.getPayload()))")
  @Mapping(target = "entityType", source = "entityType")
  EventView toEventView(Event event, String entityType);
}
