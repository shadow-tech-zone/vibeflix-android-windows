export type ProviderSource = 'Server 1' | 'Server 2'
export type CatalogSource = ProviderSource | 'Open Movies'
export type CatalogKind = 'Movie' | 'Series'

export interface CatalogTitle {
  id: string
  name: string
  kind: CatalogKind
  year: number
  rating: string
  runtimeMinutes: number
  synopsis: string
  language: string
  source: CatalogSource
  genres: string[]
  isNew: boolean
  catalogPath: string
  posterUrl: string
  backdropUrl: string
}

export interface MediaSeason {
  number: number
  name: string
  path: string
}

export interface MediaEpisode {
  number: number
  name: string
  synopsis: string
  runtimeMinutes: number
  catalogPath: string
  thumbnailUrl: string
}

export interface CatalogResult {
  titles: CatalogTitle[]
  hasNext: boolean
  server1Unavailable: boolean
  server2Unavailable: boolean
  server2WebsiteFallback: boolean
  server1OnlyCategory: boolean
}

export interface TitleDetails {
  synopsis: string
  rating: string
  year?: number
  runtimeMinutes: number
  language: string
  genres: string[]
  backdropUrl: string
  seasons: MediaSeason[]
}

export interface ResolvedStream {
  url: string
  mimeType: string
  server: string
}

export interface LibraryProgress {
  titleId: string
  episodeKey: string
  positionSeconds: number
  durationSeconds: number
  updatedAt: number
  percent: number
}

export interface LibraryState {
  savedIds: string[]
  titles: Record<string, CatalogTitle>
  history: Array<{ titleId: string; watchedAt: number }>
  progress: Record<string, LibraryProgress>
}
