<template>
  <div class="bg-white rounded-[25px] p-3 flex items-center justify-between shadow-lg mx-auto w-full h-[100px]">
     <div class="flex flex-col items-center justify-center w-1/3 text-center">
        <span class="font-bold text-2xl font-power">{{ count }}</span>
        <span class="text-[10px] text-gray-500 font-bold leading-tight mt-1">
          {{ count === 0 ? 'Aucun item' : 'sélectionnés' }}
        </span>
     </div>

     <div class="flex items-center justify-center w-1/3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
     </div>

     <div class="flex flex-col items-center justify-center w-1/3 text-center">
        <div class="flex flex-col items-center gap-1">
          <span class="font-bold text-2xl font-power text-green-600">+{{ gain }}</span>
          <div class="flex items-center gap-1 text-gray-600 text-[10px] font-bold">
            <img src="/assets/scrap.png" class="w-3 h-3 object-contain" /> Scrap
          </div>
        </div>
     </div>
  </div>
</template>

<script setup> defineProps({ count: Number, gain: Number }); </script>
<style scoped> .font-power { font-family: 'Montserrat', sans-serif; } </style>