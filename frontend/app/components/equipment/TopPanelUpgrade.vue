<template>
  <div class="flex flex-col gap-2">
     
     <div class="flex justify-between gap-2">
        <div class="bg-white rounded-full px-3 py-1 flex items-center gap-2 shadow-sm border border-gray-100 flex-1 justify-center">
           <img src="/assets/coin.png" class="w-4 h-4 object-contain" />
           <span class="font-bold text-sm text-gray-800">{{ formatNumber(userGold) }}</span>
        </div>
        <div class="bg-white rounded-full px-3 py-1 flex items-center gap-2 shadow-sm border border-gray-100 flex-1 justify-center">
           <img src="/assets/scrap.png" class="w-4 h-4 object-contain" />
           <span class="font-bold text-sm text-gray-800">{{ formatNumber(userScrap) }}</span>
        </div>
     </div>

     <div class="bg-white rounded-[25px] p-2 shadow-lg mx-auto w-full relative overflow-hidden transition-all">
        
        <div v-if="item" class="flex items-center justify-between">
            <div class="flex flex-col items-center gap-1 w-1/3">
                <div class="transform scale-75">
                   <Items v-bind="item" :selected="false" />
                </div>
                <span class="text-[10px] font-bold text-gray-400 uppercase">Niv. {{ item.level }}</span>
            </div>

            <div class="flex flex-col items-center justify-center w-1/3 gap-0.5">
                <div class="flex flex-col items-center mb-1">
                    <span :class="['text-xs font-bold flex items-center gap-1', canAfford ? 'text-gray-700' : 'text-red-500']">
                        -{{ formatNumber(cost.scrap) }} 
                        <img src="/assets/scrap.png" class="w-2.5 h-2.5 object-contain"/>
                    </span>
                    <span :class="['text-xs font-bold flex items-center gap-1', canAfford ? 'text-gray-700' : 'text-red-500']">
                        -{{ formatNumber(cost.gold) }} 
                        <img src="/assets/coin.png" class="w-2.5 h-2.5 object-contain"/>
                    </span>
                </div>
                
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                
                <span class="text-green-600 font-bold text-[10px]">+{{ stats.damageGain }} ATK</span>
            </div>

            <div class="flex flex-col items-center gap-1 w-1/3">
                <div class="transform scale-75 relative">
                   <Items v-bind="item" :level="stats.newLevel" :selected="false" />
                   <div class="absolute -top-2 -right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm border border-white">
                     +{{ increment }}
                   </div>
                </div>
                 <span class="text-[10px] font-bold text-green-600 uppercase">Niv. {{ stats.newLevel }}</span>
            </div>
        </div>

        <div v-else class="h-[80px] flex items-center justify-center text-gray-400 text-xs font-bold text-center">
            Sélectionne un objet<br>pour voir le coût
        </div>

        <div v-if="item" class="flex gap-2 mt-2 border-t border-gray-100 pt-2">
            <button @click="$emit('set-increment', 1)" :class="['flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all', increment === 1 ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-500 hover:bg-gray-50']">+1</button>
            <button @click="$emit('set-increment', 10)" :class="['flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all', increment === 10 ? 'border-black bg-black text-white' : 'border-gray-100 text-gray-500 hover:bg-gray-50']">+10</button>
            <button @click="$emit('set-max')" :class="['flex-1 py-1 rounded-lg text-[10px] font-bold border border-indigo-100 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all']">MAX</button>
        </div>

     </div>
  </div>
</template>

<script setup>
defineProps({ item: Object, userGold: Number, userScrap: Number, cost: Object, stats: Object, increment: Number, canAfford: Boolean });
defineEmits(['set-increment', 'set-max']);
const formatNumber = (num) => { if (!num) return "0"; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); };
</script>