<template>
  <div class="login-container">
    <h1>Connexion</h1>
    
    <button @click="onLoginGoogle" class="btn-google">
      Se connecter avec Google
    </button>
  </div>
</template>

<script setup lang="ts">
const { authenticateProvider } = useStrapiAuth()
const router = useRouter()

const onLoginGoogle = () => {
  // Cette fonction redirige le navigateur vers :
  // http://localhost:1337/api/connect/google
  window.location = 'http://localhost:1337/api/connect/google'
}
</script>