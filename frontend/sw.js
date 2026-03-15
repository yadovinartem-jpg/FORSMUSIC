// Версия кеша - меняйте при обновлении файлов
const CACHE_VERSION = 'v1';
const CACHE_NAME = `forsity-music-${CACHE_VERSION}`;

// Файлы для кеширования при установке - с вашими именами иконок
const CACHE_FILES = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icons/maskable_icon_x72.png',
  './icons/maskable_icon_x96.png',
  './icons/maskable_icon_x128.png',
  './icons/maskable_icon_x192.png',
  './icons/maskable_icon_x384.png',
  './icons/maskable_icon_x512.png',
  'https://telegram.org/js/telegram-web-app.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js'
];

// ========== УСТАНОВКА SERVICE WORKER ==========
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker устанавливается...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Кеш открыт, добавляем файлы...');
        return cache.addAll(CACHE_FILES);
      })
      .then(() => {
        console.log('✅ Все файлы закешированы');
        return self.skipWaiting();
      })
  );
});

// ========== АКТИВАЦИЯ SERVICE WORKER ==========
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker активируется...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`🗑️ Удаляем старый кеш: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker активирован');
      return self.clients.claim();
    })
  );
});

// ========== ОБРАБОТКА ЗАПРОСОВ ==========
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Не кешируем запросы к API и Яндекс.Диску
  if (requestUrl.pathname.includes('/api/') || 
      requestUrl.hostname.includes('yandex') ||
      requestUrl.hostname.includes('github')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// ========== ОБРАБОТКА PUSH-УВЕДОМЛЕНИЙ ==========
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Новое обновление!',
    icon: './icons/maskable_icon_x192.png',
    badge: './icons/maskable_icon_x96.png',
    vibrate: [200, 100, 200],
    data: {
      url: './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('FORSITY MUSIC', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
