<template>
  <div class="fixed bottom-0 w-full bg-black/75 text-white flex justify-around py-3 z-50">
    
    <button 
      v-for="item in navItems" 
      :key="item.name"
      class="flex flex-col items-center gap-1 opacity-100 hover:opacity-70 transition-opacity w-20"
    >
      <!-- <img 
        :src="item.icon" 
        :alt="item.name" 
        class="w-6 h-6 invert" 
      /> -->
      <Icon :name="item.icon" class="w-6 h-6 bg-white" />
      <span class="text-xs font-medium">{{ item.name }}</span>
    </button>

  </div>
</template>

<script setup>
import { ref } from 'vue';

const navItems = ref([
  { name: 'Histoire', icon: 'bxs-book-bookmark' },
  { name: 'Équipement', icon: 'bx-bx-shield-quarter' },
  { name: 'Carte', icon: 'bxs-map-alt' },
  { name: 'Social', icon: 'bxs-user-account' },
  { name: 'Guilde', icon: 'bxs-home-alt-2' },
]);
</script>