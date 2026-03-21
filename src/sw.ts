/**
 * Custom Service Worker for ShowGroundsLive.
 *
 * Combines Workbox precaching (unchanged offline/caching behaviour) with
 * Web Push notification handling. This file is compiled by vite-plugin-pwa
 * in `injectManifest` mode — Workbox injects the precache manifest at build
 * time into the `self.__WB_MANIFEST` constant below.
 *
 * Push payload shape (sent by the FastAPI backend via pywebpush):
 * {
 *   title: string,
 *   body: string,
 *   url: string,        // deep-link URL to open on tap
 *   tag?: string,       // groups same-type notifications (replaces previous)
 *   urgent?: boolean,   // true → requireInteraction (stays on screen)
 * }
 */

/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

// Take control of all clients immediately on activation
clientsClaim();

// self.__WB_MANIFEST is injected by vite-plugin-pwa at build time.
// In dev mode (devOptions.enabled=true) the manifest is an empty array —
// guard with a fallback so the SW registers without throwing.
precacheAndRoute(self.__WB_MANIFEST ?? []);
cleanupOutdatedCaches();

// Runtime caching: Google Fonts (same rules as previous workbox config)
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new CacheFirst({
    cacheName: "google-fonts-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "gstatic-fonts-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ── Push Notifications ────────────────────────────────────────────────────────

/**
 * Handle incoming push events from the browser push service (Google FCM / Apple APNs).
 * Parses the JSON payload sent by the FastAPI backend and shows an OS notification.
 */
self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let data: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    urgent?: boolean;
  } = {};

  try {
    data = event.data.json();
  } catch {
    data = { title: "ShowGroundsLive", body: event.data.text() };
  }

  const title = data.title ?? "ShowGroundsLive";
  const options = {
    body: data.body ?? "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: { url: data.url ?? "/" },
    tag: data.tag,
    requireInteraction: data.urgent ?? false,
    vibrate: [200, 100, 200],
  } as NotificationOptions;

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Handle notification click events.
 * Focuses an existing app window if one is open, otherwise opens a new one.
 * Always navigates to the deep-link URL stored in notification.data.url.
 */
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();

  const url: string = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an already-open window and navigate it to the target URL
        const existing = clientList.find(
          (client) => client.url.startsWith(self.location.origin)
        );
        if (existing) {
          existing.navigate(url);
          return existing.focus();
        }
        // No open window — open a new one
        return self.clients.openWindow(url);
      })
  );
});
