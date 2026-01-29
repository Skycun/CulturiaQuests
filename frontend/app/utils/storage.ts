/**
 * Utilitaires pour gérer le localStorage et déboguer les problèmes de persistence
 */

/**
 * Calcule la taille totale du localStorage en octets
 */
export function getLocalStorageSize(): number {
  let total = 0
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length
    }
  }
  return total
}

/**
 * Retourne la taille du localStorage formatée en KB ou MB
 */
export function getLocalStorageSizeFormatted(): string {
  const bytes = getLocalStorageSize()
  const kb = bytes / 1024
  
  if (kb > 1024) {
    return `${(kb / 1024).toFixed(2)} MB`
  }
  return `${kb.toFixed(2)} KB`
}

/**
 * Liste tous les stores Pinia avec leur taille
 */
export function listPiniaStores(): { key: string; size: string }[] {
  const stores: { key: string; size: string }[] = []
  
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = (localStorage[key].length + key.length) / 1024
      stores.push({
        key,
        size: `${size.toFixed(2)} KB`,
      })
    }
  }
  
  return stores.sort((a, b) => {
    const sizeA = parseFloat(a.size)
    const sizeB = parseFloat(b.size)
    return sizeB - sizeA // Tri décroissant
  })
}

/**
 * Affiche un rapport complet du localStorage dans la console
 */
export function debugLocalStorage() {
  console.group('📊 Rapport localStorage')
  console.log('Taille totale:', getLocalStorageSizeFormatted())
  console.log('\nStores individuels:')
  console.table(listPiniaStores())
  console.groupEnd()
}

/**
 * Nettoie uniquement les stores Pinia du localStorage
 * Garde les autres données (par exemple, les préférences utilisateur)
 */
export function clearPiniaStores() {
  const piniaKeys = Object.keys(localStorage).filter(key => 
    key !== 'culturia_jwt' && // Garde le JWT
    key !== 'debug' // Garde les flags de debug si présents
  )
  
  piniaKeys.forEach(key => localStorage.removeItem(key))
  console.log(`✅ ${piniaKeys.length} stores Pinia nettoyés`)
}

/**
 * Avertit si le localStorage est trop volumineux
 * À appeler en développement pour détecter les problèmes
 */
export function warnIfLocalStorageTooLarge(thresholdMB: number = 2) {
  const bytes = getLocalStorageSize()
  const mb = bytes / (1024 * 1024)
  
  if (mb > thresholdMB) {
    console.warn(
      `⚠️ localStorage dépasse ${thresholdMB}MB: ${mb.toFixed(2)} MB`,
      '\nConsidérez optimiser la persistence ou nettoyer les données obsolètes.'
    )
    debugLocalStorage()
  }
}
