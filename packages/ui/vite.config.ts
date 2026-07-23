import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AxewoMicroUI',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
    },
    rollupOptions: {
      external: [
        'vue',
        'vue-router',
        'pinia',
        'vue-i18n',
        '@axewo/micro-core',
        '@axewo/micro-shared',
      ],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
})
