const projectUrl = (process.env.VITE_SUPABASE_URL || 'https://fzhrpgoouourzzhfvuzk.supabase.co').replace(/\/$/, '')
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_DKNKqUIq6wp1GE-vKfFvSg_CHxeUgn9'
const endpoint = `${projectUrl}/functions/v1/vibeflix-provider`
const pagesOrigin = 'https://shadow-tech-zone.github.io'

async function providerRequest(payload) {
  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        Origin: pagesOrigin,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90_000),
    })
  } catch {
    throw new Error('Could not reach the deployed Supabase function.')
  }

  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(`Function returned a non-JSON response (${response.status}).`)
  }
  if (!response.ok) throw new Error(body.error || `Function returned HTTP ${response.status}.`)
  return body
}

async function probeMedia(url, mimeType, depth = 0) {
  const isPlaylist = mimeType.toLowerCase().includes('mpegurl') || /\.m3u8(?:$|[?#])/i.test(url)
  let response
  try {
    response = await fetch(url, {
      headers: {
        Origin: pagesOrigin,
        ...(isPlaylist ? {} : { Range: 'bytes=0-0' }),
      },
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    return { reachable: false, cors: false, status: 'network error', segment: 'not checked' }
  }

  const allowOrigin = response.headers.get('access-control-allow-origin') || ''
  const cors = allowOrigin === '*' || allowOrigin === pagesOrigin
  const status = response.status
  if (!response.ok) {
    await response.body?.cancel().catch(() => {})
    return { reachable: false, cors, status, segment: 'not checked' }
  }

  if (!isPlaylist || depth >= 2) {
    await response.body?.cancel().catch(() => {})
    return { reachable: true, cors, status, segment: 'not checked' }
  }

  let playlist
  try {
    playlist = await response.text()
  } catch {
    return { reachable: true, cors, status, segment: 'manifest unreadable' }
  }
  const entry = playlist.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith('#'))
  if (!entry) return { reachable: true, cors, status, segment: 'no media URI found' }

  let childUrl
  try {
    childUrl = new URL(entry, url).href
  } catch {
    return { reachable: true, cors, status, segment: 'invalid media URI' }
  }
  const childIsPlaylist = /\.m3u8(?:$|[?#])/i.test(childUrl)
  const child = await probeMedia(childUrl, childIsPlaylist ? 'application/x-mpegURL' : 'video/segment', depth + 1)
  return {
    reachable: true,
    cors: cors && child.cors,
    status,
    segment: child.reachable ? 'first media request reachable' : `first media request failed (${child.status})`,
  }
}

async function testSource(sourceIndex, label) {
  const result = await providerRequest({ action: 'catalog', sourceIndex, filter: 'All', page: 1 })
  if (!Array.isArray(result.titles)) throw new Error(`${label} returned no catalog array.`)
  const titles = result.titles
  if (!titles.length) throw new Error(`${label} returned an empty first catalog page.`)
  console.log(`${label}: catalog returned ${titles.length} title(s); source unavailable=${sourceIndex === 1 ? result.server1Unavailable : result.server2Unavailable}`)

  const chosen = titles.find((title) => title.kind === 'Movie') || titles.find((title) => title.kind === 'Series')
  if (!chosen) throw new Error(`${label} did not return a playable movie or series.`)
  const details = await providerRequest({ action: 'details', source: chosen.source, catalogPath: chosen.catalogPath })
  console.log(`${label}: title details loaded (${chosen.kind}; ${details.seasons?.length || 0} season(s)).`)

  let episodeCatalogPath
  if (chosen.kind === 'Series') {
    if (!details.seasons?.length) throw new Error(`${label} series details returned no seasons.`)
    const season = details.seasons[0]
    const episodeResult = await providerRequest({
      action: 'episodes',
      source: chosen.source,
      catalogPath: chosen.catalogPath,
      seasonNumber: season.number,
      seasonPath: season.path,
    })
    const episodes = episodeResult.episodes || []
    const episode = episodes[0]
    if (!episode) throw new Error(`${label} season ${season.number} returned no episodes.`)
    episodeCatalogPath = episode.catalogPath
    console.log(`${label}: season ${season.number} returned ${episodes.length} episode(s).`)
  }

  const resolution = await providerRequest({
    action: 'resolve',
    source: chosen.source,
    catalogPath: chosen.catalogPath,
    episodeCatalogPath,
  })
  const stream = resolution.streams?.[0]
  if (!stream) throw new Error(`${label} stream resolution returned no stream.`)
  const probe = await probeMedia(stream.url, stream.mimeType)
  console.log(`${label}: resolved ${resolution.streams.length} stream(s); media HTTP=${probe.status}; reachable=${probe.reachable}; Pages-origin CORS=${probe.cors}; ${probe.segment}.`)
  return { label, ...probe }
}

try {
  const preflight = await fetch(endpoint, {
    method: 'OPTIONS',
    headers: {
      Origin: pagesOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, apikey, content-type',
    },
    signal: AbortSignal.timeout(15_000),
  })
  const allowedOrigin = preflight.headers.get('access-control-allow-origin')
  const allowedHeaders = preflight.headers.get('access-control-allow-headers')?.toLowerCase() || ''
  if (preflight.status !== 204 || allowedOrigin !== pagesOrigin || !['authorization', 'apikey', 'content-type'].every((header) => allowedHeaders.includes(header))) {
    throw new Error(`Pages-origin CORS preflight failed (HTTP ${preflight.status}).`)
  }
  console.log('GitHub Pages-origin CORS preflight: passed.')

  const results = await Promise.allSettled([
    testSource(1, 'Server 1'),
    testSource(2, 'Server 2'),
  ])
  let failed = false
  for (let index = 0; index < results.length; index++) {
    const result = results[index]
    const label = index === 0 ? 'Server 1' : 'Server 2'
    if (result.status === 'rejected') {
      failed = true
      console.error(`${label} live check failed: ${result.reason instanceof Error ? result.reason.message : 'provider error'}`)
      continue
    }
    if (!result.value.reachable || !result.value.cors || result.value.segment.includes('failed')) failed = true
  }
  if (failed) process.exitCode = 1
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Provider smoke test failed.')
  process.exitCode = 1
}
