import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  ListPlus,
  LoaderCircle,
  Play,
  Search,
  X,
} from 'lucide-react'
import { providerApi, ProviderApiError, sourceIndex } from './api'
import { browseOpenMovies, openMovieForTitle } from './openMovies'
import {
  libraryTitles,
  progressForTitle,
  readLibrary,
  rememberTitles,
  saveProgress,
  toggleSaved,
  writeLibrary,
} from './library'
import WelcomeScreen from './WelcomeScreen'
import type {
  CatalogTitle,
  LibraryProgress,
  LibraryState,
  MediaEpisode,
  MediaSeason,
  CatalogSource,
  ResolvedStream,
  TitleDetails,
} from './types'
import './App.css'

const FILTERS = ['All', 'Movies', 'Series', 'Latest', 'Hindi'] as const
type BrowseFilter = typeof FILTERS[number]
type PageName = 'Home' | 'Search' | 'My List' | 'Continue Watching' | 'History'
type SourceChoice = 'Both Servers' | CatalogSource

function initialSource(): SourceChoice {
  return new URLSearchParams(window.location.search).get('source') === 'open'
    ? 'Open Movies'
    : 'Both Servers'
}

type PlayerState = {
  key: string
  title: CatalogTitle
  episode: MediaEpisode | null
  episodeKey: string
  seasonNumber: number
  episodes: MediaEpisode[]
  seasons: MediaSeason[]
  resumeSeconds: number
  streams: ResolvedStream[]
  streamIndex: number
  isFinalTitle: boolean
}

function displayRuntime(title: CatalogTitle): string {
  return title.runtimeMinutes > 0 ? `${title.runtimeMinutes} min` : title.kind
}

function titleMetadata(title: CatalogTitle): string[] {
  return [title.year > 0 ? String(title.year) : '', title.rating, displayRuntime(title), title.source]
    .filter(Boolean)
}

function errorText(error: unknown): string {
  return error instanceof ProviderApiError || error instanceof Error
    ? error.message
    : 'Something went wrong. Please try again.'
}

function ProgressTrack({ progress }: { progress: LibraryProgress }) {
  return (
    <div className="progress-track" aria-label={`${progress.percent}% watched`}>
      <span style={{ width: `${Math.max(3, Math.min(100, progress.percent))}%` }} />
    </div>
  )
}

function TitleCard({
  title,
  landscape = false,
  library,
  onOpen,
  onToggleSaved,
  progress,
}: {
  title: CatalogTitle
  landscape?: boolean
  library: LibraryState
  onOpen: (title: CatalogTitle) => void
  onToggleSaved: (title: CatalogTitle) => void
  progress?: LibraryProgress
}) {
  const [failedPosterUrl, setFailedPosterUrl] = useState('')
  const saved = library.savedIds.includes(title.id)
  const synopsis = title.synopsis || 'Open the title to view details from its provider.'
  return (
    <article className={`title-card${landscape ? ' title-card--landscape' : ''}`}>
      <button
        className="poster-button"
        type="button"
        onClick={() => onOpen(title)}
        aria-label={`Open details for ${title.name}`}
        title={`Open details for ${title.name}`}
      >
        <div className="poster-art">
          {title.posterUrl && failedPosterUrl !== title.posterUrl ? (
            <img src={title.posterUrl} alt={`${title.name} poster`} loading="lazy" onError={() => setFailedPosterUrl(title.posterUrl)} />
          ) : title.source === 'Open Movies' ? (
            <div className="poster-art__open-movie" aria-hidden="true">
              <span className="poster-art__open-badge">OPEN FILM</span>
              <strong>{title.name}</strong>
              <span className="poster-art__open-license">CC BY 3.0 · BLENDER</span>
            </div>
          ) : (
            <div className="poster-art__fallback" aria-hidden="true"><span>V</span></div>
          )}
          <div className="poster-shade" />
          <span className="poster-source">{title.source}</span>
          {title.isNew && <span className="poster-new">NEW</span>}
          <div className="poster-preview">
            <strong>{title.name}</strong>
            <span className="poster-preview__meta">{titleMetadata(title).join('  ·  ')}</span>
            <span className="poster-preview__synopsis">{synopsis}</span>
            <span className="poster-preview__action"><Info size={12} /> TITLE DETAILS</span>
          </div>
        </div>
      </button>
      {landscape && progress && <ProgressTrack progress={progress} />}
      <div className="title-card__copy">
        <div className="title-card__heading">
          <button type="button" onClick={() => onOpen(title)} className="title-card__name">{title.name}</button>
          <button
            type="button"
            className={`save-icon${saved ? ' is-saved' : ''}`}
            onClick={() => onToggleSaved(title)}
            aria-label={saved ? `Remove ${title.name} from My List` : `Add ${title.name} to My List`}
            title={saved ? 'Remove from My List' : 'Add to My List'}
          >
            {saved ? <Check size={16} /> : <ListPlus size={16} />}
          </button>
        </div>
        <span className="title-card__meta">{[title.year || '', title.kind, title.source].filter(Boolean).join('  ·  ')}</span>
      </div>
      {!landscape && progress && <ProgressTrack progress={progress} />}
    </article>
  )
}

