const CACHE_NAME = 'cashflo-v1.4.0';
const API_CACHE_NAME = 'cashflo-api-v1.4.0';
const FINANCIAL_CACHE = 'cashflo-financial-v1.4.0';

// Essential files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
  '/_next/static/chunks/pages/index.js',
];

// Install service worker
self.addEventListener('install', (event) => {
  console.log('🚀 Cashflo Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching essential files');
        return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .catch((error) => {
        console.warn('Failed to cache some resources:', error);
        // Don't fail installation if some resources can't be cached
      })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', (event) => {
  console.log('✅ Cashflo Service Worker activated');

  event.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch handler - implements caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip Supabase auth requests (need real-time)
  if (url.hostname.includes('supabase') && url.pathname.includes('auth')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Strategy 1: Cache first for static assets
        if (url.pathname.startsWith('/_next/static/') ||
            url.pathname.includes('.css') ||
            url.pathname.includes('.js') ||
            url.pathname === '/manifest.json') {

          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }

        // Strategy 2: Network first for API calls with cache fallback
        if (url.hostname.includes('supabase') || url.pathname.startsWith('/api/')) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const cache = await caches.open(API_CACHE_NAME);
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            console.log('📡 Network failed, trying cache for:', url.pathname);
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          }
        }

        // Strategy 3: Stale while revalidate for main app
        const cachedResponse = await caches.match(request);
        const networkResponsePromise = fetch(request).then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            const cache = caches.open(CACHE_NAME);
            cache.then(c => c.put(request, responseClone));
          }
          return response;
        }).catch(() => null);

        return cachedResponse || await networkResponsePromise || await caches.match('/offline');

      } catch (error) {
        console.error('Fetch failed:', error);

        // Return offline page for navigation requests
        if (request.destination === 'document') {
          return caches.match('/offline');
        }

        // Return a simple response for other requests
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
});

// Background sync for when connection returns
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag);

  if (event.tag === 'background-sync-transactions') {
    event.waitUntil(
      // This would sync pending transactions when connection returns
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACKGROUND_SYNC',
            action: 'sync-transactions'
          });
        });
      })
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'You have bills due soon!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'cashflo-notification',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Bills',
        icon: '/icons/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/action-dismiss.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Cashflo', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

// Share target (when other apps share to Cashflo)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const text = formData.get('text') || '';
        const title = formData.get('title') || '';

        // Try to extract expense info from shared text
        const amount = text.match(/\$?(\d+\.?\d*)/)?.[1];
        const description = title || text.split('$')[0].trim();

        return Response.redirect(`/?shared=${encodeURIComponent(JSON.stringify({
          amount,
          description,
          type: 'expense'
        }))}`, 303);
      })()
    );
  }
});

console.log('💰 Cashflo Service Worker loaded successfully!');