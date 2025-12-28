<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-4">
    <div class="w-full max-w-lg p-8">
      <h1 class="text-3xl font-bold font-pixel text-center mb-6 text-indigo-600">
        Inscription
      </h1>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <PixelInput
          v-model="form.username"
          type="text"
          label="Nom d'utilisateur"
          placeholder="Entrez votre nom d'utilisateur"
          :disabled="loading"
        />

        <PixelInput
          v-model="form.email"
          type="email"
          label="Email"
          placeholder="Entrez votre email"
          :disabled="loading"
        />

        <PixelInput
          v-model="form.password"
          type="password"
          label="Mot de passe"
          placeholder="Entrez votre mot de passe"
          :disabled="loading"
        />

        <PixelInput
          v-model="form.guildName"
          type="text"
          label="Nom de la guilde"
          placeholder="Entrez le nom de votre guilde"
          :disabled="loading"
        />

        <PixelInput
          v-model="form.characterName"
          type="text"
          label="Nom du personnage"
          placeholder="Entrez le nom de votre personnage"
          :disabled="loading"
        />

        <div class="space-y-2">
          <label class="block text-sm font-pixel text-indigo-600">
            Icône du personnage
          </label>
          <div class="grid grid-cols-4 sm:grid-cols-6 gap-3">
            <div
              v-for="icon in icons"
              :key="icon.id"
              @click="!loading && (form.iconId = icon.id)"
              :class="[
                'cursor-pointer transition-all',
                form.iconId === icon.id
                  ? 'pixel-notch bg-indigo-600 p-[4px]'
                  : 'hover:scale-110',
                loading && 'opacity-50 cursor-not-allowed'
              ]"
            >
              <div v-if="form.iconId === icon.id" class="pixel-notch bg-white p-1">
                <img :src="icon.url" alt="Character icon" class="w-full h-full object-contain" />
              </div>
              <img v-else :src="icon.url" alt="Character icon" class="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <div v-if="error" class="text-red-500 text-sm mt-2">
          {{ error }}
        </div>

        <PixelButton
          type="submit"
          :disabled="loading"
          variant="filled"
          color="indigo"
        >
          {{ loading ? 'Inscription en cours...' : 'S\'inscrire' }}
        </PixelButton>

        <div class="text-center mt-4">
          <p class="text-sm font-pixel">
            Déjà un compte ?
            <NuxtLink to="/account/login" class="text-indigo-600 hover:underline">
              Se connecter
            </NuxtLink>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'
import { useCharacterStore } from '~/stores/character'
import PixelInput from '~/components/form/PixelInput.vue'
import PixelButton from '~/components/form/PixelButton.vue'

const { register } = useStrapiAuth()
const user = useStrapiUser()
const router = useRouter()
const guildStore = useGuildStore()
const characterStore = useCharacterStore()

const form = ref({
  username: '',
  email: '',
  password: '',
  guildName: '',
  characterName: '',
  iconId: null as number | null
})

const loading = ref(false)
const error = ref<string | null>(null)

// Charger les icônes de personnage
const icons = ref([])
onMounted(async () => {
  await characterStore.fetchCharacterIcons()
  icons.value = characterStore.availableIcons
})

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = null

    // Validation de l'icône
    if (!form.value.iconId) {
      error.value = 'Veuillez sélectionner une icône pour votre personnage'
      loading.value = false
      return
    }

    // Étape 1 : Créer le compte utilisateur
    await register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
    })

    // Attendre que l'utilisateur soit bien créé
    if (!user.value?.id) {
      throw new Error('Erreur lors de la création du compte')
    }

    // Étape 2 : Créer la guilde, personnage et items
    await guildStore.createGuildSetup({
      guildName: form.value.guildName,
      characterName: form.value.characterName,
      iconId: form.value.iconId
    })

    // Étape 3 : Redirection vers l'accueil
    await router.push('/')

  } catch (e: any) {
    console.error('Registration error:', e)
    error.value = e?.error?.message || 'Une erreur est survenue lors de l\'inscription.'
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'blank',
})
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
</style>
