import type { Visit } from './visit'
import type { Quest } from './quest'
import type { GeoJSON } from './geojson'

export interface PoiAttributes {
  name: string
  lat?: number
  lng?: number
  geohash?: string
  visits?: { data: Visit[] }
  quests_a?: { data: Quest[] }
  quests_b?: { data: Quest[] }
  location?: GeoJSON
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Poi {
  id: number
  documentId: string
  attributes?: PoiAttributes
  // Flattened
  name?: string
  lat?: number
  lng?: number
  geohash?: string
  location?: GeoJSON
}
