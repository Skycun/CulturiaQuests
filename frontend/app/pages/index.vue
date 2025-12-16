<!-- filepath: /home/skycun/cours/CulturiaQuests/frontend/app/pages/index.vue -->
<template>
  <div>
    <div v-if="user">
      <p>Bienvenue, {{ user.username }} !</p>
      <p>Email : {{ user.email }}</p>
      <button @click="logout">Se déconnecter</button>
    </div>
    <div v-else>
      <p>Vous n'êtes pas connecté</p>
      <NuxtLink to="/tests/login">Se connecter</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
const user = useStrapiUser()
const { logout } = useStrapiAuth()
</script>