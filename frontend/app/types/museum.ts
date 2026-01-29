import type { Tag } from './tag'
import type { Run } from './run'
import type { GeoJSON } from './geojson'

export interface MuseumAttributes {
  name: string
  lat?: number
  lng?: number
  geohash?: string
  tags?: { data: Tag[] }
  runs?: { data: Run[] }
  location?: GeoJSON
  radius?: number
  createdAt?: string
  updatedAt?: string
  publishedAt?: string
}

export interface Museum {
  id: number
  documentId: string
  attributes?: MuseumAttributes
  // Flattened
  name?: string
  lat?: number
  lng?: number
  geohash?: string
  radius?: number
  location?: GeoJSON
  tags?: { data: Tag[] } | Tag[] // Support both wrapped and direct array
}
