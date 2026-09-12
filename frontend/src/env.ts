import { z } from 'zod';

declare global {
  interface Window {
    config?: unknown;
  }
}

/**
 * Supported runtime config keys that may be injected via public/data/config.js.
 */
const allowedRuntimeEnvConfigSchema = z
  .object({
    VITE_API_URL: z.string().min(1),
    VITE_KEYCLOAK_URL: z.string().min(1),
    VITE_FRONTEND_URL: z.string().min(1).optional(),
    VITE_ENABLE_SW: z
      .string()
      .transform((v) => v === 'true')
      .optional(),
    VITE_OFFLINE_STALE_AGE_MS: z
      .string()
      .transform((v) => Number(v))
      .pipe(z.number().int().positive())
      .optional(),
  })
  .partial()
  .strict();

/**
 * Final merged env contract consumed by the application.
 */
const appEnvSchema = z.object({
  VITE_API_URL: z.string().min(1).default('http://localhost:8080'),
  VITE_KEYCLOAK_URL: z.string().min(1).default('http://localhost:8081'),
  VITE_FRONTEND_URL: z.string().min(1).optional(),
  // Coerces both string ("true"/"false") and boolean values from Vite env or runtime config.
  VITE_ENABLE_SW: z.union([z.boolean(), z.string().transform((v) => v === 'true')]).default(false),
  // Maximum age (ms) for restored offline cache entries (NFR-9).
  VITE_OFFLINE_STALE_AGE_MS: z
    .union([
      z.number().int().positive(),
      z
        .string()
        .transform((v) => Number(v))
        .pipe(z.number().int().positive()),
    ])
    .default(86_400_000), // 24 hours
});

type AppEnv = z.infer<typeof appEnvSchema>;
type RuntimeConfig = z.infer<typeof allowedRuntimeEnvConfigSchema>;

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

const getValidatedRuntimeConfig = (config: unknown): RuntimeConfig => {
  if (config == null) {
    return {};
  }
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

const getValidatedAppEnv = (config: Record<string, unknown>): AppEnv => {
  const parsed = appEnvSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(({ path, message }) => `${path.join('.')}: ${message}`)
      .join('; ');
    throw new TypeError(`Invalid application env: ${issues}`);
  }
  return parsed.data;
};

const viteEnv = getStringEnvEntries(import.meta.env);
const runtimeEnv = getValidatedRuntimeConfig(window.config);

export const env: AppEnv = getValidatedAppEnv({
  ...viteEnv,
  ...runtimeEnv,
});
