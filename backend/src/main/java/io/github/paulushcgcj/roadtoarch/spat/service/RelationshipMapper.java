package io.github.paulushcgcj.roadtoarch.spat.service;

import io.github.paulushcgcj.roadtoarch.spat.dto.EntityRelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.dto.EntitySummary;
import io.github.paulushcgcj.roadtoarch.spat.dto.RelationshipView;
import io.github.paulushcgcj.roadtoarch.spat.entity.Relationship;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.stereotype.Component;

/** MapStruct interface mapping Relationship → wire read models. */
@Component
@Mapper(componentModel = "spring", unmappedTargetPolicy = org.mapstruct.ReportingPolicy.IGNORE)
public interface RelationshipMapper {

  /** Pass-through: all fields map by name; attributes deep-copied via expression. */
  @Mapping(target = "attributes", expression = "java(new java.util.LinkedHashMap<>(source.getAttributes()))")
  RelationshipView toRelationshipView(Relationship source);

  /** Same plus extra params mapped by name (direction, other). */
  @Mapping(target = "id", source = "source.id")
  @Mapping(target = "attributes", expression = "java(new java.util.LinkedHashMap<>(source.getAttributes()))")
  @Mapping(target = "direction", source = "direction")
  @Mapping(target = "other", source = "other")
  @BeanMapping(ignoreByDefault = true)
  EntityRelationshipView toEntityRelationshipView(
      Relationship source, String direction, EntitySummary other);
}
