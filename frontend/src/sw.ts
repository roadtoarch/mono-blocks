/**
 * Service Worker entry point.
 *
 * Built by @serwist/vite as an IIFE bundle.
 *
 * Caching strategy (DEC-5: SW handles HTTP-level; middleware handles app-level):
 *   - Precache:     App shell assets (Vite build output)
 *   - Navigation:   StaleWhileRevalidate — instant page load, background update
 *   - API GET:      NetworkFirst (5s timeout) — fresh data preferred, cache fallback
 *   - Statics:      CacheFirst — content-hashed by Vite, safe to cache long-term
 *   - Images:       CacheFirst + ExpirationPlugin (60 entries, 30d max age)
 *
 * Registration is gated by `VITE_ENABLE_SW=true` in dev mode (DEC-11).
 * In production builds, the SW always registers.
 */
import { CacheFirst, ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from 'serwist';

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Populated by @serwist/vite at build time with the precache manifest.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // skipWaiting is deferred to the app's SwUpdateProvider, which sends
  // a SKIP_WAITING message when the user clicks "Refresh". This enables
  // the update-prompt UX (6.1). The SW will not auto-activate.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: import.meta.env.PROD,
  runtimeCaching: [
    // Navigation requests: stale-while-revalidate for instant page loads
    {
      matcher: ({ request }) => request.mode === 'navigate',
      handler: new StaleWhileRevalidate({ cacheName: 'navigation' }),
    },
    // API GET requests: network-first with 5s timeout — fresh data when online
    {
      matcher: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
      handler: new NetworkFirst({
        cacheName: 'api-data',
        networkTimeoutSeconds: 5,
      }),
    },
    // Static assets: cache-first — content-hashed by Vite, safe long-term
    {
      matcher: ({ request }) =>
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font',
      handler: new CacheFirst({ cacheName: 'static-assets' }),
    },
    // Images: cache-first with expiration to prevent unbounded growth
    {
      matcher: ({ request }) => request.destination === 'image',
      handler: new CacheFirst({
        cacheName: 'images',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 3600, // 30 days
          }),
        ],
      }),
    },
  ],
});

// Handle SKIP_WAITING message from the app's SwUpdateProvider (6.1).
// The app prompts the user to refresh when a new SW is installed;
// clicking "Refresh" sends this message to activate the new SW.
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if ((event.data as { type: string }).type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

// Cache cleanup on activate (6.2 / NFR-4): delete any cache that is
// not in the current allowlist. This removes stale caches from previous
// SW versions within 24h of a new SW taking control.
const CACHE_ALLOWLIST = new Set(['navigation', 'api-data', 'static-assets', 'images']);

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !CACHE_ALLOWLIST.has(name) && !name.startsWith('serwist-'))
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});

serwist.addEventListeners();
