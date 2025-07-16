const CACHE_NAME = 'nodeterm-v1.4.0';
const urlsToCache = [
  '/',
  '/bundle.js',
  '/bundle.js.map',
  '/preload.js',
  '/assets/styles.css',
  '/assets/app-icon.png',
  '/assets/app-icon-192.png',
  '/assets/app-icon-512.png',
  '/assets/app-icon-1024.png',
  '/assets/screenshot-main.png',
  '/manifest.json',
  // Fuentes
  '/78172950b335ccdb94e2.woff2',
  '/a0e477f2f1f9d2376fde.woff2',
  '/e295f70fe3e2df296c7b.woff2'
];

// Instalar service worker
self.addEventListener('install', event => {
  console.log('🔧 NodeTerm SW: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 NodeTerm SW: Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('❌ NodeTerm SW: Error al cachear:', err);
      })
  );
  self.skipWaiting();
});

// Activar service worker
self.addEventListener('activate', event => {
  console.log('✅ NodeTerm SW: Activado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ NodeTerm SW: Eliminando cache antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptar requests (estrategia Cache First para assets, Network First para API)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Solo cachear requests del mismo origin
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolver desde cache
        if (response) {
          console.log('📦 NodeTerm SW: Sirviendo desde cache:', event.request.url);
          return response;
        }
        
        // Si no está en cache, fetch de la red
        return fetch(event.request).then(response => {
          // No cachear si no es una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clonar respuesta porque es un stream
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              console.log('💾 NodeTerm SW: Cacheando nuevo recurso:', event.request.url);
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(err => {
          console.error('❌ NodeTerm SW: Error en fetch:', err);
          // Devolver página offline si hay una
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notificaciones push (para futuras funcionalidades)
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de NodeTerm',
    icon: '/assets/app-icon-192.png',
    badge: '/assets/app-icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir NodeTerm',
        icon: '/assets/app-icon-192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/assets/app-icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('NodeTerm', options)
  );
});

console.log('🚀 NodeTerm Service Worker cargado correctamente'); 