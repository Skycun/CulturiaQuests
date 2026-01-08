<script setup lang="ts">
import { useCharacterStore } from '~/stores/character'
import type { Character, CharacterFormData } from '~/types/character'

// Stores
const characterStore = useCharacterStore()
const user = useStrapiUser()
const config = useRuntimeConfig()

// State
const selectedCharacter = ref<Character | null>(null)
const isCreateMode = ref(false)
const showIconPicker = ref(false)

// Form data
const form = ref<CharacterFormData>({
  firstname: '',
  lastname: '',
  iconId: null,
})

// Selected icon for preview
const selectedIconUrl = ref<string | null>(null)

// Computed
const isAuthenticated = computed(() => !!user.value)
const isEditing = computed(() => selectedCharacter.value !== null || isCreateMode.value)
const formTitle = computed(() => isCreateMode.value ? 'Nouveau personnage' : 'Modifier le personnage')

// Helper function for icon URLs
function getIconUrl(icon: any): string | null {
  if (!icon) return null
  const url = icon.url || icon.attributes?.url || icon.data?.attributes?.url
  if (!url) return null
  if (url.startsWith('/')) {
    return `${config.public.strapi.url}${url}`
  }
  return url
}

// Actions
function selectCharacter(character: Character) {
  selectedCharacter.value = character
  isCreateMode.value = false

  // Populate form
  form.value = {
    firstname: character.firstname || character.attributes?.firstname || '',
    lastname: character.lastname || character.attributes?.lastname || '',
    iconId: character.icon?.id || character.attributes?.icon?.data?.id || null,
  }

  // Set preview URL
  selectedIconUrl.value = getIconUrl(character.icon || character.attributes?.icon)
}

function startCreate() {
  selectedCharacter.value = null
  isCreateMode.value = true
  form.value = { firstname: '', lastname: '', iconId: null }
  selectedIconUrl.value = null
}

function cancelEdit() {
  selectedCharacter.value = null
  isCreateMode.value = false
  form.value = { firstname: '', lastname: '', iconId: null }
  selectedIconUrl.value = null
}

function selectIcon(icon: any) {
  form.value.iconId = icon.id
  selectedIconUrl.value = getIconUrl(icon)
  showIconPicker.value = false
}

async function handleSubmit() {
  if (isCreateMode.value) {
    const created = await characterStore.createCharacter(form.value)
    if (created) {
      cancelEdit()
    }
  } else if (selectedCharacter.value) {
    const success = await characterStore.saveCharacter(
      selectedCharacter.value.documentId,
      form.value
    )
    if (success) {
      cancelEdit()
    }
  }
}

async function handleDelete() {
  if (!selectedCharacter.value) return

  if (confirm('Supprimer ce personnage ?')) {
    const success = await characterStore.deleteCharacter(selectedCharacter.value.documentId)
    if (success) {
      cancelEdit()
    }
  }
}

// Lifecycle
onMounted(async () => {
  if (isAuthenticated.value) {
    await Promise.all([
      characterStore.fetchCharacters(),
      characterStore.fetchCharacterIcons(),
    ])
  }
})

