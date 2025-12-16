<script setup lang="ts">
const user = useStrapiUser()
const { logout } = useStrapiAuth()
const router = useRouter()

const isAuthenticated = computed(() => !!user.value)

const handleLogout = async () => {
  await logout()
  router.push('/tests/login')
}
</script>

<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">User Info</h1>

    <div v-if="isAuthenticated" class="bg-white shadow rounded-lg p-6 space-y-4">
      <div class="grid grid-cols-3 gap-4 border-b pb-4">
        <span class="font-semibold text-gray-600">Status:</span>
        <span class="col-span-2 text-green-600 font-bold">Authenticated</span>
      </div>

      <div class="grid grid-cols-3 gap-4 border-b pb-4">
        <span class="font-semibold text-gray-600">ID:</span>
        <span class="col-span-2">{{ user?.id }}</span>
      </div>

      <div class="grid grid-cols-3 gap-4 border-b pb-4">
        <span class="font-semibold text-gray-600">Username:</span>
        <span class="col-span-2">{{ user?.username }}</span>
      </div>

      <div class="grid grid-cols-3 gap-4 border-b pb-4">
        <span class="font-semibold text-gray-600">Email:</span>
        <span class="col-span-2">{{ user?.email }}</span>
      </div>

      <div class="grid grid-cols-3 gap-4 border-b pb-4">
        <span class="font-semibold text-gray-600">Role:</span>
        <span class="col-span-2">No role data available</span>
      </div>

      <div class="pt-4">
        <button 
          @click="handleLogout"
          class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
    </div>

    <div v-else class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm text-yellow-700">
            User is not authenticated.
          </p>
          <p class="mt-2">
            <NuxtLink to="/tests/login" class="text-yellow-700 underline font-bold">
              Go to Login
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
    
    <div class="mt-8 p-4 bg-gray-100 rounded">
      <h3 class="font-bold mb-2">Debug Raw User State:</h3>
      <pre class="text-xs overflow-auto">{{ user }}</pre>
    </div>
  </div>
</template>