function TitleRow({
  title,
  titles,
  library,
  onOpen,
  onToggleSaved,
  landscape = false,
}: {
  title: string
  titles: CatalogTitle[]
  library: LibraryState
  onOpen: (title: CatalogTitle) => void
  onToggleSaved: (title: CatalogTitle) => void
  landscape?: boolean
}) {
  if (!titles.length) return null
  return (
    <section className="catalog-row" aria-label={title}>
      <div className="section-heading">
        <h2>{title}</h2>
        <span className="section-heading__count">{titles.length} titles</span>
      </div>
      <div className="horizontal-shelf">
        {titles.map((item) => {
          const progress = progressForTitle(library, item.id)[0]
          return (
            <div className="horizontal-shelf__item" key={item.id}>
              <TitleCard
                title={item}
                landscape={landscape}
                library={library}
                onOpen={onOpen}
                onToggleSaved={onToggleSaved}
                progress={progress}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

function DetailsDialog({
  title,
  details,
  loading,
  error,
  seasons,
  selectedSeason,
  episodes,
  episodesLoading,
  selectedEpisode,
  onSeason,
  onEpisode,
  onPlay,
  onClose,
  onToggleSaved,
  saved,
  playing,
}: {
  title: CatalogTitle
  details: TitleDetails | null
  loading: boolean
  error: string | null
  seasons: MediaSeason[]
  selectedSeason: number
  episodes: MediaEpisode[]
  episodesLoading: boolean
  selectedEpisode: MediaEpisode | null
  onSeason: (number: number) => void
  onEpisode: (episode: MediaEpisode) => void
  onPlay: () => void
  onClose: () => void
  onToggleSaved: () => void
  saved: boolean
  playing: boolean
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  useEffect(() => { closeRef.current?.focus() }, [])
  const metadata = titleMetadata({ ...title, ...details })
  const openMovie = openMovieForTitle(title.id)
  const selectedSeasonRecord = seasons.find((season) => season.number === selectedSeason)
  return (
    <div
      className="dialog-scrim"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        ref={dialogRef}
        className="details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="details-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') { event.preventDefault(); onClose(); return }
          if (event.key !== 'Tab') return
          const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), select:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ) ?? []).filter((element) => element.offsetParent !== null)
          if (!focusable.length) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }}
      >
        <div className="details-dialog__backdrop" style={{ backgroundImage: title.backdropUrl ? `url("${title.backdropUrl}")` : undefined }} />
        <div className="details-dialog__shade" />
        <button ref={closeRef} type="button" className="dialog-close" onClick={onClose} aria-label="Close title details"><X size={20} /></button>
        <div className="details-dialog__body">
          <div className="details-poster">
            {title.posterUrl ? (
              <img src={title.posterUrl} alt={`${title.name} poster`} />
            ) : openMovie ? (
              <div className="details-poster__open">
                <span>OPEN MOVIE</span>
                <strong>{title.name}</strong>
                <small>BLENDER FOUNDATION · CC BY 3.0</small>
              </div>
            ) : null}
          </div>
          <div className="details-copy">
            <span className="eyebrow">{title.source} <span>·</span> VIBEFLIX</span>
            <h2 id="details-title">{title.name}</h2>
            <div className="details-meta">
              {metadata.filter((part) => part !== title.source).map((part) => <span key={part}>{part}</span>)}
            </div>
            <p className="details-synopsis">{details?.synopsis || title.synopsis || 'Details are supplied by the selected catalog source.'}</p>
            {openMovie ? (
              <div className="open-license-details">
                <p>{openMovie.attribution} is shared under the Creative Commons Attribution 3.0 license.</p>
                <a href={openMovie.licenseUrl} target="_blank" rel="noopener noreferrer">License</a>
                <span aria-hidden="true">·</span>
                <a href={openMovie.sourceUrl} target="_blank" rel="noopener noreferrer">Official film page</a>
              </div>
            ) : (
              <p className="provider-browser-note" role="note">
                Server 1 and Server 2 streams play in a browser only when their host permits direct access and CORS. A browser cannot reuse the Android player’s custom Referer/Origin headers.
              </p>
            )}
            {(details?.genres?.length ?? title.genres.length) > 0 && (
              <p className="details-genres"><b>Genres</b> {(details?.genres?.length ? details.genres : title.genres).join(' · ')}</p>
            )}
            {details?.language && <p className="details-genres"><b>Language</b> {details.language}</p>}
            {loading && <p className="subtle-status"><LoaderCircle className="spin" size={15} /> Loading provider details…</p>}
            {error && <p className="inline-error" role="status">{error}</p>}
            <div className="details-actions">
              <button className="button button--primary" type="button" onClick={onPlay} disabled={playing || (title.kind === 'Series' && !selectedEpisode)}>
                {playing ? <LoaderCircle className="spin" size={17} /> : <Play size={17} fill="currentColor" />}
                {title.kind === 'Series' ? 'Play selected episode' : 'Play'}
              </button>
              <button className="button button--secondary" type="button" onClick={onToggleSaved}>
                {saved ? <Check size={17} /> : <ListPlus size={17} />}
                {saved ? 'In My List' : 'My List'}
              </button>
            </div>
            {title.kind === 'Series' && (
              <div className="episodes-panel">
                <div className="episodes-panel__top">
                  <h3>Episodes</h3>
                  {seasons.length > 1 && (
                    <label className="season-select-label">
                      <span className="sr-only">Select season</span>
                      <select value={selectedSeason} onChange={(event) => onSeason(Number(event.target.value))}>
                        {seasons.map((season) => <option key={season.number} value={season.number}>{season.name || `Season ${season.number}`}</option>)}
                      </select>
                      <ChevronDown size={15} aria-hidden="true" />
                    </label>
                  )}
                </div>
                {episodesLoading ? (
                  <div className="episodes-loading"><LoaderCircle className="spin" size={18} /> Loading episodes…</div>
                ) : episodes.length ? (
                  <div className="episode-list">
                    {episodes.map((episode) => (
                      <button
                        type="button"
                        className={`episode-item${selectedEpisode?.number === episode.number && selectedSeasonRecord?.number === selectedSeason ? ' is-selected' : ''}`}
                        key={`${selectedSeason}-${episode.number}`}
                        onClick={() => onEpisode(episode)}
                      >
                        <span className="episode-item__number">{String(episode.number).padStart(2, '0')}</span>
                        <span className="episode-item__image">
                          {episode.thumbnailUrl && <img src={episode.thumbnailUrl} alt="" loading="lazy" />}
                          <span><Play size={15} fill="currentColor" /></span>
                        </span>
                        <span className="episode-item__copy">
                          <strong>{episode.name || `Episode ${episode.number}`}</strong>
                          <small>{episode.runtimeMinutes > 0 ? `${episode.runtimeMinutes} min` : `Episode ${episode.number}`}</small>
                          {episode.synopsis && <span>{episode.synopsis}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="subtle-status">No episodes were returned for this season.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function App() {
  const [library, setLibrary] = useState<LibraryState>(readLibrary)
  const [showWelcome, setShowWelcome] = useState(() => window.location.hash !== '#browse')
  const [source, setSource] = useState<SourceChoice>(initialSource)
  const [filter, setFilter] = useState<BrowseFilter>('All')
  const [page, setPage] = useState<PageName>('Home')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [catalogPage, setCatalogPage] = useState(1)
  const [refreshToken, setRefreshToken] = useState(0)
  const [providerCatalog, setProviderCatalog] = useState<CatalogTitle[]>([])
  const [hasNext, setHasNext] = useState(false)
  const [catalogStatus, setCatalogStatus] = useState<{ key: string; error: string | null; warnings: string[] } | null>(null)
  const [activeTitle, setActiveTitle] = useState<CatalogTitle | null>(null)
  const [details, setDetails] = useState<TitleDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<MediaSeason[]>([])
  const [selectedSeason, setSelectedSeason] = useState(0)
  const [episodeResult, setEpisodeResult] = useState<{ key: string; episodes: MediaEpisode[] } | null>(null)
  const [selectedEpisodeState, setSelectedEpisodeState] = useState<{ titleId: string; seasonNumber: number; episode: MediaEpisode } | null>(null)
  const [resolving, setResolving] = useState(false)
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [playbackLoading, setPlaybackLoading] = useState(false)
  const [heroArtwork, setHeroArtwork] = useState<{ titleId: string; url: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerDialogRef = useRef<HTMLElement>(null)
  const playerBackRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const lastCheckpointRef = useRef(0)
  const pageRequest = useRef<AbortController | null>(null)
  const detailsRequest = useRef<AbortController | null>(null)
  const episodesRequest = useRef<AbortController | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const catalogRequestKey = JSON.stringify([source, filter, submittedQuery, catalogPage, refreshToken])
  const catalog = useMemo(
    () => source === 'Open Movies' ? browseOpenMovies(filter, submittedQuery) : providerCatalog,
    [source, filter, submittedQuery, providerCatalog],
  )
  const loading = source !== 'Open Movies' && catalogStatus?.key !== catalogRequestKey
  const catalogError = source === 'Open Movies' ? null : catalogStatus?.key === catalogRequestKey ? catalogStatus.error : null
  const sourceWarnings = source === 'Open Movies' ? [] : catalogStatus?.key === catalogRequestKey ? catalogStatus.warnings : []
  const currentEpisodeRequestKey = activeTitle?.kind === 'Series' && selectedSeason
    ? `${activeTitle.id}:${selectedSeason}`
    : ''
  const episodes = currentEpisodeRequestKey && episodeResult?.key === currentEpisodeRequestKey
    ? episodeResult.episodes
    : []
  const episodesLoading = !!currentEpisodeRequestKey && episodeResult?.key !== currentEpisodeRequestKey
  const selectedEpisode = activeTitle && selectedEpisodeState?.titleId === activeTitle.id
      && selectedEpisodeState.seasonNumber === selectedSeason
    ? selectedEpisodeState.episode
    : null

  useEffect(() => { writeLibrary(library) }, [library])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim()) setPage('Search')
      setCatalogPage(1)
      setSubmittedQuery(query.trim())
    }, query.trim() ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    pageRequest.current?.abort()
    if (source === 'Open Movies') return
    const controller = new AbortController()
    pageRequest.current = controller
    providerApi.browse({
      sourceIndex: sourceIndex(source),
      filter,
      query: submittedQuery,
      page: catalogPage,
    }, controller.signal)
      .then((result) => {
        setProviderCatalog((current) => catalogPage > 1 ? [...current, ...result.titles.filter((item) => !current.some((seen) => seen.id === item.id))] : result.titles)
        setHasNext(result.hasNext)
        const warnings = [
          result.server1Unavailable ? 'Server 1 is unavailable.' : '',
          result.server2Unavailable ? 'Server 2 is unavailable.' : '',
          result.server2WebsiteFallback ? 'Server 2 website catalog fallback is active.' : '',
        ].filter(Boolean)
        setCatalogStatus({ key: catalogRequestKey, error: null, warnings })
        setLibrary((current) => rememberTitles(current, result.titles))
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (catalogPage === 1) setProviderCatalog([])
        setHasNext(false)
        setCatalogStatus({ key: catalogRequestKey, error: errorText(error), warnings: [] })
      })
    return () => controller.abort()
  }, [source, filter, submittedQuery, catalogPage, refreshToken, catalogRequestKey])

  const featured = catalog[0] ?? null
  const heroBackdrop = featured?.backdropUrl
    || (heroArtwork?.titleId === featured?.id ? heroArtwork.url : '')
  useEffect(() => {
    if (!featured || featured.source === 'Open Movies' || featured.backdropUrl) return
    const controller = new AbortController()
    providerApi.details(featured, controller.signal)
      .then((result) => setHeroArtwork({ titleId: featured.id, url: result.backdropUrl || featured.posterUrl }))
      .catch(() => setHeroArtwork({ titleId: featured.id, url: featured.posterUrl }))
    return () => controller.abort()
  }, [featured])

  const visibleList = useMemo(() => {
    if (page === 'My List') return libraryTitles(library, library.savedIds)
    if (page === 'Continue Watching') {
      const progress = Object.values(library.progress).sort((a, b) => b.updatedAt - a.updatedAt)
      const seen = new Set<string>()
      return progress.flatMap((entry) => {
        if (seen.has(entry.titleId) || !library.titles[entry.titleId]) return []
        seen.add(entry.titleId)
        return [library.titles[entry.titleId]]
      })
    }
    if (page === 'History') {
      return libraryTitles(library, library.history.map((entry) => entry.titleId))
    }
    return catalog
  }, [catalog, library, page])

  const updateLibrary = useCallback((mutate: (current: LibraryState) => LibraryState) => {
    setLibrary((current) => mutate(current))
  }, [])

  const openTitle = (title: CatalogTitle) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    detailsRequest.current?.abort()
    episodesRequest.current?.abort()
    setActiveTitle(title)
    setDetails(null)
    setDetailsError(null)
    setSeasons([])
    setEpisodeResult(null)
    setSelectedEpisodeState(null)
    setSelectedSeason(0)
    setDetailsLoading(true)
    if (title.source === 'Open Movies') {
      const movie = openMovieForTitle(title.id)
      if (!movie) {
        setDetailsLoading(false)
        setDetailsError('This open movie is no longer available in the catalog.')
        return
      }
      setDetails(movie.details)
      setLibrary((current) => rememberTitles(current, [title]))
      setDetailsLoading(false)
      return
    }
    const controller = new AbortController()
    detailsRequest.current = controller
    void providerApi.details(title, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setDetails(result)
        setLibrary((current) => rememberTitles(current, [{ ...title, ...result }]))
        setSeasons(result.seasons ?? [])
        if (title.kind === 'Series' && result.seasons?.length) {
          setSelectedSeason(result.seasons[0].number)
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDetailsError(errorText(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailsLoading(false)
      })
  }

  useEffect(() => {
    if (!activeTitle || activeTitle.kind !== 'Series' || !selectedSeason) return
    const season = seasons.find((item) => item.number === selectedSeason)
    if (!season) return
    episodesRequest.current?.abort()
    const controller = new AbortController()
    episodesRequest.current = controller
    const resultKey = `${activeTitle.id}:${selectedSeason}`
    void providerApi.episodes(activeTitle, season, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setEpisodeResult({ key: resultKey, episodes: result.episodes })
          if (result.episodes[0]) {
            setSelectedEpisodeState({ titleId: activeTitle.id, seasonNumber: selectedSeason, episode: result.episodes[0] })
          }
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setEpisodeResult({ key: resultKey, episodes: [] })
          setDetailsError(errorText(error))
        }
      })
    return () => controller.abort()
  }, [activeTitle, selectedSeason, seasons])

  const isFinalEpisode = (episode: MediaEpisode | null) => {
    if (!episode || !seasons.length) return false
    const finalSeason = Math.max(...seasons.map((season) => season.number))
    if (selectedSeason !== finalSeason) return false
    const finalEpisodeNumber = Math.max(0, ...episodes.map((item) => item.number))
    return episode.number === finalEpisodeNumber
  }

  const startPlayback = async () => {
    if (!activeTitle) return
    if (activeTitle.kind === 'Series' && !selectedEpisode) {
      setDetailsError('Select an episode before playing this series.')
      return
    }
    setResolving(true)
    setDetailsError(null)
    try {
      let streams: ResolvedStream[]
      if (activeTitle.source === 'Open Movies') {
        const movie = openMovieForTitle(activeTitle.id)
        if (!movie) throw new ProviderApiError('This open movie is no longer available in the catalog.')
        streams = [movie.stream]
      } else {
        streams = (await providerApi.resolve(activeTitle, selectedEpisode?.catalogPath)).streams
      }
      if (!streams.length) throw new ProviderApiError('No playable stream was returned by the provider.')
      const episodeKey = selectedEpisode ? `S${String(selectedSeason).padStart(2, '0')}E${String(selectedEpisode.number).padStart(2, '0')}` : ''
      const progress = progressForTitle(library, activeTitle.id).find((entry) => entry.episodeKey === episodeKey)
      const final = activeTitle.kind === 'Movie' || isFinalEpisode(selectedEpisode)
      setPlayer({
        key: `${activeTitle.id}:${episodeKey}:${Date.now()}`,
        title: activeTitle,
        episode: selectedEpisode,
        episodeKey,
        seasonNumber: selectedEpisode ? selectedSeason : 0,
        episodes: selectedEpisode ? [...episodes].sort((a, b) => a.number - b.number) : [],
        seasons: selectedEpisode ? seasons : [],
        resumeSeconds: progress?.positionSeconds ?? 0,
        streams,
        streamIndex: 0,
        isFinalTitle: final,
      })
      setActiveTitle(null)
      setPlaybackError(null)
      setPlaybackLoading(true)
      lastCheckpointRef.current = 0
    } catch (error) {
      setDetailsError(errorText(error))
    } finally {
      setResolving(false)
    }
  }

  useEffect(() => {
    if (!player || !videoRef.current) return
    const video = videoRef.current
    const selectedStream = player.streams[player.streamIndex]
    if (!selectedStream) return
    let hls: Hls | null = null
    let cancelled = false
    video.pause()
    video.removeAttribute('src')
    video.load()

    const onReady = () => {
      if (player.resumeSeconds > 5 && player.resumeSeconds < video.duration - 10) {
        video.currentTime = player.resumeSeconds
      }
      void video.play().catch(() => setPlaybackError('Press Play in the player to begin.'))
    }
    const onCanPlay = () => setPlaybackLoading(false)
    const onError = () => {
      setPlaybackLoading(false)
      setPlaybackError(selectedStream.server.includes('Open movie')
        ? 'The direct open-license MP4 could not be loaded from its host. Check your network and try again; VibeFlix does not proxy this media.'
        : 'The stream could not be played. The provider may be unavailable, require headers the browser cannot send, block this page with CORS, or use an unsupported codec.')
    }
    const onPlaybackProblem = (event: Event) => {
      setPlaybackLoading(false)
      setPlaybackError((event as CustomEvent<string>).detail || 'The provider stream could not be played.')
    }

    video.addEventListener('loadedmetadata', onReady, { once: true })
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('error', onError)
    video.addEventListener('vibeflix-playback-problem', onPlaybackProblem)
    if (selectedStream.mimeType.includes('mpegURL') || selectedStream.url.toLowerCase().includes('.m3u8')) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = selectedStream.url
      } else {
        void import('hls.js').then(({ default: HlsPlayer }) => {
          if (cancelled) return
          if (!HlsPlayer.isSupported()) {
            video.dispatchEvent(new CustomEvent('vibeflix-playback-problem', { detail: 'HLS playback is not supported by this browser.' }))
            return
          }
          hls = new HlsPlayer({ enableWorker: true, capLevelToPlayerSize: true })
          hls.on(HlsPlayer.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              video.dispatchEvent(new CustomEvent('vibeflix-playback-problem', {
                detail: 'The provider blocked or changed this playlist, required headers may be missing, or its CORS policy may reject this page. Try another stream if available.',
              }))
            }
          })
          hls.loadSource(selectedStream.url)
          hls.attachMedia(video)
        }).catch(() => {
          if (!cancelled) video.dispatchEvent(new CustomEvent('vibeflix-playback-problem', { detail: 'HLS playback could not be initialized.' }))
        })
      }
    } else {
      video.src = selectedStream.url
    }

    return () => {
      cancelled = true
      video.removeEventListener('loadedmetadata', onReady)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('error', onError)
      video.removeEventListener('vibeflix-playback-problem', onPlaybackProblem)
      hls?.destroy()
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [player])

  const saveVideoProgress = useCallback((video: HTMLVideoElement) => {
    if (!player || !Number.isFinite(video.currentTime) || !Number.isFinite(video.duration) || video.duration <= 0) return
    const now = Date.now()
    if (now - lastCheckpointRef.current < 15_000 && video.currentTime < video.duration * 0.95) return
    lastCheckpointRef.current = now
    updateLibrary((current) => saveProgress(current, player.title, player.episodeKey, video.currentTime, video.duration, player.isFinalTitle))
  }, [player, updateLibrary])

  const closePlayer = useCallback(() => {
    if (videoRef.current && player) {
      saveVideoProgress(videoRef.current)
    }
    setPlayer(null)
    setPlaybackError(null)
    setPlaybackLoading(false)
    window.requestAnimationFrame(() => returnFocusRef.current?.focus())
  }, [player, saveVideoProgress])

  const browseBrowserReadyMovies = useCallback(() => {
    closePlayer()
    setSource('Open Movies')
    setFilter('All')
    setCatalogPage(1)
    setQuery('')
    setSubmittedQuery('')
    setPage('Home')
  }, [closePlayer])

  const changePlayerEpisode = useCallback(async (direction: -1 | 1) => {
    if (!player?.episode) return
    const currentIndex = player.episodes.findIndex((episode) => episode.number === player.episode?.number)
    let targetSeasonNumber = player.seasonNumber
    let targetEpisodes = player.episodes
    let targetEpisode = player.episodes[currentIndex + direction]

    if (!targetEpisode) {
      const orderedSeasons = [...player.seasons].sort((a, b) => a.number - b.number)
      const seasonIndex = orderedSeasons.findIndex((season) => season.number === player.seasonNumber)
      const adjacentSeason = orderedSeasons[seasonIndex + direction]
      if (!adjacentSeason) return
      targetSeasonNumber = adjacentSeason.number
      if (videoRef.current) {
        saveVideoProgress(videoRef.current)
        videoRef.current.pause()
      }
      setPlaybackError(null)
      setPlaybackLoading(true)
      try {
        const result = await providerApi.episodes(player.title, adjacentSeason)
        targetEpisodes = [...result.episodes].sort((a, b) => a.number - b.number)
        targetEpisode = direction > 0 ? targetEpisodes[0] : targetEpisodes[targetEpisodes.length - 1]
      } catch (error) {
        setPlaybackLoading(false)
        setPlaybackError(errorText(error))
        return
      }
    } else {
      if (videoRef.current) {
        saveVideoProgress(videoRef.current)
        videoRef.current.pause()
      }
      setPlaybackError(null)
      setPlaybackLoading(true)
    }

    if (!targetEpisode) {
      setPlaybackLoading(false)
      setPlaybackError('No episode is available in that direction.')
      return
    }

    try {
      const result = await providerApi.resolve(player.title, targetEpisode.catalogPath)
      if (!result.streams.length) throw new ProviderApiError('No playable stream was returned by the provider.')
      const episodeKey = `S${String(targetSeasonNumber).padStart(2, '0')}E${String(targetEpisode.number).padStart(2, '0')}`
      const progress = progressForTitle(library, player.title.id).find((entry) => entry.episodeKey === episodeKey)
      const finalSeasonNumber = Math.max(0, ...player.seasons.map((season) => season.number))
      const finalEpisodeNumber = Math.max(0, ...targetEpisodes.map((episode) => episode.number))
      const isFinalTitle = targetSeasonNumber === finalSeasonNumber && targetEpisode.number === finalEpisodeNumber
      setPlayer((current) => current?.key === player.key ? {
        ...current,
        key: `${player.title.id}:${episodeKey}:${Date.now()}`,
        episode: targetEpisode,
        episodeKey,
        seasonNumber: targetSeasonNumber,
        episodes: targetEpisodes,
        resumeSeconds: progress?.positionSeconds ?? 0,
        streams: result.streams,
        streamIndex: 0,
        isFinalTitle,
      } : current)
      lastCheckpointRef.current = 0
    } catch (error) {
      setPlaybackLoading(false)
      setPlaybackError(errorText(error))
    }
  }, [library, player, saveVideoProgress])

  useEffect(() => {
    if (player) playerBackRef.current?.focus()
  }, [player])

  useEffect(() => {
    if (!player) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePlayer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [player, closePlayer])

  const toggleTitleSaved = (title: CatalogTitle) => {
    const next = toggleSaved(library, title)
    setLibrary(next)
    setNotice(next.savedIds.includes(title.id) ? 'Added to your local My List.' : 'Removed from your local My List.')
    window.setTimeout(() => setNotice(null), 2200)
  }

  const goTo = (destination: PageName | 'Movies' | 'Series') => {
    if (destination === 'Movies' || destination === 'Series') {
      setCatalogPage(1)
      setFilter(destination)
      setPage('Home')
    } else {
      setPage(destination)
      if (destination !== 'Search') {
        setCatalogPage(1)
        setQuery('')
        setSubmittedQuery('')
        setFilter('All')
      }
    }
  }

  const pageTitles = page === 'Home' || page === 'Search' ? catalog : visibleList
  const continueTitles = useMemo(() => {
    const progress = Object.values(library.progress).sort((a, b) => b.updatedAt - a.updatedAt)
    const seen = new Set<string>()
    return progress.flatMap((entry) => {
      if (seen.has(entry.titleId) || !library.titles[entry.titleId]) return []
      seen.add(entry.titleId)
      return [library.titles[entry.titleId]]
    })
  }, [library])
  const savedTitles = useMemo(() => libraryTitles(library, library.savedIds), [library])
  const movies = useMemo(() => catalog.filter((title) => title.kind === 'Movie'), [catalog])
  const series = useMemo(() => catalog.filter((title) => title.kind === 'Series'), [catalog])

  const closeDetails = useCallback(() => {
    detailsRequest.current?.abort()
    episodesRequest.current?.abort()
    setActiveTitle(null)
    setDetails(null)
    setDetailsError(null)
    window.requestAnimationFrame(() => returnFocusRef.current?.focus())
  }, [])

  const enterCatalog = () => {
    goTo('Home')
    if (window.location.hash === '#browse') setShowWelcome(false)
    else window.location.hash = 'browse'
  }

  useEffect(() => {
    const syncViewFromHash = () => {
      const browseRequested = window.location.hash === '#browse'
      setShowWelcome(!browseRequested)
      if (!browseRequested) {
        if (player) closePlayer()
        if (activeTitle) closeDetails()
        returnFocusRef.current = null
      }
    }
    window.addEventListener('hashchange', syncViewFromHash)
    return () => window.removeEventListener('hashchange', syncViewFromHash)
  }, [activeTitle, closeDetails, closePlayer, player])

  const header = (
    <header className="site-header">
      <a href="#home" className="brand" onClick={(event) => { event.preventDefault(); goTo('Home') }} aria-label="VibeFlix home">
        <span className="brand__mark" aria-hidden="true">V</span><span>VibeFlix</span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        <button type="button" className={page === 'Home' && filter === 'All' ? 'is-active' : ''} onClick={() => { setFilter('All'); goTo('Home') }}>Home</button>
        {source !== 'Open Movies' && <button type="button" className={filter === 'Series' ? 'is-active' : ''} onClick={() => goTo('Series')}>Series</button>}
        <button type="button" className={filter === 'Movies' ? 'is-active' : ''} onClick={() => goTo('Movies')}>Movies</button>
        <button type="button" className={page === 'My List' ? 'is-active' : ''} onClick={() => goTo('My List')}>My List</button>
        <button type="button" className={page === 'Continue Watching' ? 'is-active' : ''} onClick={() => goTo('Continue Watching')}>Continue</button>
      </nav>
      <div className="header-tools">
        <label className="search-control">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search the catalog</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); if (event.target.value) setPage('Search') }}
            onKeyDown={(event) => { if (event.key === 'Enter') { setCatalogPage(1); setSubmittedQuery(query.trim()); setPage(query.trim() ? 'Search' : 'Home') } }}
            placeholder="Search titles"
            autoComplete="off"
          />
          {query && <button type="button" className="search-clear" onClick={() => { setQuery(''); setSubmittedQuery(''); setPage('Home'); searchRef.current?.focus() }} aria-label="Clear search"><X size={15} /></button>}
        </label>
        <label className="source-select">
          <span className="sr-only">Catalog source</span>
          <select value={source} onChange={(event) => {
            setCatalogPage(1)
            setFilter('All')
            setSource(event.target.value as SourceChoice)
            setPage('Home')
          }}>
            <option>Both Servers</option><option>Server 1</option><option>Server 2</option><option>Open Movies</option>
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        <button type="button" className="history-shortcut" aria-label="Open history" onClick={() => goTo('History')} title="History"><Clock3 size={19} /></button>
      </div>
    </header>
  )

  const renderCards = (titles: CatalogTitle[], landscape = false) => (
    <div className={`catalog-grid${landscape ? ' catalog-grid--landscape' : ''}`}>
      {titles.map((title) => (
        <TitleCard key={title.id} title={title} landscape={landscape} library={library} onOpen={openTitle} onToggleSaved={toggleTitleSaved} progress={progressForTitle(library, title.id)[0]} />
      ))}
    </div>
  )

  const viewHeading: Record<PageName, { eyebrow: string; title: string; description: string }> = {
    Home: { eyebrow: 'VIBEFLIX  /  DISCOVER', title: 'Find your next watch.', description: 'Explore live titles from your selected catalog sources.' },
    Search: { eyebrow: 'VIBEFLIX  /  SEARCH', title: submittedQuery ? `Results for “${submittedQuery}”` : 'Search the catalog.', description: 'Search titles from your selected catalog sources.' },
    'My List': { eyebrow: 'YOUR LIBRARY  /  SAVED', title: 'My List', description: 'Your saved titles stay in this browser on this device.' },
    'Continue Watching': { eyebrow: 'YOUR LIBRARY  /  RESUME', title: 'Continue watching', description: 'Resume positions are stored locally in this browser.' },
    History: { eyebrow: 'YOUR LIBRARY  /  HISTORY', title: 'Watch history', description: 'Your viewing history stays local to this browser.' },
  }

  const currentHeading = viewHeading[page]
  const browsePage = page === 'Home' || page === 'Search'
  const showCatalogLoading = loading && browsePage
  const emptyTitles = pageTitles.length === 0
  const emptyLibraryCopy = page === 'My List'
    ? ['Your list is ready for a first title.', 'Browse the catalog and save a movie or series. It will remain available in this browser.']
    : page === 'Continue Watching'
      ? ['Nothing to resume yet.', 'Choose a title and your browser will remember playback progress locally.']
      : page === 'History'
        ? ['No viewing history yet.', 'Titles you finish will appear here.']
        : ['No titles are available in this view.', 'Try another source or filter, or check again later.']
  const playerOpenMovie = player ? openMovieForTitle(player.title.id) : undefined
  const playerEpisodeIndex = player?.episode
    ? player.episodes.findIndex((episode) => episode.number === player.episode?.number)
    : -1
  const canNavigatePlayerPrevious = !!player?.episode && (
    playerEpisodeIndex > 0 || player.seasons.some((season) => season.number < player.seasonNumber)
  )
  const canNavigatePlayerNext = !!player?.episode && (
    playerEpisodeIndex >= 0 && playerEpisodeIndex < player.episodes.length - 1
      || player.seasons.some((season) => season.number > player.seasonNumber)
  )

  return (
    <div className={`app-shell${showWelcome ? ' app-shell--welcome' : ''}`} id={showWelcome ? 'app-root' : 'home'}>
      {showWelcome ? (
        <WelcomeScreen featured={featured} heroBackdrop={heroBackdrop} onBrowse={enterCatalog} />
      ) : (
        <>
          {header}
          <main>
        {page === 'Home' && featured && (
          <section className="hero" aria-label={`Featured title ${featured.name}`}>
            {heroBackdrop && <img className="hero__art" src={heroBackdrop} alt="" />}
            <div className="hero__scrim" />
            <div className="hero__copy">
              <span className="eyebrow"><span className="eyebrow-dot" /> FEATURED FROM {featured.source.toUpperCase()}</span>
              <h1>{featured.name}</h1>
              <div className="hero__metadata">{titleMetadata(featured).filter((item) => item !== featured.source).map((item) => <span key={item}>{item}</span>)}</div>
              <p>{featured.synopsis || 'Open the title for details from its provider.'}</p>
              <div className="hero__actions">
                <button type="button" className="button button--primary" onClick={() => openTitle(featured)}><Play size={18} fill="currentColor" /> Play</button>
                <button type="button" className="button button--glass" onClick={() => openTitle(featured)}><Info size={18} /> More info</button>
              </div>
            </div>
            <div className="hero__fade" />
          </section>
        )}

        <div className="page-content">
          {page !== 'Home' && (
            <div className="page-heading">
              <span className="eyebrow">{currentHeading.eyebrow}</span>
              <h1>{currentHeading.title}</h1>
              <p>{currentHeading.description}</p>
            </div>
          )}

          {page === 'Home' && (
            <div className="browse-toolbar">
              <div className="filter-chips" role="group" aria-label="Browse catalog filter">
                {(source === 'Open Movies' ? FILTERS.filter((item) => item === 'All' || item === 'Movies') : FILTERS).map((item) => (
                  <button type="button" key={item} className={`filter-chip${filter === item ? ' is-active' : ''}`} onClick={() => { setCatalogPage(1); setFilter(item); setPage('Home') }} aria-pressed={filter === item}>{item}</button>
                ))}
              </div>
              <div className="source-status" role="status">
                <span className={`source-status__dot${sourceWarnings.length ? ' is-warning' : ''}`} />
                {loading ? 'Connecting to catalog sources' : sourceWarnings.length ? sourceWarnings.join(' · ') : `Browsing ${source}`}
              </div>
              {source === 'Open Movies' && (
                <p className="open-movie-note">
                  Browser-ready, openly licensed direct MP4s. Server 1 and Server 2 stay available separately; their own CORS and access rules still apply.
                </p>
              )}
            </div>
          )}

          {page === 'Home' && continueTitles.length > 0 && (
            <TitleRow title="Continue watching" titles={continueTitles} library={library} onOpen={openTitle} onToggleSaved={toggleTitleSaved} landscape />
          )}
          {page === 'Home' && savedTitles.length > 0 && (
            <TitleRow title="My List" titles={savedTitles.slice(0, 12)} library={library} onOpen={openTitle} onToggleSaved={toggleTitleSaved} />
          )}

          {page === 'Home' && !loading && catalog.length > 0 && (
            <>
              <TitleRow
                title={source === 'Open Movies' ? 'Open-license movies' : filter === 'All' ? 'Explore titles' : `${filter} titles`}
                titles={source === 'Open Movies' ? catalog : catalog.slice(1)}
                library={library}
                onOpen={openTitle}
                onToggleSaved={toggleTitleSaved}
              />
              {source !== 'Open Movies' && filter === 'All' && movies.length > 0 && <TitleRow title="Movies" titles={movies} library={library} onOpen={openTitle} onToggleSaved={toggleTitleSaved} />}
              {source !== 'Open Movies' && filter === 'All' && series.length > 0 && <TitleRow title="Series" titles={series} library={library} onOpen={openTitle} onToggleSaved={toggleTitleSaved} />}
              {source !== 'Open Movies' && hasNext && <div className="pagination"><button type="button" className="button button--secondary" onClick={() => setCatalogPage((current) => current + 1)}>Browse more <ChevronRight size={16} /></button></div>}
            </>
          )}

          {page === 'Search' && !loading && catalog.length > 0 && (
            <section className="search-results">
              <div className="section-heading"><h2>Search results</h2><span className="section-heading__count">{catalog.length} titles</span></div>
              {renderCards(catalog)}
            </section>
          )}

          {page !== 'Home' && page !== 'Search' && visibleList.length > 0 && (
            <section className="library-results">{renderCards(visibleList, page === 'Continue Watching')}</section>
          )}

          {showCatalogLoading && (
            <div className="loading-state" role="status" aria-live="polite">
              <LoaderCircle size={22} className="spin" />
              <span>Connecting to the selected catalog…</span>
            </div>
          )}
          {!showCatalogLoading && browsePage && catalogError && (
            <div className="error-state" role="alert">
              <strong>Catalog unavailable</strong><span>{catalogError}</span>
              <button type="button" className="button button--secondary" onClick={() => setRefreshToken((current) => current + 1)}>Try again</button>
            </div>
          )}
          {!showCatalogLoading && emptyTitles && (!browsePage || !catalogError) && (
            <div className="empty-state">
              <span className="empty-state__mark">V</span>
              <h2>{emptyLibraryCopy[0]}</h2>
              <p>{emptyLibraryCopy[1]}</p>
              {page !== 'Home' && page !== 'Search' && <button type="button" className="button button--primary" onClick={() => goTo('Home')}><Play size={16} fill="currentColor" /> Browse titles</button>}
            </div>
          )}
        </div>
      </main>

      <footer className="site-footer">
        <span>VibeFlix</span><span>Personal-use client. Use only content you are authorized to access.</span>
        <button type="button" onClick={() => goTo('History')}>History</button>
      </footer>

      {notice && <div className="toast" role="status">{notice}</div>}

      {activeTitle && (
        <DetailsDialog
          title={{ ...activeTitle, ...details }}
          details={details}
          loading={detailsLoading}
          error={detailsError}
          seasons={seasons}
          selectedSeason={selectedSeason}
          episodes={episodes}
          episodesLoading={episodesLoading}
          selectedEpisode={selectedEpisode}
          onSeason={(number) => { setDetailsError(null); setSelectedEpisodeState(null); setSelectedSeason(number) }}
          onEpisode={(episode) => setSelectedEpisodeState({ titleId: activeTitle.id, seasonNumber: selectedSeason, episode })}
          onPlay={() => void startPlayback()}
          onClose={closeDetails}
          onToggleSaved={() => toggleTitleSaved(activeTitle)}
          saved={library.savedIds.includes(activeTitle.id)}
          playing={resolving}
        />
      )}

      {player && (
        <div className="player-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePlayer() }}>
          <section
            ref={playerDialogRef}
            className="player-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Playing ${player.title.name}`}
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              const focusable = Array.from(playerDialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), video, a[href], [tabindex]:not([tabindex="-1"])',
              ) ?? []).filter((element) => element.offsetParent !== null)
              if (!focusable.length) return
              const first = focusable[0]
              const last = focusable[focusable.length - 1]
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
            }}
          >
            <header className="player-dialog__header">
              <button ref={playerBackRef} type="button" className="player-back" onClick={closePlayer}><ArrowLeft size={18} /> Back to browse</button>
              <div><strong>{player.episode?.name || player.title.name}</strong><span>{player.episode ? `${player.title.name} · S${String(player.seasonNumber || 1).padStart(2, '0')} E${String(player.episode.number).padStart(2, '0')}` : player.title.source}</span></div>
              <button type="button" className="dialog-close" onClick={closePlayer} aria-label="Close player"><X size={20} /></button>
            </header>
            <div className="video-stage">
              <video
                ref={videoRef}
                controls
                playsInline
                autoPlay
                aria-label={`Video player for ${player.episode?.name || player.title.name}`}
                onPlay={() => setPlaybackError(null)}
                onTimeUpdate={(event) => saveVideoProgress(event.currentTarget)}
                onEnded={(event) => {
                  updateLibrary((current) => saveProgress(current, player.title, player.episodeKey, event.currentTarget.duration, event.currentTarget.duration, player.isFinalTitle))
                }}
              />
              {playbackLoading && <div className="video-status"><LoaderCircle className="spin" size={28} /><span>Preparing player…</span></div>}
              {playbackError && (
                <div className="video-error" role="alert">
                  <strong>Playback problem</strong>
                  <span>{playbackError}</span>
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => {
                      const video = videoRef.current
                      if (!video) return
                      setPlaybackError(null)
                      void video.play().catch(() => setPlaybackError('Playback is still blocked. Use the video controls or check the source and network.'))
                    }}
                  >
                    Play video
                  </button>
                  {player.streamIndex + 1 < player.streams.length && (
                    <button type="button" className="button button--secondary" onClick={() => setPlayer((current) => current ? { ...current, streamIndex: current.streamIndex + 1 } : null)}>Try another stream</button>
                  )}
                  {player.title.source !== 'Open Movies' && (
                    <button type="button" className="button button--secondary" onClick={browseBrowserReadyMovies}>Browse Open Movies</button>
                  )}
                </div>
              )}
            </div>
            <div className="player-dialog__foot">
              {playerOpenMovie ? (
                <span className="player-source-attribution">
                  {playerOpenMovie.attribution} · <a href={playerOpenMovie.licenseUrl} target="_blank" rel="noopener noreferrer">CC BY 3.0</a> · <a href={playerOpenMovie.stream.url} target="_blank" rel="noopener noreferrer">Open direct MP4</a>
                </span>
              ) : (
                <span>Resolved provider URLs are not stored in your local library.</span>
              )}
              {player.episode && (
                <div className="player-episode-nav" aria-label="Episode navigation">
                  <button type="button" onClick={() => void changePlayerEpisode(-1)} disabled={!canNavigatePlayerPrevious || playbackLoading} aria-label="Play previous episode"><ChevronLeft size={15} /> Previous</button>
                  <span>S{String(player.seasonNumber).padStart(2, '0')} E{String(player.episode.number).padStart(2, '0')}</span>
                  <button type="button" onClick={() => void changePlayerEpisode(1)} disabled={!canNavigatePlayerNext || playbackLoading} aria-label="Play next episode">Next <ChevronRight size={15} /></button>
                </div>
              )}
              {player.streams.length > 1 && <span>Stream {player.streamIndex + 1} of {player.streams.length}</span>}
            </div>
          </section>
        </div>
      )}
        </>
      )}
    </div>
  )
}

export default App
