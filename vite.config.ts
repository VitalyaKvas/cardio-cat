import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8'),
) as { version: string }

// GitHub Pages serves the app under https://<user>.github.io/cardio-cat/.
// Override with VITE_BASE=/ at build time if deploying to a custom domain.
const PAGES_BASE = '/cardio-cat/'

// GitHub Pages has no server-side rewrite for client-side routing, so deep
// links (e.g. /cardio-cat/welcome) 404 unless we ship a fallback. Mirroring
// index.html to 404.html lets Pages serve the SPA for unknown paths.
function spaPagesFallback(): Plugin {
  return {
    name: 'spa-pages-fallback',
    apply: 'build',
    closeBundle() {
      const src = fileURLToPath(new URL('./dist/index.html', import.meta.url))
      const dst = fileURLToPath(new URL('./dist/404.html', import.meta.url))
      if (existsSync(src)) copyFileSync(src, dst)
    },
  }
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.VITE_BASE ?? PAGES_BASE) : '/',
  plugins: [vue(), vueDevTools(), tailwindcss(), spaPagesFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts') || id.includes('vue-echarts') || id.includes('zrender')) {
              return 'echarts'
            }
            if (id.includes('vue-i18n')) return 'i18n'
            if (id.includes('vue-router')) return 'vue-router'
            if (id.includes('pinia')) return 'pinia'
          }
        },
      },
    },
  },
}))
