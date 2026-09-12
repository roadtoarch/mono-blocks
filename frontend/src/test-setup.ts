/**
 * Vitest global setup — runs before each test file.
 *
 * - Extends Vitest matchers with @testing-library/jest-dom
 *   (toBeVisible, toHaveTextContent, etc.).
 * - Installs fake-indexeddb so Dexie tests work in jsdom
 *   without a real IndexedDB implementation.
 *
 * @module test-setup
 */

import '@testing-library/jest-dom/vitest';

import 'fake-indexeddb/auto';
