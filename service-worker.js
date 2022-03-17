self.addEventListener('install', (event) => {
  event.waitUntil(

    caches.open("polyriddim-offline").then((cache) => {
      return cache.addAll(['index.html', 'main.css', 'main.js'])
    })
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})