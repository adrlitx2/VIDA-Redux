/**
 * Service Worker for VIDA³ IPFS Background Image Caching
 * Provides advanced caching strategies for background images
 */

const CACHE_NAME = 'vida3-bg-cache-v1';
const IPFS_GATEWAY_CACHE = 'vida3-ipfs-cache-v1';

// Install event - set up caches
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      console.log('✅ Cache initialized');
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => 
            cacheName.startsWith('vida3-') && 
            cacheName !== CACHE_NAME && 
            cacheName !== IPFS_GATEWAY_CACHE
          )
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - intercept IPFS requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Handle IPFS gateway requests
  if (url.hostname.includes('gateway.pinata.cloud') || 
      url.hostname.includes('ipfs.io') ||
      url.pathname.includes('/ipfs/')) {
    
    event.respondWith(handleIpfsRequest(event.request));
  }
});

async function handleIpfsRequest(request) {
  try {
    // Check cache first
    const cache = await caches.open(IPFS_GATEWAY_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('🎯 Service Worker cache hit:', request.url);
      return cachedResponse;
    }
    
    // Fetch from network
    console.log('📥 Service Worker fetching from network:', request.url);
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok && response.status === 200) {
      const responseToCache = response.clone();
      await cache.put(request, responseToCache);
      console.log('💾 Service Worker cached:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Service Worker fetch error:', error);
    // Return a fallback or throw error
    throw error;
  }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(IPFS_GATEWAY_CACHE).then(() => {
        console.log('🧹 Service Worker cache cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

async function getCacheSize() {
  const cache = await caches.open(IPFS_GATEWAY_CACHE);
  const requests = await cache.keys();
  let totalSize = 0;
  
  for (const request of requests) {
    const response = await cache.match(request);
    if (response) {
      const blob = await response.blob();
      totalSize += blob.size;
    }
  }
  
  return totalSize;
}