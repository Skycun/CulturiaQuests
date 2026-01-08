<template>
  <button 
    :class="[
      'p-[4px] pixel-notch group active:scale-95 transition-transform mx-auto block mt-6 select-none',
      outerColorClass
    ]"
  >
    <div 
      :class="[
        'h-full w-full pixel-notch flex items-center justify-center py-4 px-6',
        variant === 'outline' ? 'bg-white' : ''
      ]"
    >
      <span 
        :class="[
          'text-xl tracking-wide font-pixel ',
          textColorClass
        ]"
      >
        <slot />
      </span>
    </div>
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 'filled' = bouton plein, 'outline' = bordure colorée fond blanc
  variant: {
    type: String,
    default: 'filled',
    validator: (v) => ['filled', 'outline'].includes(v)
  },
  // La couleur thématique
  color: {
    type: String,
    default: 'indigo',
    validator: (v) => ['indigo', 'red', 'darker-red'].includes(v)
  }
});

// 1. Gestion de la couleur EXTÉRIEURE (Bordure ou Fond global)
const outerColorClass = computed(() => {
  if (props.color === 'indigo') {
    return 'bg-indigo-600 hover:bg-indigo-700';
  }
  if (props.color === 'red') {
    return 'bg-[#d50000] hover:bg-[#b71c1c]';
  }
  if (props.color === 'darker-red'){
    return 'bg-[#B93121] hover:bg-[#8B2315]';
  } 
  return '';
});

// 2. Gestion de la couleur du TEXTE
const textColorClass = computed(() => {
  // Si le bouton est plein, le texte est toujours blanc
  if (props.variant === 'filled') {
    return 'text-white';
  }
  
  // Si le bouton est 'outline', le texte prend la couleur du thème
  if (props.color === 'indigo') return 'text-indigo-600';
  if (props.color === 'red') return 'text-[#d50000]';
  if (props.color === 'darker-red') return 'text-[#B93121]';
  return '';
});
</script>

<style scoped>
.pixel-notch {
  clip-path: polygon(
    0px 6px, 6px 6px, 6px 0px,
    calc(100% - 6px) 0px, calc(100% - 6px) 6px, 100% 6px,
    100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%,
    6px 100%, 6px calc(100% - 6px), 0px calc(100% - 6px)
  );
}

/* Utile pour empêcher la sélection de texte accidentelle sur mobile lors des clics répétés */
.select-none {
  user-select: none;
  -webkit-user-select: none;
}
</style>