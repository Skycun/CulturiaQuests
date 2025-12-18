<template>
  <span 
    :class="[
      'inline-block rounded-full px-6 py-1.5 text-base font-bold transition-colors border-2 text-center select-none',
      computedClasses
    ]"
  >
    <slot>{{ displayLabel }}</slot>
  </span>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: String,
  // On enlève les 'validator' stricts pour pouvoir gérer l'erreur nous-mêmes
  category: { type: String, default: 'histoire' }, 
  variant: { type: String, default: 'filled' }
});

// 1. Dictionnaire pour l'affichage du texte
const labels = {
  histoire: 'Histoire',
  art: 'Art',
  societe: 'Société',
  nature: 'Nature',
  science: 'Science',
  savoir: 'Savoir-Faire'
};

// 2. Dictionnaire des styles valides
const styles = {
  histoire: {
    filled: 'bg-orange-500 border-orange-500 text-white',
    outline: 'border-orange-500 text-orange-500'
  },
  art: {
    filled: 'bg-sky-500 border-sky-500 text-white',
    outline: 'border-sky-500 text-sky-500'
  },
  societe: {
    filled: 'bg-red-600 border-red-600 text-white',
    outline: 'border-red-600 text-red-600'
  },
  nature: {
    filled: 'bg-green-600 border-green-600 text-white',
    outline: 'border-green-600 text-green-600'
  },
  science: {
    filled: 'bg-purple-600 border-purple-600 text-white',
    outline: 'border-purple-600 text-purple-600'
  },
  savoir: {
    filled: 'bg-amber-700 border-amber-700 text-white',
    outline: 'border-amber-700 text-amber-700'
  }
};

// 3. Style d'erreur (Gris, bordure pointillés)
const errorStyle = 'bg-gray-200 border-gray-400 border-dashed text-gray-500 cursor-not-allowed';

// --- LOGIQUE DE VÉRIFICATION ---

const isCategoryValid = computed(() => {
  return props.category.toLowerCase() in styles;
});

const isVariantValid = computed(() => {
  return ['filled', 'outline'].includes(props.variant);
});

// --- RÉSULTATS CALCULÉS ---

const displayLabel = computed(() => {
  // Cas 1 : Erreur de Catégorie
  if (!isCategoryValid.value) {
    return `Catégorie Inconnue (${props.category})`;
  }

  // Cas 2 : Erreur de Variante
  if (!isVariantValid.value) {
    return `Variante Inconnue (${props.variant})`;
  }

  // Cas Normal
  if (props.label) return props.label;
  const key = props.category.toLowerCase();
  return labels[key] || key;
});

const computedClasses = computed(() => {
  // Si l'un des deux est invalide, on renvoie le style d'erreur
  if (!isCategoryValid.value || !isVariantValid.value) {
    return errorStyle;
  }

  // Cas Normal
  const cat = props.category.toLowerCase();
  const styleGroup = styles[cat];
  return styleGroup[props.variant];
});
</script>