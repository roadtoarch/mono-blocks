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
  skipWaiting: true,
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

serwist.addEventListeners();
