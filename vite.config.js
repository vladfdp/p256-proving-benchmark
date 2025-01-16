import { defineConfig } from 'vite'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait()
  ],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
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