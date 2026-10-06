import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// GitHub Pages devuelve 404 (con su 404.html) para cualquier ruta profunda
// como /SecuritySystem/messages, así que recargar o abrir un enlace directo
// no llegaba a la SPA. Copiamos el index.html recién construido a 404.html:
// los assets usan rutas absolutas (/SecuritySystem/assets/...), así el bundle
// arranca en cualquier URL y React Router resuelve la ruta con su basename.
const indexHtml = fileURLToPath(new URL('../dist/index.html', import.meta.url))
const notFoundHtml = fileURLToPath(new URL('../dist/404.html', import.meta.url))

if (!existsSync(indexHtml)) {
  console.error('[postbuild-404] No se encontró dist/index.html — ¿se ejecutó "vite build"?')
  process.exit(1)
}

copyFileSync(indexHtml, notFoundHtml)
console.log('[postbuild-404] Generado dist/404.html (fallback SPA para GitHub Pages)')
