import type { CatalogTitle, LibraryProgress, LibraryState } from './types'

const STORAGE_KEY = 'vibeflix.web.library.v1'
const emptyState: LibraryState = { savedIds: [], titles: {}, history: [], progress: {} }

export function readLibrary(): LibraryState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<LibraryState> | null
    if (!parsed || typeof parsed !== 'object') return emptyState
    return {
      savedIds: Array.isArray(parsed.savedIds) ? parsed.savedIds.filter((id): id is string => typeof id === 'string').slice(0, 5000) : [],
      titles: parsed.titles && typeof parsed.titles === 'object' ? parsed.titles as Record<string, CatalogTitle> : {},
      history: Array.isArray(parsed.history) ? parsed.history.filter((entry) => entry && typeof entry.titleId === 'string').slice(0, 1000) : [],
      progress: parsed.progress && typeof parsed.progress === 'object' ? parsed.progress as Record<string, LibraryProgress> : {},
    }
  } catch {
    return emptyState
  }
}

export function writeLibrary(state: LibraryState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Browsing and playback should remain available if browser storage is full or disabled.
  }
}

export function rememberTitles(state: LibraryState, titles: CatalogTitle[]): LibraryState {
  if (!titles.length) return state
  const next = { ...state, titles: { ...state.titles } }
  for (const title of titles) next.titles[title.id] = title
  return next
}

export function toggleSaved(state: LibraryState, title: CatalogTitle): LibraryState {
  const exists = state.savedIds.includes(title.id)
  return {
    ...rememberTitles(state, [title]),
    savedIds: exists ? state.savedIds.filter((id) => id !== title.id) : [title.id, ...state.savedIds],
  }
}

export function saveProgress(
  state: LibraryState,
  title: CatalogTitle,
  episodeKey: string,
  positionSeconds: number,
  durationSeconds: number,
  isFinalTitle = false,
): LibraryState {
  const position = Math.max(0, positionSeconds)
  const duration = Math.max(0, durationSeconds)
  const key = `${title.id}::${episodeKey}`
  const progress = { ...state.progress }
  if (duration > 0 && position / duration >= 0.95) {
    delete progress[key]
    return {
      ...rememberTitles(state, [title]),
      progress,
      history: isFinalTitle
        ? [{ titleId: title.id, watchedAt: Date.now() }, ...state.history.filter((entry) => entry.titleId !== title.id)].slice(0, 1000)
        : state.history,
    }
  }
  if (duration > 0 && position > 5) {
    progress[key] = {
      titleId: title.id,
      episodeKey,
      positionSeconds: position,
      durationSeconds: duration,
      updatedAt: Date.now(),
      percent: Math.round((position / duration) * 100),
    }
  }
  return { ...rememberTitles(state, [title]), progress }
}

export function markStarted(state: LibraryState, title: CatalogTitle): LibraryState {
  return {
    ...rememberTitles(state, [title]),
    history: [{ titleId: title.id, watchedAt: Date.now() }, ...state.history.filter((entry) => entry.titleId !== title.id)].slice(0, 1000),
  }
}

export function progressForTitle(state: LibraryState, titleId: string): LibraryProgress[] {
  return Object.values(state.progress)
    .filter((entry) => entry.titleId === titleId)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function libraryTitles(state: LibraryState, ids: string[]): CatalogTitle[] {
  return ids.flatMap((id) => state.titles[id] ? [state.titles[id]] : [])
}
