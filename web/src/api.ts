import type {
  CatalogResult,
  CatalogTitle,
  MediaEpisode,
  MediaSeason,
  ProviderSource,
  ResolvedStream,
  TitleDetails,
} from './types'

// Publishable keys are intended for client apps; they do not grant service-role access.
// Override these project defaults through Vite env vars when testing another Supabase project.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
  || 'https://fzhrpgoouourzzhfvuzk.supabase.co'
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_DKNKqUIq6wp1GE-vKfFvSg_CHxeUgn9'
const functionUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/vibeflix-provider` : ''

export class ProviderApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProviderApiError'
  }
}

async function request<T>(payload: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  if (!functionUrl || !publishableKey) {
    throw new ProviderApiError('The web provider service is not configured yet.')
  }

  let response: Response
  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    })
  } catch {
    throw new ProviderApiError('Could not reach the provider service. Check your connection and try again.')
  }

  let result: T & { error?: string }
  try {
    result = (await response.json()) as T & { error?: string }
  } catch {
    throw new ProviderApiError('The provider service returned an unreadable response.')
  }

  if (!response.ok) {
    throw new ProviderApiError(result.error || 'The selected provider is unavailable. Please try again.')
  }

  return result
}

export const providerApi = {
  browse(options: {
    sourceIndex: number
    filter: string
    query?: string
    page?: number
    categoryKey?: string
    categoryValue?: string
  }, signal?: AbortSignal) {
    return request<CatalogResult>({ action: 'catalog', page: 1, ...options }, signal)
  },

  details(title: Pick<CatalogTitle, 'source' | 'catalogPath'>, signal?: AbortSignal) {
    return request<TitleDetails>({ action: 'details', ...title }, signal)
  },

  episodes(title: Pick<CatalogTitle, 'source' | 'catalogPath'>, season: MediaSeason, signal?: AbortSignal) {
    return request<{ episodes: MediaEpisode[] }>({
      action: 'episodes',
      ...title,
      seasonNumber: season.number,
      seasonPath: season.path,
    }, signal)
  },

  resolve(title: Pick<CatalogTitle, 'source' | 'catalogPath'>, episodeCatalogPath?: string, signal?: AbortSignal) {
    return request<{ streams: ResolvedStream[] }>({
      action: 'resolve',
      ...title,
      episodeCatalogPath,
    }, signal)
  },
}

export function sourceIndex(source: 'Both Servers' | ProviderSource): number {
  if (source === 'Server 1') return 1
  if (source === 'Server 2') return 2
  return 0
}

export function sourceLabel(index: number): 'Both Servers' | ProviderSource {
  if (index === 1) return 'Server 1'
  if (index === 2) return 'Server 2'
  return 'Both Servers'
}
