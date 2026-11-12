/* Offline support for the customer pages only. The scope is /Shopdemo/ when deployed on GitHub Pages. */
'use strict';

const CACHE_PREFIX = 'gifthub-free-pages-';
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const scopeURL = new URL(self.registration.scope);
const basePath = scopeURL.pathname.endsWith('/') ? scopeURL.pathname : `${scopeURL.pathname}/`;
const INDEX_URL = new URL('index.html', scopeURL).href;
const FREE_URL = new URL('gifthub-free.html', scopeURL).href;

function cacheKeyFor(url) {
  if (url.origin !== scopeURL.origin || !url.pathname.startsWith(basePath)) return null;
  if (url.pathname === basePath || url.pathname === `${basePath}index.html`) return INDEX_URL;
  if (url.pathname === `${basePath}gifthub-free.html`) return FREE_URL;
  return null;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([INDEX_URL, FREE_URL]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const key = cacheKeyFor(new URL(request.url));
  if (!key) return; // Do not cache Admin pages or any other site content.

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(key);
      if (saved) return saved;
      throw error;
    }
  })());
});
