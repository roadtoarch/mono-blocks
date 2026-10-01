/**
 * MonoBlocks — API transport resolver
 *
 * Central place to obtain the current `Transport` function. The default is the
 * in-memory `mockTransport` (mockDb), which keeps unit tests hermetic; the app
 * entry point (`main.tsx`) calls `setTransport(request)` at startup to switch
 * every Resource to the real axios-based pipeline.
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
export const getTransport = (): Transport => {
  return currentTransport;
};

/**
 * Replace the active transport (e.g. switch from mock to real API).
 * Call once at app startup after auth is initialised.
 */
export const setTransport = (transport: Transport): void => {
  currentTransport = transport;
};

/**
 * Reset to mock transport (useful for tests / storybook).
 */
export const resetTransport = (): void => {
  currentTransport = mockTransport;
};
