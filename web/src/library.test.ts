import { describe, expect, it } from 'vitest'
import { libraryTitles, progressForTitle, saveProgress, toggleSaved } from './library'
import type { CatalogTitle, LibraryState } from './types'

const title: CatalogTitle = {
  id: 's1-example-film',
  name: 'Example Film',
  kind: 'Movie',
  year: 2025,
  rating: '',
  runtimeMinutes: 100,
  synopsis: '',
  language: '',
  source: 'Server 1',
  genres: [],
  isNew: false,
  catalogPath: '/watch/example-film',
  posterUrl: 'https://play4u.org/poster.jpg',
  backdropUrl: '',
}
const emptyLibrary: LibraryState = { savedIds: [], titles: {}, history: [], progress: {} }

describe('local library', () => {
  it('adds and removes a title immutably from My List', () => {
    const saved = toggleSaved(emptyLibrary, title)
    expect(saved.savedIds).toEqual([title.id])
    expect(saved.titles[title.id]).toEqual(title)
    expect(emptyLibrary.savedIds).toEqual([])
    expect(toggleSaved(saved, title).savedIds).toEqual([])
  })

  it('keeps a resume checkpoint keyed to a title and episode, without stream data', () => {
    const progress = saveProgress(emptyLibrary, title, '', 42, 100)
    const [checkpoint] = progressForTitle(progress, title.id)
    expect(checkpoint).toMatchObject({ titleId: title.id, episodeKey: '', positionSeconds: 42, percent: 42 })
    expect(JSON.stringify(progress)).not.toContain('stream')
    expect(libraryTitles(progress, [title.id])).toEqual([title])
  })

  it('does not put an unfinished episode in history, but records a completed title', () => {
    const episodeTitle = { ...title, kind: 'Series' as const }
    const halfway = saveProgress(emptyLibrary, episodeTitle, 'S01E01', 50, 100)
    const episodeEnd = saveProgress(halfway, episodeTitle, 'S01E01', 96, 100, false)
    expect(episodeEnd.history).toEqual([])
    expect(progressForTitle(episodeEnd, title.id)).toEqual([])

    const completed = saveProgress(emptyLibrary, title, '', 100, 100, true)
    expect(completed.history).toHaveLength(1)
    expect(completed.history[0]?.titleId).toBe(title.id)
    expect(progressForTitle(completed, title.id)).toEqual([])
  })
})
