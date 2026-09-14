import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Usar NetworkFirst para HTML: siempre intenta traer la última versión del servidor
// Si no hay conexión, usa la última guardada en caché.
registerRoute(
  new NavigationRoute(new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3
  }))
)

self.addEventListener('message', (e) => {
  if (e.data && 'SKIP_WAITING' === e.data.type) self.skipWaiting()
})
