// VORA Perfume Shop - Service Worker for PWA
// Version: 1.0.0

const CACHE_NAME = 'vora-v1.0.0';
const STATIC_CACHE = 'vora-static-v1';
const DYNAMIC_CACHE = 'vora-dynamic-v1';
const IMAGE_CACHE = 'vora-images-v1';

// Files to cache immediately
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
    '/confirmation-page.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap',
    'https://js.stripe.com/v3/'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS.map(url => {
                    return new Request(url, { credentials: 'same-origin' });
                }));
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name !== STATIC_CACHE && 
                                   name !== DYNAMIC_CACHE && 
                                   name !== IMAGE_CACHE;
                        })
                        .map((name) => {
                            console.log('Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests (except for known CDNs)
    if (url.origin !== location.origin && 
        !url.hostname.includes('fonts.googleapis.com') &&
        !url.hostname.includes('fonts.gstatic.com') &&
        !url.hostname.includes('cdn.tailwindcss.com') &&
        !url.hostname.includes('js.stripe.com')) {
        return;
    }

    // Handle different resource types
    if (request.destination === 'image') {
        event.respondWith(imageCacheStrategy(request));
    } else if (request.destination === 'font') {
        event.respondWith(fontCacheStrategy(request));
    } else if (request.destination === 'style' || request.destination === 'script') {
        event.respondWith(staticCacheStrategy(request));
    } else if (request.destination === 'document' || request.mode === 'navigate') {
        event.respondWith(documentCacheStrategy(request));
    } else {
        event.respondWith(dynamicCacheStrategy(request));
    }
});

// Cache strategies

// Images - Cache first, then network
async function imageCacheStrategy(request) {
    const cache = await caches.open(IMAGE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // Return cached image immediately
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return placeholder for failed images
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 64 180"><rect fill="#fce8f0" width="64" height="180"/><path d="M22d="M18 22 Q18 18 22 18 L42 18 Q46 18 46 22 L50 50 Q52 70 52 90 L52 150 Q52 160 46 160 L18 160 Q12 160 12 150 L12 90 Q12 70 14 50 Z" fill="none" stroke="#f8c8dc" stroke-width="1.5"/><line x1="14" y1="70" x2="50" y2="70" stroke="#f8c8dc"/><line x1="14" y1="100" x2="50" y2="100" stroke="#f8c8dc"/><line x1="14" y1="130" x2="50" y2="130" stroke="#f8c8dc"/></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
}

// Fonts - Cache first
async function fontCacheStrategy(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('', { status: 404 });
    }
}

// Static assets (CSS, JS) - Cache first
async function staticCacheStrategy(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('', { status: 503 });
    }
}

// Documents (HTML) - Network first, then cache
async function documentCacheStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        // Return offline page
        return caches.match('/home.html');
    }
}

// Dynamic content - Network first, cache fallback
async function dynamicCacheStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response(JSON.stringify({ error: 'Offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Handle background sync for orders
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncOrders());
    }
});

async function syncOrders() {
    // Sync pending orders when back online
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_ORDERS' });
    });
}

// Push notifications
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    const data = event.data.json();
    const options = {
        body: data.body || 'لديك تحديث جديد',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'open', title: 'فتح' },
            { action: 'dismiss', title: 'تجاهل' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'VORA', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data || '/')
        );
    }
});

// Periodic background sync for updates
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-products') {
        event.waitUntil(updateProductsCache());
    }
});

async function updateProductsCache() {
    try {
        const response = await fetch('/api/products');
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            await cache.put('/api/products', response.clone());
        }
    } catch (error) {
        console.log('Failed to update products cache');
    }
}