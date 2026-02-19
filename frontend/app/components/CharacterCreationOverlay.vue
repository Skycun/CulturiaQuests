<template>
  <transition name="slide-up">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex flex-col">

      <div class="absolute inset-0 bg-gray-100/95 backdrop-blur-sm" @click="$emit('close')"></div>

      <div class="relative flex flex-col h-full w-full max-w-lg mx-auto pointer-events-none">

        <OverlayHeader title="Nouveau personnage" @close="$emit('close')" />

        <div class="pointer-events-auto flex-1 overflow-y-auto px-6 py-4 space-y-6">

          <PixelInput
            v-model="firstname"
            type="text"
            label="Prénom du personnage"
            placeholder="Entrez le prénom"
            :disabled="creating"
            required
          />

          <PixelInput
            v-model="lastname"
            type="text"
            label="Nom du personnage"
            placeholder="Entrez le nom"
            :disabled="creating"
            required
          />

          <IconPicker
            v-model="selectedIconId"
            :items="filteredIcons"
            :loading="characterStore.iconsLoading"
            :disabled="creating"
            label="Choisissez l'icône de votre personnage"
            :get-image-url="getIconUrl"
          />

          <p class="text-sm font-pixel text-gray-500 text-center">
            Ce personnage arrivera sans équipement. Le choix de l'icône est définitif.
          </p>

          <Alert v-if="errorMsg" :message="errorMsg" variant="error" />

        </div>

        <div class="pointer-events-auto px-6 pb-safe-bottom pt-2">
          <PixelButton
            :disabled="!canSubmit || creating"
            variant="filled"
            color="indigo"
            class="w-full"
            @click="handleCreate"
          >
            {{ creating ? 'Création en cours...' : 'Créer le personnage' }}
          </PixelButton>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useCharacterStore } from '~/stores/character';
import { useFooterVisibility } from '~/composables/useFooterVisibility';
import OverlayHeader from './equipment/OverlayHeader.vue';
import PixelInput from './form/PixelInput.vue';
import PixelButton from './form/PixelButton.vue';
import IconPicker from './form/IconPicker.vue';
import Alert from './form/Alert.vue';

const props = defineProps({
  isOpen: Boolean,
});
const emit = defineEmits(['close', 'created']);

const characterStore = useCharacterStore();
const config = useRuntimeConfig();
const { hideFooter, showFooter } = useFooterVisibility();

const firstname = ref('');
const lastname = ref('');
const selectedIconId = ref(null);
const creating = ref(false);
const errorMsg = ref(null);

function getIconUrl(icon) {
  if (!icon || !icon.url) return '';
  if (icon.url.startsWith('/')) {
    return `${config.public.strapi.url}${icon.url}`;
  }
  return icon.url;
}

const filteredIcons = computed(() => characterStore.filteredAvailableIcons);

const canSubmit = computed(() => {
  return !!(firstname.value.trim() && lastname.value.trim() && selectedIconId.value);
});

watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    firstname.value = '';
    lastname.value = '';
    selectedIconId.value = null;
    errorMsg.value = null;
    hideFooter();
    if (characterStore.availableIcons.length === 0) {
      await characterStore.fetchCharacterIcons();
    }
  } else {
    showFooter();
  }
});

async function handleCreate() {
  if (!canSubmit.value || creating.value) return;

  creating.value = true;
  errorMsg.value = null;

  try {
    const result = await characterStore.createCharacter({
      firstname: firstname.value.trim(),
      lastname: lastname.value.trim(),
      iconId: selectedIconId.value,
    });

    if (result) {
      await characterStore.fetchCharacters(true);
      emit('created');
      emit('close');
    } else {
      errorMsg.value = characterStore.error || 'Erreur lors de la création du personnage.';
    }
  } catch (e) {
    errorMsg.value = e?.error?.message || e?.message || 'Erreur lors de la création du personnage.';
  } finally {
    creating.value = false;
  }
}
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px); }
.pb-safe-bottom { padding-bottom: max(24px, env(safe-area-inset-bottom)); }
</style>
