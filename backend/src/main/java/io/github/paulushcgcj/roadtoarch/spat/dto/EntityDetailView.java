package io.github.paulushcgcj.roadtoarch.spat.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.domain.Page;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.annotation.JsonNaming;


/**
 * Detail read model for an entity: the flattened entity view plus its direct children (entities
 * whose {@code parent_id} points at this one), paginated with the Spring default {@code Page}
 * envelope.
 */
@Getter
@Setter
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class EntityDetailView extends EntityView {

  private Page<EntitySummary> children;
}
