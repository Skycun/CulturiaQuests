<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-4">
    <div class="w-full max-w-lg p-8">
      <h1 class="text-3xl font-bold font-pixel text-center mb-6 text-indigo-600">
        Inscription
      </h1>

      <!-- Progress Indicator -->
      <ProgressIndicator
        :current-step="currentStep"
        :total-steps="totalSteps"
        :step-titles="stepTitles"
      />

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Step 1: Account Information -->
        <div v-if="currentStep === 1" class="space-y-4">
          <PixelInput
            v-model="form.username"
            type="text"
            label="Nom d'utilisateur"
            placeholder="Entrez votre nom d'utilisateur"
            :disabled="loading"
            required
          />

          <PixelInput
            v-model="form.email"
            type="email"
            label="Email"
            placeholder="Entrez votre email"
            :disabled="loading"
            required
          />

          <PixelInput
            v-model="form.password"
            type="password"
            label="Mot de passe"
            placeholder="Entrez votre mot de passe"
            :disabled="loading"
            required
          />

          <PixelInput
            v-model="form.passwordConfirm"
            type="password"
            label="Confirmer le mot de passe"
            placeholder="Confirmez votre mot de passe"
            :disabled="loading"
            required
          />
        </div>

        <!-- Step 2: Guild, Character & Icon -->
        <div v-if="currentStep === 2" class="space-y-4">
          <PixelInput
            v-model="form.guildName"
            type="text"
            label="Nom de la guilde"
            placeholder="Entrez le nom de votre guilde"
            :disabled="loading"
            required
          />

          <PixelInput
            v-model="form.firstname"
            type="text"
            label="Prénom du personnage"
            placeholder="Entrez le prénom de votre personnage"
            :disabled="loading"
            required
          />

          <PixelInput
            v-model="form.lastname"
            type="text"
            label="Nom du personnage"
            placeholder="Entrez le nom de votre personnage"
            :disabled="loading"
            required
          />

          <IconPicker
            v-model="form.iconId"
            :items="icons"
            :loading="iconsLoading"
            :disabled="loading"
            label="Choisissez l'icône de votre personnage"
            :get-image-url="getIconUrl"
          />
        </div>

        <!-- Error Message -->
        <Alert :message="error" variant="error" />

        <!-- Navigation Buttons -->
        <div class="flex gap-3 pt-4">
          <PixelButton
            v-if="currentStep > 1"
            type="button"
            :disabled="loading"
            variant="filled"
            color="indigo"
            class="flex-1 !text-white"
            @click="previousStep"
          >
            Précédent
          </PixelButton>

          <PixelButton
            v-if="currentStep < totalSteps"
            type="button"
            :disabled="loading || !canProceed"
            variant="filled"
            color="indigo"
            class="flex-1"
            @click="nextStep"
          >
            Suivant
          </PixelButton>

          <PixelButton
            v-if="currentStep === totalSteps"
            type="submit"
            :disabled="loading || !canProceed"
            variant="filled"
            color="indigo"
            class="flex-1"
          >
            {{ loading ? 'Inscription en cours...' : 'S\'inscrire' }}
          </PixelButton>
        </div>

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
import ProgressIndicator from '~/components/form/ProgressIndicator.vue'
import IconPicker from '~/components/form/IconPicker.vue'
import Alert from '~/components/form/Alert.vue'

const { register } = useStrapiAuth()
const user = useStrapiUser()
const router = useRouter()
const guildStore = useGuildStore()
const characterStore = useCharacterStore()
const config = useRuntimeConfig()

// Helper function to format icon URLs
function getIconUrl(icon: any): string {
  if (!icon || !icon.url) return ''

  // Si l'URL commence par /, ajouter le base URL de Strapi
  if (icon.url.startsWith('/')) {
    return `${config.public.strapi.url}${icon.url}`
  }

  // Sinon retourner l'URL telle quelle
  return icon.url
}

// Multi-step form state
const currentStep = ref(1)
const totalSteps = 2
const stepTitles = [
  'Informations de compte',
  'Guilde, personnage et icône'
]

const form = ref({
  username: '',
  email: '',
  password: '',
  passwordConfirm: '',
  guildName: '',
  firstname: '',
  lastname: '',
  iconId: null as number | null
})

const loading = ref(false)
const error = ref<string | null>(null)

// Validation for each step
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 1:
      return !!(
        form.value.username &&
        form.value.email &&
        form.value.password &&
        form.value.passwordConfirm
      )
    case 2:
      return !!(
        form.value.guildName &&
        form.value.firstname &&
        form.value.lastname &&
        form.value.iconId
      )
    default:
      return false
  }
})

// Navigation functions
function nextStep() {
  error.value = null

  // Validate current step
  if (currentStep.value === 1) {
    if (form.value.password !== form.value.passwordConfirm) {
      error.value = 'Les mots de passe ne correspondent pas'
      return
    }
  }

  if (canProceed.value && currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function previousStep() {
  error.value = null
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

// Charger les icônes de personnage
const icons = ref([])
const iconsLoading = computed(() => characterStore.iconsLoading)

onMounted(async () => {
  await characterStore.fetchCharacterIcons()
  icons.value = characterStore.availableIcons
})

const handleSubmit = async () => {
  // Si on n'est pas sur la dernière étape, avancer au lieu de soumettre
  if (currentStep.value < totalSteps) {
    if (canProceed.value) {
      nextStep()
    }
    return
  }

  // Soumission finale
  try {
    loading.value = true
    error.value = null

    // Validation du mot de passe
    if (form.value.password !== form.value.passwordConfirm) {
      error.value = 'Les mots de passe ne correspondent pas'
      loading.value = false
      return
    }

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
      firstname: form.value.firstname,
      lastname: form.value.lastname,
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
