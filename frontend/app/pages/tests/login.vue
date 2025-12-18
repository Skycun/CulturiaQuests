<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

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

    // Fetch user's guild after login
    if (user.value?.id) {
      await guildStore.fetchGuild()
    }
    
    // Redirect to the user info page
    await router.push('/tests/userinfo')
    
  } catch (e: any) {
    console.error('Login error:', e)
    error.value = e?.error?.message || 'An error occurred during login.'
  } finally {
    loading.value = false
  }
}

// Layout de test
definePageMeta({
  layout: 'test',
})

</script>

<template>
  <div class="p-8 max-w-md mx-auto">
    <h1 class="text-2xl font-bold mb-4">Test Login</h1>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium">Email / Username</label>
        <input 
          v-model="form.identifier" 
          type="text" 
          class="w-full border p-2 rounded" 
          required
        >
      </div>
      
      <div>
        <label class="block text-sm font-medium">Password</label>
        <input 
          v-model="form.password" 
          type="password" 
          class="w-full border p-2 rounded" 
          required
        >
      </div>

      <div v-if="error" class="text-red-500 text-sm">
        {{ error }}
      </div>

      <button 
        type="submit" 
        :disabled="loading"
        class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {{ loading ? 'Logging in...' : 'Login' }}
      </button>
    </form>
  </div>
</template>
