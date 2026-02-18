// https://nuxt.com/docs/api/configuration/nuxt-config
import path from 'path';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
    '@hypernym/nuxt-anime',
    '@nuxtjs/strapi',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/leaflet',
    'nuxt-charts',
    '@nuxtjs/device',
  ],

  // Configuration pinia-plugin-persistedstate
  // Force localStorage pour éviter l'erreur 431 (cookies trop volumineux)
  piniaPluginPersistedstate: {
    storage: 'localStorage',
  },

  // CSS principal
  css: ['~/assets/css/main.css'],

  // Configuration des fonts avec @nuxt/fonts
  fonts: {
    families: [
      {
        name: 'Onest',
        provider: 'google',
        weights: [400, 500, 600, 700],
      },
      {
        name: 'Jersey 10',
        provider: 'google',
        weights: [400],
      },
      // Neue Power est gérée via @font-face dans main.css
    ],
  },

  // Configuration Tailwind CSS
  tailwindcss: {
    cssPath: '~/assets/css/main.css',
    configPath: 'tailwind.config.ts',
  },

  // Configuration Strapi
  runtimeConfig: {
    strapi: {
      url: 'http://backend:1337', // Internal Docker URL for SSR
    },
    public: {
      strapi: {
        url: 'http://localhost:1337', // Public URL for Client
      },
      allowDesktop: 'true', // Overridden by NUXT_PUBLIC_ALLOW_DESKTOP at runtime
    },
  },
  strapi: {
    prefix: '/api',
    admin: '/admin',
    version: 'v5',
    auth: {
      populate: ['role'],
    },
    cookie: {
      path: '/',
      maxAge: 14 * 24 * 60 * 60, // 14 jours
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    cookieName: 'culturia_jwt',
  },

  // Configuration de la compilation
  build: {
    transpile: [
      'kdbush', 
      'd3-sankey', 
      'd3-array', 
      'd3-shape', 
      'd3-path', 
      'd3-hierarchy',
      '@unovis/ts', 
      '@unovis/vue'
    ],
  },

  // Configuration Vite
  vite: {
    optimizeDeps: {
      exclude: ['d3-sankey', '@unovis/ts', '@unovis/vue'],
    },
    resolve: {
      alias: {
        // Alias direct vers le fichier source pour contourner les problèmes de package.json
        'd3-sankey': path.resolve(__dirname, 'node_modules/d3-sankey/src/index.js'),
      },
    },
  },

  // Configuration de pinia-plugin-persistedstate
  // Force l'utilisation de localStorage uniquement pour éviter l'erreur 431
  // (Request Header Fields Too Large causée par des cookies trop volumineux)
  piniaPersistedstate: {
    storage: 'localStorage',
  },
})