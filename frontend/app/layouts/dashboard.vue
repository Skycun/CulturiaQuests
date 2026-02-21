<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex relative">
    <!-- Mobile Overlay -->
    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 bg-black/50 z-40 md:hidden"
      @click="isSidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 ease-in-out"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Logo / Title -->
      <div class="p-6 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 class="font-power text-xl text-amber-400 tracking-wide">CulturiaQuests</h1>
          <p class="text-xs text-gray-500 mt-1 font-onest">Administration</p>
        </div>
        <!-- Close Button -->
        <button 
          @click="toggleSidebar" 
          class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          title="Fermer le menu"
        >
          <Icon name="bx-chevron-left" class="w-6 h-6" />
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-4 px-3 space-y-1 font-onest overflow-y-auto">
        <NuxtLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
          :class="isActive(item.path)
            ? 'bg-amber-400/10 text-amber-400'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'"
          @click="closeOnMobile"
        >
          <Icon :name="item.icon" class="w-5 h-5 shrink-0" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Footer -->
      <div class="p-4 border-t border-gray-800">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
            <Icon name="bxs-user" class="w-4 h-4 text-amber-400" />
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ username }}</p>
            <p class="text-xs text-gray-500">Admin</p>
          </div>
        </div>
        <NuxtLink
          to="/account/settings"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <Icon name="mdi:cog-outline" class="w-4 h-4" />
          <span>Paramètres</span>
        </NuxtLink>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
          @click="handleBackToGame"
        >
          <Icon name="bx-arrow-back" class="w-4 h-4" />
          <span>Retour au jeu</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main 
      class="flex-1 min-h-screen transition-all duration-300 ease-in-out min-w-0 flex flex-col"
      :class="isSidebarOpen ? 'md:ml-64' : ''"
    >
      <!-- Top Bar (Mobile / Sidebar Closed) -->
      <header 
        v-if="!isSidebarOpen"
        class="sticky top-0 z-20 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-4 h-16 flex items-center"
      >
        <button 
          @click="toggleSidebar" 
          class="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          title="Ouvrir le menu"
        >
          <Icon name="bx-menu" class="w-6 h-6" />
        </button>
      </header>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const user = useStrapiUser()

const isSidebarOpen = ref(true)
const username = computed(() => (user.value as any)?.username || 'Admin')

const navItems = [
  { path: '/dashboard', icon: 'bxs-dashboard', label: 'Vue d\'ensemble' },
  { path: '/dashboard/players', icon: 'bxs-group', label: 'Joueurs' },
  { path: '/dashboard/map', icon: 'bxs-map-alt', label: 'Carte' },
  { path: '/dashboard/economy', icon: 'bx-coin-stack', label: 'Economie' },
  { path: '/dashboard/expeditions', icon: 'bxs-castle', label: 'Expeditions' },
  { path: '/dashboard/quiz', icon: 'bxs-brain', label: 'Quiz' },
  { path: '/dashboard/social', icon: 'bxs-user-account', label: 'Social' },
]

onMounted(() => {
  // Close sidebar on mobile by default
  if (window.innerWidth < 768) {
    isSidebarOpen.value = false
  }
})

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

function closeOnMobile() {
  if (window.innerWidth < 768) {
    isSidebarOpen.value = false
  }
}

function isActive(path: string) {
  if (path === '/dashboard') {
    return route.path === '/dashboard'
  }
  return route.path.startsWith(path)
}

function handleBackToGame() {
  router.push('/guild')
}
</script>
