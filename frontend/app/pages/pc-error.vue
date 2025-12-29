<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-8">
    <div class="max-w-2xl mx-auto text-center">
      <div class="mb-8">
        <Icon name="bx:x" class="w-64 h-64 bg-red-600" />
      </div>

      <h1 class="text-3xl font-power text-red-600 mb-6">
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
