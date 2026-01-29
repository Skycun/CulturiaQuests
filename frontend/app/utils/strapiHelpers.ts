import type { Tag } from '~/types/tag'

/**
 * Extrait les noms de tags d'un objet Museum brut Strapi.
 * Gère les structures v4/v5 polymorphes (flattened et nested).
 *
 * @param museumRaw - Objet Museum brut retourné par l'API Strapi
 * @returns Tableau de noms de tags (strings)
 *
 * @example
 * const tags = extractTags(rawMuseum)
 * // ['Histoire', 'Art', 'Sciences']
 */
export function extractTags(museumRaw: any): string[] {
  // Helper pour extraire tableau de tags depuis différentes structures
  const extractTagsArray = (data: any): Tag[] | null => {
    if (!data) return null
    if (Array.isArray(data)) return data
    if ('data' in data && Array.isArray(data.data)) return data.data
    return null
  }

  // Essayer attributes.tags puis tags direct
  const tagsArray = extractTagsArray(museumRaw.attributes?.tags)
    || extractTagsArray(museumRaw.tags)
    || []

  // Extraire les noms et filtrer les valeurs vides
  return tagsArray
    .map((tag: Tag) => tag.attributes?.name || tag.name || '')
    .filter(Boolean)
}

/**
 * Construit l'URL complète d'une ressource Strapi (image, icône, etc.).
 * Gère les URLs absolues (commençant par http) et relatives.
 *
 * @param path - Chemin de la ressource (peut être absolu ou relatif)
 * @returns URL complète de la ressource
 *
 * @example
 * buildStrapiUrl('/uploads/image.png')
 * // 'http://localhost:1337/uploads/image.png'
 *
 * buildStrapiUrl('https://example.com/image.png')
 * // 'https://example.com/image.png'
 */
export function buildStrapiUrl(path: string): string {
  const config = useRuntimeConfig()

  // Si déjà une URL absolue, la retourner telle quelle
  if (path.startsWith('http')) return path

  // Sinon, construire l'URL complète avec l'URL du serveur Strapi
  return `${config.public.strapi.url}${path}`
}
