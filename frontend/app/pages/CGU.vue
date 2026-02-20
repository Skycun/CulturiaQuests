<template>
  <div class="min-h-screen bg-white p-6">
    <div class="w-full max-w-2xl mx-auto">
      <div class="pt-[env(safe-area-inset-top)]">
        <CguContent />
      </div>

      <!-- Bouton retour -->
      <div class="mt-12 mb-6 flex justify-center">
        <button
          class="text-sm font-pixel text-indigo-600 hover:underline flex items-center gap-2"
          @click="$router.back()"
        >
          ← Retour
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import CguContent from '~/components/legal/CguContent.vue'

definePageMeta({
  layout: 'blank',
})
</script>
