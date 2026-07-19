const CACHE_PREFIX = 'vora-';
const CACHE_VERSION = 'v2';
const STATIC_CACHE = CACHE_PREFIX + 'static-' + CACHE_VERSION;
const DYNAMIC_CACHE = CACHE_PREFIX + 'dynamic-' + CACHE_VERSION;
const IMAGE_CACHE = CACHE_PREFIX + 'images-' + CACHE_VERSION;

const STATIC_ASSETS = [
    '/',
    '/home.html',
    '/shop.html',
    '/product.html',
    '/cart.html',
    '/checkout.html',
    '/about.html',
    '/brands.html',
    '/tracking.html',
    '/return-policy.html',
    '/confirmation.html',
    '/account.html',
    '/admin.html',
    '/index.html',
    '/styles.css',
    '/translations.js',
    '/components.js',
    '/page-loader.js',
    '/icons.js',
    '/shop.js',
    '/product.js',
    '/home.js',
    '/cart.js',
    '/checkout.js',
    '/account-page.js',
    '/tracking-page.js',
    '/brands-page.js',
    '/admin.js',
    '/auth.js',
    '/firebase-config.js',
    '/sheets-service.js',
    '/confirmation-page.js',
    '/utils.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS.map(url => new Request(url, { credentials: 'same-origin' }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((name) => name.startsWith(CACHE_PREFIX) && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    if (url.origin !== location.origin) return;

    if (request.destination === 'image') {
        event.respondWith(imageStrategy(request));
    } else if (request.destination === 'style' || request.destination === 'script') {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else if (request.mode === 'navigate') {
        event.respondWith(networkFirstStrategy(request));
    } else {
        event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
    }
});

async function cacheFirstStrategy(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const network = await fetch(request);
        if (network.ok) cache.put(request, network.clone());
        return network;
    } catch {
        return new Response('', { status: 503 });
    }
}

async function networkFirstStrategy(request) {
    try {
        const network = await fetch(request);
        if (network.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, network.clone());
        }
        return network;
    } catch {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cached = await cache.match(request);
        return cached || caches.match('/home.html');
    }
}

async function imageStrategy(request) {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const network = await fetch(request);
        if (network.ok) cache.put(request, network.clone());
        return network;
    } catch {
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 64 180"><rect fill="#fce8f0" width="64" height="180"/><path d="M22 18 L42 18 Q46 18 46 22 L50 50 Q52 70 52 90 L52 150 Q52 160 46 160 L18 160 Q12 160 12 150 L12 90 Q12 70 14 50 Z" fill="none" stroke="#f8c8dc" stroke-width="1.5"/><line x1="14" y1="70" x2="50" y2="70" stroke="#f8c8dc"/><line x1="14" y1="100" x2="50" y2="100" stroke="#f8c8dc"/><line x1="14" y1="130" x2="50" y2="130" stroke="#f8c8dc"/></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
}
