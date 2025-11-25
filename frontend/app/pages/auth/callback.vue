<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { setToken, setUser } = useStrapiAuth()

onMounted(async () => {
  try {
    const jwt = route.query.access_token as string
    
    if (jwt) {
      // Stocker le token
      setToken(jwt)
      
      // Récupérer les infos utilisateur avec le token
      const { data } = await useFetch('http://localhost:1337/api/users/me', {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      })
      
      if (data.value) {
        setUser(data.value)
        console.log('Authentification réussie')
        router.push('/dashboard')
      } else {
        throw new Error('Impossible de récupérer les données utilisateur')
      }
    } else {
      console.error('Pas de token reçu')
      router.push('/login')
    }
  } catch (e) {
    console.error('Erreur d\'authentification:', e)
    router.push('/login')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <p>Connexion en cours...</p>
  </div>
</template>