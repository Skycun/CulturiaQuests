import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const QUIZ_NOTIFICATION_ID = 1001
const GEO_NOTIFICATION_ID = 1002

/**
 * Composable pour gérer les notifications locales (quiz quotidien + géolocalisation active).
 * Toutes les fonctions sont no-op sur web/desktop.
 */
export function useNotifications() {
  const isNative = Capacitor.isNativePlatform()
  const isAndroid = Capacitor.getPlatform() === 'android'

  /**
   * Demande la permission POST_NOTIFICATIONS (Android 13+).
   * Idempotent : ne fait rien si déjà accordée.
   */
  async function requestPermission(): Promise<boolean> {
    if (!isNative) return true

    const { display } = await LocalNotifications.checkPermissions()
    if (display === 'granted') return true

    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted'
  }

  /**
   * Crée les canaux Android pour les notifications.
   * - quiz-channel : importance DEFAULT (son + vibration)
   * - geo-channel : importance LOW (silencieux, visuel uniquement)
   * No-op sur iOS (les channels n'existent que sur Android).
   */
  async function createChannels(): Promise<void> {
    if (!isNative || !isAndroid) return

    await LocalNotifications.createChannel({
      id: 'quiz-channel',
      name: 'Quiz quotidien',
      description: 'Notification quotidienne pour le nouveau quiz',
      importance: 3, // DEFAULT
      sound: 'default',
      vibration: true,
    })

    await LocalNotifications.createChannel({
      id: 'geo-channel',
      name: 'Géolocalisation active',
      description: 'Notification affichée pendant le tracking GPS',
      importance: 2, // LOW - silencieux
      sound: undefined,
      vibration: false,
    })

    console.log('[Notifications] Channels created')
  }

  /**
   * Programme la notification quiz pour le prochain 00h01.
   * Annule toute notification quiz existante avant de reprogrammer.
   */
  async function scheduleQuizNotification(): Promise<void> {
    if (!isNative) return

    const granted = await requestPermission()
    if (!granted) {
      console.warn('[Notifications] Permission denied, skipping quiz schedule')
      return
    }

    // Annuler la notification quiz existante
    await LocalNotifications.cancel({ notifications: [{ id: QUIZ_NOTIFICATION_ID }] })

    // Calculer le prochain 00h01
    const now = new Date()
    const next = new Date(now)
    next.setHours(0, 1, 0, 0)
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: QUIZ_NOTIFICATION_ID,
          title: 'Quiz du jour disponible !',
          body: 'Un nouveau quiz culturel vous attend. Testez vos connaissances !',
          ...(isAndroid && { channelId: 'quiz-channel' }),
          schedule: {
            at: next,
            ...(isAndroid && { allowWhileIdle: true }),
          },
          extra: {
            route: '/social/quiz',
          },
        },
      ],
    })

    console.log(`[Notifications] Quiz notification scheduled for ${next.toLocaleString()}`)
  }

  /**
   * Affiche la notification persistante de géolocalisation active.
   */
  async function showGeoNotification(): Promise<void> {
    if (!isNative) return

    const granted = await requestPermission()
    if (!granted) return

    await LocalNotifications.schedule({
      notifications: [
        {
          id: GEO_NOTIFICATION_ID,
          title: 'Géolocalisation active',
          body: 'CulturiaQuests utilise votre position pour afficher la carte.',
          ...(isAndroid
            ? { channelId: 'geo-channel', ongoing: true, autoCancel: false }
            : {}),
        },
      ],
    })

    console.log('[Notifications] Geo notification shown')
  }

  /**
   * Masque la notification de géolocalisation.
   */
  async function hideGeoNotification(): Promise<void> {
    if (!isNative) return

    await LocalNotifications.cancel({ notifications: [{ id: GEO_NOTIFICATION_ID }] })
    console.log('[Notifications] Geo notification hidden')
  }

  /**
   * Écoute les taps sur les notifications et navigue vers la route associée.
   */
  async function setupNotificationListeners(): Promise<void> {
    if (!isNative) return

    await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const route = notification.notification.extra?.route
      if (route) {
        console.log(`[Notifications] Navigating to ${route}`)
        navigateTo(route)
      }
    })

    console.log('[Notifications] Listeners registered')
  }

  return {
    requestPermission,
    createChannels,
    scheduleQuizNotification,
    showGeoNotification,
    hideGeoNotification,
    setupNotificationListeners,
  }
}
