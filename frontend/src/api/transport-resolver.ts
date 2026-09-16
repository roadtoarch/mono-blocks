/**
 * MonoBlocks — API transport resolver
 *
 * Central place to obtain the current `Transport` function.
 * In development this delegates to `mockTransport` (mockDb).
 * In production this delegates to the real axios-based pipeline
 * created by `createApiClient()`.
 *
 * Hooks and Resource classes should call `getTransport()` — never
 * import mockDb or the HTTP pipeline directly.
 */

import { mockTransport } from './mock-transport';

import type { Transport } from '@/http/types';

// ─── Transport selection ─────────────────────────────────────────────────────

let currentTransport: Transport = mockTransport;

/**
 * Get the currently active transport.
 */
export function getTransport(): Transport {
  return currentTransport;
}

/**
 * Replace the active transport (e.g. switch from mock to real API).
 * Call once at app startup after auth is initialised.
 */
export function setTransport(transport: Transport): void {
  currentTransport = transport;
}

/**
 * Reset to mock transport (useful for tests / storybook).
 */
export function resetTransport(): void {
  currentTransport = mockTransport;
}
