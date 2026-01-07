<template>
    <div class="fixed inset-0 z-50 flex flex-col justify-end isolate">
        <!-- Backdrop (Fond grisé) -->
        <div 
            class="absolute inset-0 bg-black/20 backdrop-blur-[1px]" 
            @click="$emit('close')"
        />

        <!-- Panel -->
        <div class="overlay-panel relative w-full h-[80vh] bg-gray-100 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden z-10">
            
            <!-- Handle Bar (Barre de préhension) -->
            <div 
                class="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors" 
                @click="$emit('close')"
            >
                <div class="w-12 h-1.5 bg-gray-300 rounded-full"/>
            </div>

            <!-- Contenu scrollable -->
            <div class="flex-1 overflow-y-auto p-5 pb-20">
                <slot />
            </div>
        </div>
    </div>
</template>

<script setup>
defineEmits(['close']);
</script>