// Page meta
definePageMeta({
  layout: 'test',
})
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6 font-pixel">Personnages</h1>

    <!-- Not Authenticated -->
    <div v-if="!isAuthenticated" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <p class="text-yellow-700">Vous devez etre connecte pour gerer vos personnages.</p>
      <NuxtLink to="/tests/login" class="text-yellow-700 underline font-bold">
        Se connecter
      </NuxtLink>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Character List -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">Mes personnages ({{ characterStore.characterCount }})</h2>
          <button
            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            @click="startCreate"
          >
            + Nouveau
          </button>
        </div>

        <!-- Loading -->
        <div v-if="characterStore.loading" class="text-gray-500">
          Chargement...
        </div>

        <!-- Character Grid -->
        <div v-else class="grid grid-cols-2 gap-3">
          <div
            v-for="char in characterStore.characters"
            :key="char.id"
            class="p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md"
            :class="selectedCharacter?.id === char.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'"
            @click="selectCharacter(char)"
          >
            <div class="flex items-center gap-3">
              <img
                v-if="getIconUrl(char.icon || char.attributes?.icon)"
                :src="getIconUrl(char.icon || char.attributes?.icon)!"
                :alt="char.firstname"
                class="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
              >
              <div v-else class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-500">
                ?
              </div>
              <div>
                <div class="font-semibold">
                  {{ char.firstname || char.attributes?.firstname }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ char.lastname || char.attributes?.lastname }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!characterStore.loading && !characterStore.hasCharacters" class="text-gray-500 text-center py-8">
          Aucun personnage. Creez-en un !
        </div>
      </div>

      <!-- Right: Edit/Create Form -->
      <div v-if="isEditing" class="bg-white border rounded-lg p-6 shadow-sm">
        <h2 class="text-xl font-semibold mb-4">{{ formTitle }}</h2>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <!-- Icon Selection -->
          <div>
            <label class="block text-sm font-medium mb-2">Icone</label>
            <div class="flex items-center gap-4">
              <div
                class="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 overflow-hidden"
                @click="showIconPicker = true"
              >
                <img
                  v-if="selectedIconUrl"
                  :src="selectedIconUrl"
                  alt="Selected icon"
                  class="w-full h-full object-cover"
                >
                <span v-else class="text-gray-400 text-sm text-center">Choisir</span>
              </div>
              <button
                type="button"
                class="text-sm text-blue-600 hover:underline"
                @click="showIconPicker = true"
              >
                Changer l'icone
              </button>
            </div>
          </div>

          <!-- Firstname -->
          <div>
            <label class="block text-sm font-medium mb-1">Prenom *</label>
            <input
              v-model="form.firstname"
              type="text"
              class="w-full border rounded px-3 py-2"
              required
            >
          </div>

          <!-- Lastname -->
          <div>
            <label class="block text-sm font-medium mb-1">Nom *</label>
            <input
              v-model="form.lastname"
              type="text"
              class="w-full border rounded px-3 py-2"
              required
            >
          </div>

          <!-- Error display -->
          <div v-if="characterStore.error" class="text-red-500 text-sm">
            {{ characterStore.error }}
          </div>

          <!-- Actions -->
          <div class="flex gap-3 pt-4">
            <button
              type="submit"
              class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              :disabled="characterStore.loading"
            >
              {{ characterStore.loading ? 'Enregistrement...' : 'Enregistrer' }}
            </button>

            <button
              type="button"
              class="px-4 py-2 border rounded hover:bg-gray-50"
              @click="cancelEdit"
            >
              Annuler
            </button>

            <button
              v-if="!isCreateMode && selectedCharacter"
              type="button"
              class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-auto"
              @click="handleDelete"
            >
              Supprimer
            </button>
          </div>
        </form>
      </div>

      <!-- Placeholder when not editing -->
      <div v-else class="bg-gray-50 border rounded-lg p-6 flex items-center justify-center text-gray-500">
        Selectionnez un personnage ou creez-en un nouveau
      </div>
    </div>

    <!-- Icon Picker Modal -->
    <Teleport to="body">
      <div
        v-if="showIconPicker"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        @click.self="showIconPicker = false"
      >
        <div class="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Choisir une icone</h3>
            <button
              class="text-gray-500 hover:text-gray-700 text-2xl"
              @click="showIconPicker = false"
            >
              &times;
            </button>
          </div>

          <div v-if="characterStore.iconsLoading" class="text-center py-8">
            Chargement des icones...
          </div>

          <div v-else-if="characterStore.availableIcons.length === 0" class="text-center py-8 text-gray-500">
            Aucune icone disponible
          </div>

          <div v-else class="grid grid-cols-4 sm:grid-cols-6 gap-3">
            <div
              v-for="icon in characterStore.availableIcons"
              :key="icon.id"
              class="aspect-square rounded-lg border-2 cursor-pointer overflow-hidden transition-all hover:border-blue-400"
              :class="form.iconId === icon.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'"
              @click="selectIcon(icon)"
            >
              <img
                :src="getIconUrl(icon)"
                :alt="icon.name"
                class="w-full h-full object-cover"
              >
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
