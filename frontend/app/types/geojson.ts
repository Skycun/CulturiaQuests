// GeoJSON Interface for Strapi Geodata Plugin

export interface GeoJSONGeometry {
  type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon'
  coordinates: number[] | number[][] | number[][][] // Depends on type
}

export interface GeoJSONProperty {
  [key: string]: any
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: GeoJSONGeometry
  properties?: GeoJSONProperty
  id?: string | number
}

// Strapi typically stores it as a Feature or similar structure depending on the plugin configuration
export interface GeoJSON {
  type: 'Feature'
  geometry: GeoJSONGeometry
  properties?: GeoJSONProperty
}
