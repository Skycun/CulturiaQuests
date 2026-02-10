// https://nuxt.com/docs/api/configuration/nuxt-config
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
    '@nuxtjs/device',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/leaflet',
    'nuxt-charts',
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
      // Google Fonts
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
      allowDesktop: process.env.NUXT_PUBLIC_ALLOW_DESKTOP || 'false',
    },
  },
  strapi: {
    prefix: '/api',
    admin: '/admin',
    version: 'v5',
    cookie: {
      path: '/',
      maxAge: 14 * 24 * 60 * 60, // 14 jours
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    cookieName: 'culturia_jwt',
  },

  // Configuration de pinia-plugin-persistedstate
  // Force l'utilisation de localStorage uniquement pour éviter l'erreur 431
  // (Request Header Fields Too Large causée par des cookies trop volumineux)
  piniaPersistedstate: {
    storage: 'localStorage',
  },
})