// Strapi v5 Generic Response Types

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
