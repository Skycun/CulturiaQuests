<template>
    <div>
        <!-- En-tête du Personnage -->
        <div class="bg-white rounded-3xl p-6 shadow-sm flex items-center gap-4 mb-8">
            <div class="w-20 h-20 shrink-0">
                <img 
                    :src="details.image" 
                    :alt="details.fullName"
                    class="w-full h-full object-cover rounded-full border-2 border-gray-100" 
                />
            </div>

            <div class="flex-1">
                <h1 class="text-3xl font-pixel text-slate-900 leading-tight">
                    {{ details.fullName }}
                </h1>
                <p class="text-slate-500 font-pixel text-lg mb-3">
                    {{ details.job }}
                </p>

                <!-- Barre de progression -->
                <div class="flex items-center gap-3">
                    <div class="flex-1">
                        <UiProgressBar 
                            :current="details.level" 
                            :max="details.maxLevel" 
                        />
                    </div>
                    <span class="text-xl font-pixel text-indigo-900">
                        {{ details.level }}/{{ details.maxLevel }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Liste des Entrées -->
        <div class="space-y-8">
            <template v-if="details.entries && details.entries.length > 0">
                <div v-for="entry in details.entries" :key="entry.id">
                    <h2 class="text-2xl font-black font-power text-slate-900 mb-3">
                        Entrée {{ entry.index }}
                    </h2>
                    <div class="bg-white rounded-2xl p-5 shadow-sm text-sm leading-relaxed text-slate-700 text-justify font-onest">
                        {{ entry.text }}
                    </div>
                </div>
            </template>

            <div v-else class="text-center text-gray-400 italic mt-10">
                Aucune entrée débloquée pour le moment.
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    details: {
        type: Object,
        required: true
    }
});
</script>

<style scoped>
.font-power {
    font-family: 'Power Grotesk', sans-serif;
}
</style>
