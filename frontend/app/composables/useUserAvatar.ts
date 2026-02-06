/**
 * Composable for handling user avatar
 * Returns the user's avatar URL or a placeholder image
 */

interface AvatarData {
  id?: number
  documentId?: string
  url?: string
  formats?: {
    thumbnail?: { url: string }
    small?: { url: string }
    medium?: { url: string }
    large?: { url: string }
  }
}

interface UserSettings {
  username: string
  email: string
  friend_requests_enabled: boolean
  avatar: AvatarData | null
}

const PLACEHOLDER_URL = '/assets/avatar-placeholder.svg'

export function useUserAvatar() {
  const client = useStrapiClient()
  const config = useRuntimeConfig()

  const avatar = ref<AvatarData | null>(null)
  const settings = ref<UserSettings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const uploadProgress = ref(0)

  /**
   * Get the full URL for an avatar
   * Handles both absolute and relative URLs from Strapi
   */
  function getAvatarUrl(avatarData: AvatarData | null | undefined, size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original' = 'original'): string {
    if (!avatarData?.url) {
      return PLACEHOLDER_URL
    }

    // Get the appropriate size URL
    let url = avatarData.url
    if (size !== 'original' && avatarData.formats?.[size]?.url) {
      url = avatarData.formats[size].url
    }

    // Accepter uniquement les chemins relatifs vers /uploads/ ou les URLs vers le domaine Strapi configuré
    const baseUrl = config.public.strapi.url || 'http://localhost:1337'
    if (url.startsWith('http://') || url.startsWith('https://')) {
      if (!url.startsWith(baseUrl)) {
        return PLACEHOLDER_URL
      }
      return url
    }

    if (!url.startsWith('/uploads/')) {
      return PLACEHOLDER_URL
    }

    return `${baseUrl}${url}`
  }

  /**
   * Get the current user's avatar URL
   */
  const avatarUrl = computed(() => getAvatarUrl(avatar.value))

  /**
   * Get the current user's avatar thumbnail URL
   */
  const avatarThumbnailUrl = computed(() => getAvatarUrl(avatar.value, 'thumbnail'))

  /**
   * Fetch user settings including avatar
   */
  async function fetchSettings(): Promise<UserSettings | null> {
    loading.value = true
    error.value = null

    try {
      const response = await client<{ data: UserSettings }>('/user-settings', {
        method: 'GET',
      })

      settings.value = response.data
      avatar.value = response.data.avatar
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch user settings'
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Upload a new avatar
   * @param file - The image file to upload
   */
  async function uploadAvatar(file: File): Promise<boolean> {
    loading.value = true
    error.value = null
    uploadProgress.value = 0

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      error.value = 'Invalid file type. Allowed: PNG, JPG, WebP'
      loading.value = false
      return false
    }

    // Validate file size (4MB max)
    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      error.value = 'File too large. Maximum size: 4MB'
      loading.value = false
      return false
    }

    try {
      // Encoder le fichier en base64 pour éviter les problèmes multipart cross-origin
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      uploadProgress.value = 30

      // Envoyer via JSON au controller custom (auth géré automatiquement par useStrapiClient)
      const response = await client<{ data: { avatar: AvatarData }, message: string }>('/user-settings/avatar', {
        method: 'POST',
        body: { base64 },
      })

      avatar.value = response.data.avatar
      if (settings.value) {
        settings.value.avatar = response.data.avatar
      }

      uploadProgress.value = 100
      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to upload avatar'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Remove the current avatar
   */
  async function removeAvatar(): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      await client('/user-settings/avatar', {
        method: 'DELETE',
      })

      avatar.value = null
      if (settings.value) {
        settings.value.avatar = null
      }

      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to remove avatar'
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * Update user settings
   */
  async function updateSettings(data: { friend_requests_enabled?: boolean }): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const response = await client<{ data: typeof data, message: string }>('/user-settings', {
        method: 'PUT',
        body: data,
      })

      if (settings.value && typeof response.data.friend_requests_enabled === 'boolean') {
        settings.value.friend_requests_enabled = response.data.friend_requests_enabled
      }

      return true
    } catch (err: any) {
      error.value = err.message || 'Failed to update settings'
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    avatar,
    settings,
    loading,
    error,
    uploadProgress,

    // Computed
    avatarUrl,
    avatarThumbnailUrl,

    // Methods
    getAvatarUrl,
    fetchSettings,
    uploadAvatar,
    removeAvatar,
    updateSettings,

    // Constants
    PLACEHOLDER_URL,
  }
}
