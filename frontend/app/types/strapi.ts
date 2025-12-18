// Strapi v5 Generic Response Types

export interface StrapiMedia {
  id: number
  documentId: string
  name: string
  alternativeText?: string | null
  caption?: string | null
  width?: number
  height?: number
  formats?: {
    thumbnail?: StrapiMediaFormat
    small?: StrapiMediaFormat
    medium?: StrapiMediaFormat
    large?: StrapiMediaFormat
  }
  hash: string
  ext: string
  mime: string
  size: number
  url: string
  previewUrl?: string | null
  provider: string
  createdAt?: string
  updatedAt?: string
}

export interface StrapiMediaFormat {
  name: string
  hash: string
  ext: string
  mime: string
  width: number
  height: number
  size: number
  url: string
}

export interface StrapiPagination {
  page: number
  pageSize: number
  pageCount: number
  total: number
}

export interface StrapiMeta {
  pagination?: StrapiPagination
  [key: string]: any
}

export interface StrapiError {
  status: number
  name: string
  message: string
  details?: any
}

export interface StrapiResponse<T> {
  data: T
  meta?: StrapiMeta
  error?: StrapiError
}

export interface StrapiListResponse<T> {
  data: T[]
  meta: StrapiMeta
  error?: StrapiError
}

export interface StrapiSingleResponse<T> {
  data: T
  meta?: StrapiMeta
  error?: StrapiError
}
