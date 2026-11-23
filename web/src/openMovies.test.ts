import { describe, expect, it } from 'vitest'
import { browseOpenMovies, openMovieForTitle, openMovies } from './openMovies'

describe('open movie catalog', () => {
  it('lists the CC-licensed film only in compatible movie filters', () => {
    expect(browseOpenMovies('All').map((title) => title.name)).toEqual(['Big Buck Bunny'])
    expect(browseOpenMovies('Movies')).toHaveLength(1)
    expect(browseOpenMovies('Series')).toEqual([])
    expect(browseOpenMovies('Hindi')).toEqual([])
  })

  it('supports searching and returns a direct, secure MP4 source with attribution', () => {
    const [title] = browseOpenMovies('All', 'bunny')
    const movie = title && openMovieForTitle(title.id)

    expect(movie?.stream).toMatchObject({
      url: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
      mimeType: 'video/mp4',
    })
    expect(movie?.attribution).toContain('Blender Foundation')
    expect(movie?.licenseUrl).toBe('https://creativecommons.org/licenses/by/3.0/')
    expect(openMovies.every(({ title: item }) => item.source === 'Open Movies')).toBe(true)
    expect(browseOpenMovies('All', 'no such title')).toEqual([])
  })
})
