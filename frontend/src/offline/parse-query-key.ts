/**
 * Parses TanStack Query keys to extract entity type and record ID.
 *
 * This convention-based parser supports the query key patterns used in
 * the codebase:
 * - `['me', accessToken]`         → singleton detail ('me')
 * - `['users', accessToken, …]`  → list query ('user')
 * - `['user', accessToken, id]`  → detail query ('user', recordId = id)
 *
 * If a new entity type does not follow the singular/plural convention,
 * register it in {@link ENTITY_TYPE_OVERRIDES} rather than changing
 * the heuristic.
 *
 * @module offline/parse-query-key
 */

// ── Types ──────────────────────────────────────────────────────────

/** Result of parsing a TanStack Query key. */
export interface ParsedQueryKey {
  /** Singular entity type (e.g. `'user'`, `'me'`). */
  entityType: string;
  /** Record ID for detail queries; `undefined` for list queries. */
  recordId?: string;
  /** Whether this is a list or detail query. */
  type: 'list' | 'detail';
}

// ── Overrides ──────────────────────────────────────────────────────

/**
 * Explicit entity type overrides for keys that don't follow the
 * singular/plural naming convention.
 *
 * Map key = queryKey[0] (the entity key).
 * Map value = `{ entityType, type }` override.
 *
 * Add entries here before adding new entity types that break the
 * `endsWith('s')` heuristic.
 */
const ENTITY_TYPE_OVERRIDES: Record<string, { entityType: string; type: 'list' | 'detail' }> = {
  // 'me' is a singleton detail query — no plural form exists.
  me: { entityType: 'me', type: 'detail' },
};

// ── Parser ─────────────────────────────────────────────────────────

/**
 * Extracts entity type and record ID from a TanStack Query key.
 *
 * Convention:
 * - `queryKey[0]` is always the entity key (string).
 * - `queryKey[1]` is typically the access token (skip it).
 * - For detail queries, `queryKey[2]` is the record ID (string).
 * - Plural entity keys (ending in `s`) are treated as list queries.
 *
 * @param queryKey - The raw query key array from TanStack Query.
 * @returns Parsed entity type, record ID, and query type.
 */
export function parseQueryKey(queryKey: readonly unknown[]): ParsedQueryKey {
  const entityKey = String(queryKey[0]);

  // Check explicit overrides first.
  if (entityKey in ENTITY_TYPE_OVERRIDES) {
    const override = ENTITY_TYPE_OVERRIDES[entityKey];
    // For singleton detail queries like 'me', recordId = entityKey itself.
    const recordId = override.type === 'detail' ? entityKey : undefined;
    return { entityType: override.entityType, recordId, type: override.type };
  }

  // Plural entity keys are list queries (e.g. 'users' → 'user').
  if (entityKey.endsWith('s')) {
    return {
      entityType: entityKey.slice(0, -1),
      type: 'list',
    };
  }

  // Singular entity keys are detail queries.
  // queryKey layout: [entityKey, accessToken?, recordId?, …]
  // Skip the access token (position 1) — look for recordId at position 2+.
  const recordId = findRecordId(queryKey);
  return { entityType: entityKey, recordId, type: 'detail' };
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Finds the first string element after the entity key that looks like
 * a record ID (i.e. is not a JWT access token).
 *
 * JWTs contain two dots and are typically >100 chars.
 * Record IDs are short strings (UUIDs, numeric IDs, slugs).
 */
function findRecordId(queryKey: readonly unknown[]): string | undefined {
  for (let i = 1; i < queryKey.length; i++) {
    const element = queryKey[i];
    if (typeof element === 'string' && !isJwtLike(element)) {
      return element;
    }
  }
  return undefined;
}

/**
 * Heuristic: a string that looks like a JWT access token.
 *
 * JWTs have three base64url segments separated by dots and are
 * typically much longer than a record ID.
 */
function isJwtLike(value: string): boolean {
  return value.length > 80 && value.split('.').length === 3;
}
