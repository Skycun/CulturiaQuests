<template>
  <div class="p-4 sm:p-10 min-h-screen flex justify-center">
    
    <div class="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-6 w-full max-w-4xl">
      
      <Items 
        :level="35" rarity="legendary" image="/assets/charm2.png" 
        category="Charm" :types="['science', 'nature']"
        :selected="true"
      />

      <Items 
        :level="12" rarity="common" image="/assets/weapon1.png" 
        category="Weapon" :types="['science']" :selected="false"
      />
      
      <Items 
        :level="45" rarity="epic" image="/assets/weapon2.png" 
        category="Weapon" :types="['make']"
      />

       <Items 
        :level="5" rarity="rare" image="/assets/helmet2.png" 
        category="Helmet" :types="['art']"
      />

    </div>
  </div>
</template>