import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed to GitHub Pages at https://martins-gil.github.io/Ciclo/, so every
// asset/route needs the /Ciclo/ prefix baked in — that's what `base` does.
const base = '/Ciclo/'

export default defineConfig({
  base,
  // AppData\Roaming\Claude is a Windows package-folder junction on this machine;
  // without this, Vite's realpath-based module id resolution follows the junction
  // while `root` doesn't, so ids stop matching root and every request 404s.
  resolve: {
    preserveSymlinks: true
  },
  server: {
    fs: { strict: false }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        name: 'Ciclo — Gestão de Despesas',
        short_name: 'Ciclo',
        description: 'Gestão pessoal de despesas por ciclo orçamental',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: `${base}index.html`
      },
      devOptions: {
        enabled: false
      }
    })
  ]
})
