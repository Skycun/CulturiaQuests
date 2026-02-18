export function useGdprRequest() {
  const client = useStrapiClient()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const success = ref<string | null>(null)

  async function requestData() {
    loading.value = true
    error.value = null
    success.value = null
    try {
      const res = await client<{ message: string }>('/gdpr-request', { method: 'POST' })
      success.value = res.message
    } catch (e: any) {
      error.value = e?.data?.error?.message || e?.message || 'Erreur lors de la demande'
    } finally {
      loading.value = false
    }
  }

  return { requestData, loading, error, success }
}
