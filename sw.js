// sw.js - Service Worker com Atualização Automática Forçada

// Mude este nome sempre que quiser forçar uma atualização para todos os usuários
const CACHE_NAME = 'calc-salario-v1';

// Lista de arquivos para salvar localmente (funcionar offline)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png'
];

// 1. INSTALAÇÃO: Baixa os arquivos e força a ativação imediata
self.addEventListener('install', (event) => {
  // Força o SW a "pular a fila" de espera, ativando assim que instalado
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando arquivos da versão:', CACHE_NAME);
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// 2. ATIVAÇÃO: Limpa caches antigos e toma controle das abas abertas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          // Se o cache não for o atual (v1), apaga ele
          if (cache !== CACHE_NAME) {
            console.log('[SW] Apagando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    // Faz o SW controlar as abas abertas imediatamente, sem precisar recarregar
    .then(() => self.clients.claim())
  );
});

// 3. FETCH: Estratégia "Stale-While-Revalidate" (Rápido + Atualizado)
// Tenta servir do cache (rápido), mas busca no servidor em segundo plano para atualizar o cache futuro
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Busca versão nova na rede mesmo se tiver no cache
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });

      // Retorna o cache se existir, senão espera a rede
      return cachedResponse || fetchPromise;
    })
  );
});