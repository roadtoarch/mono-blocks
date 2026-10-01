package io.github.paulushcgcj.roadtoarch.spat.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/**
 * A WGS-84 coordinate exchanged as plain JSON {@code { "lat": .., "lng": .. }}.
 *
 * <p>Deliberately never GeoJSON or WKT in either direction; the persistence column is a PostGIS
 * {@code geography(Point,4326)} but the wire format stays human-readable.
 */
public record LocationDto(
    @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double lat,
    @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double lng) {}