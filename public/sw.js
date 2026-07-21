// Minimal service worker — required for "Add to Home Screen" installability.
// No offline caching logic yet; add cache strategies here later if needed.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  self.clients.claim()
})

self.addEventListener('fetch', () => {
  // Pass-through for now — no caching. Network requests behave normally.
})
