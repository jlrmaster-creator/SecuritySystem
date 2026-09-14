import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/securitysystem/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.3.0')
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      injectManifest: {
        globPatterns: ['**/*.{js,css,svg,png,webmanifest}'],
        globIgnores: ['**/node_modules/**/*', 'index.html'],
      },
      manifest: {
        name: 'SecuritySystem',
        short_name: 'SecuritySystem',
        description: 'Mensajería privada, calendario y grupos protegidos',
        theme_color: '#0F0F1A',
        background_color: '#0F0F1A',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'icon-security.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-security.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
