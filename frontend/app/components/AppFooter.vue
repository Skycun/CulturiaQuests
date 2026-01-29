<template>
  <div 
    v-show="isFooterVisible"
    class="fixed bottom-0 w-full bg-black/75 text-white flex justify-around py-3 z-[10000] transition-opacity duration-300"
    :class="{ 'opacity-0 pointer-events-none': !isFooterVisible }">

    <NuxtLink
      v-for="item in navItems"
      :key="item.name"
      :to="item.path"
      class="flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity w-20"
      active-class="opacity-100 text-yellow-400">
      <Icon :name="item.icon" class="w-6 h-6 bg-white" />
      <span class="text-xs font-medium">{{ item.name }}</span>
    </NuxtLink>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useFooterVisibility } from '~/composables/useFooterVisibility'

const navItems = ref([
  { name: 'Journaux', icon: 'bxs-book-bookmark', path: '/stories' },
  { name: 'Équipement', icon: 'bx-bx-shield-quarter', path: '/equipement' },
  { name: 'Carte', icon: 'bxs-map-alt', path: '/map' },
  { name: 'Social', icon: 'bxs-user-account', path: '/social' },
  { name: 'Guilde', icon: 'bxs-home-alt-2', path: '/guild' },
])

const { isFooterVisible } = useFooterVisibility()
</script>

<style scoped>
/* Petite astuce : Nuxt ajoute automatiquement la classe 'router-link-active' 
  sur le lien de la page en cours.
  J'ai utilisé la prop 'active-class' ci-dessus pour gérer ça proprement via Tailwind.
*/
</style>