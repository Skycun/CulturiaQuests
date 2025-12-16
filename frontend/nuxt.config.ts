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
    // 'pinia-plugin-persistedstate/nuxt', // Disabled to prevent potential conflict
  ],

  // Configuration Strapi
  runtimeConfig: {
    strapi: {
      url: 'http://backend:1337', // Internal Docker URL for SSR
    },
    public: {
      strapi: {
        url: 'http://localhost:1337', // Public URL for Client
      },
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
})