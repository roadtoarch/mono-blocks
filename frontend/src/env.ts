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
  })
  .partial()
  .strict();

/**
 * Final merged env contract consumed by the application.
 */
const appEnvSchema = z.looseObject({
  VITE_API_URL: z.string().min(1).default('http://localhost:8080'),
  VITE_KEYCLOAK_URL: z.string().min(1).default('http://localhost:8081'),
  VITE_FRONTEND_URL: z.string().min(1).optional(),
});

type AppEnv = Record<string, string> & z.infer<typeof appEnvSchema>;
type RuntimeConfig = z.infer<typeof allowedRuntimeEnvConfigSchema>;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value == null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
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

const getValidatedAppEnv = (config: Record<string, string>): AppEnv => {
  const parsed = appEnvSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(({ path, message }) => `${path.join('.')}: ${message}`)
      .join('; ');
    throw new TypeError(`Invalid application env: ${issues}`);
  }
  return parsed.data as AppEnv;
};

const viteEnv = getStringEnvEntries(import.meta.env as Record<string, unknown>);
const runtimeEnv = getValidatedRuntimeConfig(globalThis.window?.config);

export const env: AppEnv = getValidatedAppEnv({
  ...viteEnv,
  ...runtimeEnv,
});
