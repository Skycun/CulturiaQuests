<template>
  <div class="min-h-screen bg-white flex items-center justify-center p-4">
    <div class="w-full max-w-md p-8">
      <h1 class="text-3xl font-bold font-power text-center mb-6 text-indigo-600">
        Connexion
      </h1>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <PixelInput
          v-model="form.identifier"
          type="text"
          label="Email / Username"
          placeholder="Entrez votre email ou nom d'utilisateur"
          :disabled="loading"
        />

        <PixelInput
          v-model="form.password"
          type="password"
          label="Mot de passe"
          placeholder="Entrez votre mot de passe"
          :disabled="loading"
        />

        <div v-if="error" class="text-red-500 text-sm mt-2">
          {{ error }}
        </div>

        <PixelButton
          type="submit"
          :disabled="loading"
          variant="filled"
          color="indigo"
        >
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </PixelButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'
import PixelInput from '~/components/form/PixelInput.vue'
import PixelButton from '~/components/form/PixelButton.vue'

const { login } = useStrapiAuth()
const user = useStrapiUser()
const router = useRouter()
const guildStore = useGuildStore()

const form = ref({
  identifier: '',
  password: '',
})

const loading = ref(false)
const error = ref<string | null>(null)

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = null

    await login({
      identifier: form.value.identifier,
      password: form.value.password,
    })

    // Fetch all user data after login (guild + characters, items, quests, etc.)
    // Utilise fetchAll() pour précharger toutes les données en une seule requête
    if (user.value?.id) {
      await guildStore.fetchAll()
    }

    // Redirect to home page
    await router.push('/')

  } catch (e: any) {
    console.error('Login error:', e)
    error.value = e?.error?.message || 'Une erreur est survenue lors de la connexion.'
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'blank',
})
</script>
