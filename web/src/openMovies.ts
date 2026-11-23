import type { CatalogTitle, ResolvedStream, TitleDetails } from './types'

export interface OpenMovie {
  title: CatalogTitle
  details: TitleDetails
  stream: ResolvedStream
  attribution: string
  licenseUrl: string
  sourceUrl: string
}

const bigBuckBunnyTitle: CatalogTitle = {
  id: 'open-movie-big-buck-bunny',
  name: 'Big Buck Bunny',
  kind: 'Movie',
  year: 2008,
  rating: '',
  runtimeMinutes: 10,
  synopsis: 'A giant rabbit, three mischievous rodents, and a sunny meadow collide in this animated comedy from the Blender Foundation. This is the complete short film, not a trailer.',
  language: 'English',
  source: 'Open Movies',
  genres: ['Animation', 'Comedy', 'Family'],
  isNew: false,
  catalogPath: 'open-movie:big-buck-bunny',
  posterUrl: '',
  backdropUrl: '',
}

const bigBuckBunnyDetails: TitleDetails = {
  synopsis: bigBuckBunnyTitle.synopsis,
  rating: '',
  year: bigBuckBunnyTitle.year,
  runtimeMinutes: bigBuckBunnyTitle.runtimeMinutes,
  language: bigBuckBunnyTitle.language,
  genres: bigBuckBunnyTitle.genres,
  backdropUrl: '',
  seasons: [],
}

export const openMovies: OpenMovie[] = [
  {
    title: bigBuckBunnyTitle,
    details: bigBuckBunnyDetails,
    stream: {
      // Direct MP4 playback: no server-side relay, provider headers, or signed URL service.
      url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
      mimeType: 'video/mp4',
      server: 'Blender Foundation · Open movie',
    },
    attribution: 'Big Buck Bunny by the Blender Foundation',
    licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
    sourceUrl: 'https://peach.blender.org/',
  },
]

export function browseOpenMovies(filter: string, query = ''): CatalogTitle[] {
  if (filter !== 'All' && filter !== 'Movies') return []

  const normalizedQuery = query.trim().toLowerCase()
  return openMovies
    .filter(({ title, attribution }) => {
      if (!normalizedQuery) return true
      const searchable = [title.name, title.synopsis, title.year, ...title.genres, attribution]
      return searchable.some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
    .map(({ title }) => title)
}

export function openMovieForTitle(titleId: string): OpenMovie | undefined {
  return openMovies.find(({ title }) => title.id === titleId)
}
