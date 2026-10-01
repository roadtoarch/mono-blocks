package io.github.paulushcgcj.roadtoarch.spat.dto;

/**
 * Bean Validation group marker for constraints that are enforced only when an entity is created or
 * fully replaced (POST/PUT), not on partial PATCH updates.
 */
public interface CreateGroup {}