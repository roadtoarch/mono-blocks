/**
 * Unit tests for offline/parse-query-key — TanStack Query key parser.
 *
 * @module offline/parse-query-key.unit.test
 */

import { parseQueryKey } from './parse-query-key';

// ── Helpers ─────────────────────────────────────────────────────────

/** A realistic-looking JWT access token (3 base64url segments, >80 chars). */
const JWT =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

// ── Plural (list) queries ──────────────────────────────────────────

describe('parseQueryKey — list queries', () => {
  it('parses a plural entity key as a list query', () => {
    const result = parseQueryKey(['users', JWT, { page: 0, size: 20 }]);
    expect(result).toEqual({
      entityType: 'user',
      type: 'list',
      recordId: undefined,
    });
  });

  it('strips the trailing "s" to derive the singular entity type', () => {
    expect(parseQueryKey(['orders']).entityType).toBe('order');
    expect(parseQueryKey(['products']).entityType).toBe('product');
  });

  it('handles plural keys with no additional elements', () => {
    const result = parseQueryKey(['users']);
    expect(result.type).toBe('list');
    expect(result.recordId).toBeUndefined();
  });

  it('handles plural keys with multiple extra elements', () => {
    const result = parseQueryKey(['users', JWT, { page: 1 }, 'extra']);
    expect(result.type).toBe('list');
  });
});

// ── Singular (detail) queries ──────────────────────────────────────

describe('parseQueryKey — detail queries', () => {
  it('parses a singular entity key with a JWT + record ID as a detail query', () => {
    const result = parseQueryKey(['user', JWT, '42']);
    expect(result).toEqual({
      entityType: 'user',
      type: 'detail',
      recordId: '42',
    });
  });

  it('returns recordId as undefined when only the entity key is present', () => {
    const result = parseQueryKey(['user']);
    expect(result.type).toBe('detail');
    expect(result.recordId).toBeUndefined();
  });

  it('skips the access token and picks the first non-JWT string', () => {
    const result = parseQueryKey(['user', JWT, 'abc-123']);
    expect(result.recordId).toBe('abc-123');
  });
});

// ── JWT-like token filtering ───────────────────────────────────────

describe('parseQueryKey — JWT filtering', () => {
  it('skips JWT-like strings when looking for a record ID', () => {
    const result = parseQueryKey(['user', JWT, '42']);
    expect(result.recordId).toBe('42');
  });

  it('returns a detail query with no recordId when only JWT is present', () => {
    const result = parseQueryKey(['user', JWT]);
    expect(result.type).toBe('detail');
    expect(result.recordId).toBeUndefined();
  });

  it('does not treat short dotted strings as JWTs', () => {
    // A short string with dots (e.g. version "1.2.3") should be treated as a record ID.
    const result = parseQueryKey(['user', JWT, '1.2.3']);
    expect(result.recordId).toBe('1.2.3');
  });
});

// ── Override: 'me' singleton ───────────────────────────────────────

describe('parseQueryKey — entity type overrides', () => {
  it('recognises "me" as a singleton detail query', () => {
    const result = parseQueryKey(['me', JWT]);
    expect(result).toEqual({
      entityType: 'me',
      type: 'detail',
      recordId: 'me',
    });
  });

  it('handles "me" with no additional elements', () => {
    const result = parseQueryKey(['me']);
    expect(result.type).toBe('detail');
    expect(result.recordId).toBe('me');
  });
});

// ── Edge cases ─────────────────────────────────────────────────────

describe('parseQueryKey — edge cases', () => {
  it('converts a non-string entity key to string', () => {
    const result = parseQueryKey([123]);
    expect(result.entityType).toBe('123');
  });

  it('handles empty query key array gracefully', () => {
    // queryKey[0] is undefined → String(undefined) = 'undefined'
    const result = parseQueryKey([]);
    expect(result.entityType).toBe('undefined');
  });

  it('handles numeric record IDs cast to string', () => {
    const result = parseQueryKey(['user', JWT, '99']);
    expect(result.recordId).toBe('99');
  });

  it('picks the first valid record ID even when multiple non-JWT strings exist', () => {
    const result = parseQueryKey(['user', JWT, 'first-id', 'second-id']);
    expect(result.recordId).toBe('first-id');
  });

  it('treats an access-token-like string (short, no dots) as a record ID', () => {
    // When the token position has a non-JWT string, it IS picked as recordId.
    // This is by design — the parser assumes position 1 is a JWT.
    const result = parseQueryKey(['user', 'short-token', '42']);
    expect(result.recordId).toBe('short-token');
  });
});
