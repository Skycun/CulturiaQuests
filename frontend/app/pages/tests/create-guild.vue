<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '~/stores/character'
import { useGuildStore } from '~/stores/guild'

const router = useRouter()
const characterStore = useCharacterStore()
const guildStore = useGuildStore()
const { register } = useStrapiAuth()
const user = useStrapiUser()

// Form Data
const step = ref(1) // 1: Register, 2: Guild, 3: Character
const registerForm = ref({
  username: '',
  email: '',
  password: ''
})
const guildName = ref('')
const characterName = ref('')
const selectedIconId = ref<number | null>(null)
const selectedIconUrl = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)

// Computed
const isStep1Valid = computed(() => 
  registerForm.value.username.length >= 3 && 
  registerForm.value.email.includes('@') && 
  registerForm.value.password.length >= 6
)
const isStep2Valid = computed(() => guildName.value.trim().length >= 3)
const isStep3Valid = computed(() => characterName.value.trim().length >= 2 && selectedIconId.value !== null)

onMounted(async () => {
  // If user is already logged in, skip to step 2
  if (user.value) {
    step.value = 2
    // Check if they already have a guild (should be handled by middleware but good safety)
    if (!guildStore.hasGuild) {
       await guildStore.fetchGuild()
       if (guildStore.hasGuild) {
          router.push('/')
       }
    }
  }
  await characterStore.fetchCharacterIcons()
})

function selectIcon(icon: any) {
  selectedIconId.value = icon.id
  selectedIconUrl.value = getIconUrl(icon)
}

function getIconUrl(icon: any) {
  if (!icon) return ''
  const config = useRuntimeConfig()
  const strapiUrl = config.public.strapi.url
  return icon.url.startsWith('http') ? icon.url : `${strapiUrl}${icon.url}`
}

async function handleRegister() {
  if (!isStep1Valid.value) return
  
  loading.value = true
  error.value = null
  
  try {
    await register(registerForm.value)
    // Successful register automatically logs in
    step.value = 2
  } catch (e: any) {
    console.error('Registration error:', e)
    error.value = e?.error?.message || 'Registration failed.'
  } finally {
    loading.value = false
  }
}

function nextStep() {
  if (step.value === 2 && isStep2Valid.value) {
    step.value = 3
  }
}

function prevStep() {
  if (step.value === 3) {
    step.value = 2
  }
}

async function handleSubmit() {
  if (!isStep3Valid.value) return

  try {
    error.value = null
    await guildStore.createGuildSetup({
      guildName: guildName.value,
      characterName: characterName.value,
      iconId: selectedIconId.value!
    })
    
    router.push('/')
  } catch (e: any) {
    error.value = e.message || 'An error occurred during setup.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
    <div class="max-w-md w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden">
      <!-- Header -->
      <div class="bg-gray-700 p-6 text-center">
        <h1 class="text-2xl font-bold text-yellow-400">Begin Your Journey</h1>
        <p class="text-gray-400 text-sm mt-2">
          <span v-if="step === 1">Create your account</span>
          <span v-else-if="step === 2">Name your Guild</span>
          <span v-else>Summon your Hero</span>
        </p>
      </div>

      <!-- Progress Bar -->
      <div class="h-1 w-full bg-gray-700 flex">
        <div 
          class="h-full bg-yellow-500 transition-all duration-300"
          :style="{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }"
        ></div>
      </div>

      <div class="p-6">
        <!-- Error Message -->
        <div v-if="error" class="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
          {{ error }}
        </div>

        <!-- Step 1: Registration -->
        <div v-if="step === 1" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Username</label>
            <input 
              v-model="registerForm.username"
              type="text" 
              class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              placeholder="AdventurerName"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input 
              v-model="registerForm.email"
              type="email" 
              class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              placeholder="you@example.com"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input 
              v-model="registerForm.password"
              type="password" 
              class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
            >
            <p class="text-xs text-gray-500 mt-1">Min 6 chars</p>
          </div>

          <button 
            @click="handleRegister"
            :disabled="!isStep1Valid || loading"
            class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded transition-colors flex justify-center items-center"
          >
             <span v-if="loading" class="animate-spin mr-2">⟳</span>
             {{ loading ? 'Creating Account...' : 'Create Account' }}
          </button>
          
          <div class="text-center text-xs text-gray-500 mt-2">
            Already have an account? <NuxtLink to="/tests/login" class="text-blue-400 hover:underline">Login</NuxtLink>
          </div>
        </div>

        <!-- Step 2: Guild Name -->
        <div v-else-if="step === 2" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Guild Name</label>
            <input 
              v-model="guildName"
              type="text" 
              class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              placeholder="e.g. The Order of Light"
            >
            <p class="text-xs text-gray-500 mt-1">Minimum 3 characters</p>
          </div>
          
          <button 
            @click="nextStep"
            :disabled="!isStep2Valid"
            class="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded transition-colors"
          >
            Next
          </button>
        </div>

        <!-- Step 3: Character Creation -->
        <div v-else class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Hero Name</label>
            <input 
              v-model="characterName"
              type="text" 
              class="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              placeholder="e.g. Aragorn"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Select Avatar</label>
            <div v-if="characterStore.iconsLoading" class="text-center py-4">
              Loading icons...
            </div>
            <div v-else class="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-900 rounded border border-gray-700">
              <div 
                v-for="icon in characterStore.availableIcons" 
                :key="icon.id"
                @click="selectIcon(icon)"
                class="aspect-square rounded cursor-pointer border-2 overflow-hidden hover:opacity-80 transition-all"
                :class="selectedIconId === icon.id ? 'border-yellow-500 opacity-100' : 'border-transparent opacity-60'"
              >
                <img 
                  :src="getIconUrl(icon)" 
                  class="w-full h-full object-cover"
                  :alt="icon.name"
                >
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button 
              @click="prevStep"
              class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Back
            </button>
            <button 
              @click="handleSubmit"
              :disabled="!isStep3Valid || guildStore.loading"
              class="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2 px-4 rounded transition-colors flex justify-center items-center"
            >
              <span v-if="guildStore.loading" class="animate-spin mr-2">⟳</span>
              {{ guildStore.loading ? 'Creating...' : 'Start Adventure' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
