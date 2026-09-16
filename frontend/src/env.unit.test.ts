/**
 * MonoBlocks — env.unit.test.ts
 *
 * Unit tests for the Zod-validated runtime environment.
 *
 * NOTE: env.ts runs its validation at module-level, so we can't easily
 * re-test the module itself. Instead we test the validation helpers
 * by re-implementing the logic here. The key behaviors are:
 *
 * 1. `window.config` runtime overrides
 * 2. Zod schema validation
 * 3. Default values
 */

import { describe, expect, it } from 'vitest';

import { z } from 'zod';

// ── Schemas (duplicated from env.ts for unit testing) ────────────────────────

const allowedRuntimeEnvConfigSchema = z
  .object({
    VITE_API_URL: z.string().min(1),
    VITE_KEYCLOAK_URL: z.string().min(1),
    VITE_FRONTEND_URL: z.string().min(1).optional(),
  })
  .partial()
  .strict();

const appEnvSchema = z.object({
  VITE_API_URL: z.string().min(1).default('http://localhost:8080'),
  VITE_KEYCLOAK_URL: z.string().min(1).default('http://localhost:8081'),
  VITE_FRONTEND_URL: z.string().min(1).optional(),
});

// ── Helpers (duplicated for testability) ─────────────────────────────────────

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    return false;
  }
  const prototype: object | null = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
};

const getStringEnvEntries = (source: Record<string, unknown>): Record<string, string> => {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
};

const getValidatedRuntimeConfig = (config: unknown) => {
  if (config == null) return {};
  if (!isPlainObject(config)) {
    throw new TypeError('Invalid window.config: expected a plain object');
  }
  const parsed = allowedRuntimeEnvConfigSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(({ path, message }) => `${path.join('.')}: ${message}`)
      .join('; ');
    throw new TypeError(`Invalid window.config: ${issues}`);
  }
  return parsed.data;
};

const getValidatedAppEnv = (config: Record<string, string>) => {
  const parsed = appEnvSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(({ path, message }) => `${path.join('.')}: ${message}`)
      .join('; ');
    throw new TypeError(`Invalid application env: ${issues}`);
  }
  return parsed.data;
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe('env validation', () => {
  describe('appEnvSchema', () => {
    it('applies defaults when no values provided', () => {
      const result = getValidatedAppEnv({});
      expect(result.VITE_API_URL).toBe('http://localhost:8080');
      expect(result.VITE_KEYCLOAK_URL).toBe('http://localhost:8081');
      expect(result.VITE_FRONTEND_URL).toBeUndefined();
    });

    it('uses provided values over defaults', () => {
      const result = getValidatedAppEnv({
        VITE_API_URL: 'https://api.example.com',
        VITE_KEYCLOAK_URL: 'https://auth.example.com',
      });
      expect(result.VITE_API_URL).toBe('https://api.example.com');
      expect(result.VITE_KEYCLOAK_URL).toBe('https://auth.example.com');
    });

    it('rejects empty string for required fields', () => {
      expect(() =>
        getValidatedAppEnv({ VITE_API_URL: '' }),
      ).toThrow();
    });

    it('accepts optional VITE_FRONTEND_URL', () => {
      const result = getValidatedAppEnv({
        VITE_FRONTEND_URL: 'https://app.example.com',
      });
      expect(result.VITE_FRONTEND_URL).toBe('https://app.example.com');
    });
  });

  describe('allowedRuntimeEnvConfigSchema', () => {
    it('accepts valid partial config', () => {
      const result = getValidatedRuntimeConfig({ VITE_API_URL: 'http://prod:8080' });
      expect(result).toEqual({ VITE_API_URL: 'http://prod:8080' });
    });

    it('returns empty object for null', () => {
      const result = getValidatedRuntimeConfig(null);
      expect(result).toEqual({});
    });

    it('returns empty object for undefined', () => {
      const result = getValidatedRuntimeConfig(undefined);
      expect(result).toEqual({});
    });

    it('rejects non-plain objects', () => {
      expect(() => getValidatedRuntimeConfig(new Date())).toThrow(
        'Invalid window.config: expected a plain object',
      );
    });

    it('rejects arrays', () => {
      expect(() => getValidatedRuntimeConfig([])).toThrow(
        'Invalid window.config: expected a plain object',
      );
    });

    it('rejects unknown keys', () => {
      expect(() => getValidatedRuntimeConfig({ UNKNOWN_KEY: 'val' })).toThrow(
        'Invalid window.config',
      );
    });

    it('rejects empty string values', () => {
      expect(() => getValidatedRuntimeConfig({ VITE_API_URL: '' })).toThrow(
        'Invalid window.config',
      );
    });
  });

  describe('isPlainObject', () => {
    it('returns true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
    });

    it('returns true for null-prototype objects', () => {
      const nullProto = Object.create(null);
      nullProto.x = 1;
      expect(isPlainObject(nullProto)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it('returns false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
    });

    it('returns false for class instances', () => {
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(new Map())).toBe(false);
    });
  });

  describe('getStringEnvEntries', () => {
    it('filters only string values', () => {
      const source = { A: '1', B: 2, C: '3', D: true };
      const result = getStringEnvEntries(source);
      expect(result).toEqual({ A: '1', C: '3' });
    });

    it('returns empty for empty source', () => {
      expect(getStringEnvEntries({})).toEqual({});
    });
  });
});
