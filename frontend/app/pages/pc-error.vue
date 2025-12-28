<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-8">
    <div class="max-w-2xl mx-auto text-center">
      <div class="mb-8">
        <svg
          class="w-32 h-32 mx-auto text-red-500 mb-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>

      <h1 class="text-4xl font-bold font-pixel text-red-600 mb-6">
        Application Mobile Uniquement
      </h1>

      <div class="bg-red-50 border-2 border-red-200 rounded-lg p-8 mb-8">
        <p class="text-xl text-gray-800 mb-4">
          Cette application est conçue exclusivement pour les appareils mobiles.
        </p>
        <p class="text-lg text-gray-600">
          Veuillez accéder à <span class="font-pixel text-indigo-600">CulturiaQuests</span> depuis votre smartphone ou tablette pour profiter de l'expérience complète.
        </p>
      </div>

      <div class="bg-gray-100 rounded-lg p-6">
        <h2 class="text-xl font-bold font-pixel text-indigo-600 mb-4">
          Pourquoi mobile uniquement ?
        </h2>
        <ul class="text-left space-y-3 text-gray-700">
          <li class="flex items-start">
            <span class="text-indigo-600 mr-2">📱</span>
            <span>Géolocalisation en temps réel pour découvrir les points d'intérêt</span>
          </li>
          <li class="flex items-start">
            <span class="text-indigo-600 mr-2">🗺️</span>
            <span>Expérience de jeu basée sur vos déplacements</span>
          </li>
          <li class="flex items-start">
            <span class="text-indigo-600 mr-2">📸</span>
            <span>Interactions avec l'environnement via votre appareil photo</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})
</script>
