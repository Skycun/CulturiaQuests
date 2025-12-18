<script setup lang="ts">
import { useGuildStore } from '~/stores/guild'

const { register } = useStrapiAuth()
const user = useStrapiUser()
const router = useRouter()
const guildStore = useGuildStore()

const form = ref({
  username: '',
  email: '',
  password: '',
})

const loading = ref(false)
const error = ref<string | null>(null)

const handleSubmit = async () => {
  try {
    loading.value = true
    error.value = null
    
    await register({
      username: form.value.username,
      email: form.value.email,
      password: form.value.password,
    })

    // Fetch user's guild after register (should be empty but initializes store)
    if (user.value?.id) {
      await guildStore.fetchGuild()
    }
    
    // Redirect to home - middleware will catch missing guild and redirect to create-guild
    await router.push('/')
    
  } catch (e: any) {
    console.error('Registration error:', e)
    error.value = e?.error?.message || 'An error occurred during registration.'
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
    <h1 class="text-2xl font-bold mb-4">Test Register</h1>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-sm font-medium">Username</label>
        <input 
          v-model="form.username" 
          type="text" 
          class="w-full border p-2 rounded" 
          required
        >
      </div>

      <div>
        <label class="block text-sm font-medium">Email</label>
        <input 
          v-model="form.email" 
          type="email" 
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
        class="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
      >
        {{ loading ? 'Creating Account...' : 'Register' }}
      </button>

      <div class="text-center mt-4">
        <p class="text-sm">
          Already have an account? 
          <NuxtLink to="/tests/login" class="text-blue-600 hover:underline">Login here</NuxtLink>
        </p>
      </div>
    </form>
  </div>
</template>
