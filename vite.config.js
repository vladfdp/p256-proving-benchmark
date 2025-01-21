import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import mkcert from 'vite-plugin-mkcert'
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    mkcert()
  ],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    https: true,
    host: true,
  },
  root: 'web',
  build: {
    target: 'esnext',
    outDir: '../dist',
  },
  resolve: {
    alias: {
      '@': '/src',
      'stream': 'stream-browserify',
      'crypto': 'crypto-browserify'
    }
  }
});