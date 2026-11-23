const projectUrl = (process.env.VITE_SUPABASE_URL || 'https://fzhrpgoouourzzhfvuzk.supabase.co').replace(/\/$/, '')
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_DKNKqUIq6wp1GE-vKfFvSg_CHxeUgn9'
const endpoint = `${projectUrl}/functions/v1/vibeflix-provider`
const pagesOrigin = 'https://shadow-tech-zone.github.io'

function reportFailure(message) {
  console.error(message)
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escaped = String(message)
      .replaceAll('%', '%25')
      .replaceAll('\r', '%0D')
      .replaceAll('\n', '%0A')
      .replaceAll(':', '%3A')
      .replaceAll(',', '%2C')
    console.log(`::error title=VibeFlix provider smoke test::${escaped}`)
  }
}

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

function isHlsStream(stream) {
  return stream.mimeType.toLowerCase().includes('mpegurl') || /\.m3u8(?:$|[?#])/i.test(stream.url)
}

async function probeMedia(url, mimeType, depth = 0) {
  const isPlaylist = isHlsStream({ url, mimeType })
  let response
  try {
    response = await fetch(url, {
      headers: {
        Origin: pagesOrigin,
        Referer: `${pagesOrigin}/`,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
  const streams = resolution.streams || []
  if (!streams.length) throw new Error(`${label} stream resolution returned no stream.`)
  const candidates = streams.slice(0, 5)
  const probes = await Promise.all(candidates.map(async (stream, index) => {
    const requiresCors = isHlsStream(stream)
    const probe = await probeMedia(stream.url, stream.mimeType)
    const playable = probe.reachable && (!requiresCors || probe.cors) && !probe.segment.includes('failed')
    console.log(`${label}: stream ${index + 1}/${streams.length}; HTTP=${probe.status}; reachable=${probe.reachable}; HLS CORS=${probe.cors}; ${probe.segment}; browser-ready=${playable}.`)
    return { index, requiresCors, playable, probe }
  }))
  if (!probes.some((probe) => probe.playable)) {
    const reasons = probes.map(({ index, requiresCors, probe }) => {
      const issues = []
      if (!probe.reachable) issues.push(`HTTP ${probe.status}`)
      if (requiresCors && !probe.cors) issues.push('HLS CORS missing')
      if (probe.segment.includes('failed')) issues.push(probe.segment)
      return `stream ${index + 1}: ${issues.join(', ') || 'not browser-ready'}`
    }).join('; ')
    throw new Error(`${label} has no browser-ready stream among ${probes.length} of ${streams.length} resolved candidate(s) (${reasons}).`)
  }
  return { label, playable: true }
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
      reportFailure(`${label} live check failed: ${result.reason instanceof Error ? result.reason.message : 'provider error'}`)
      continue
    }
    console.log(`${label}: at least one of the probed resolved streams is browser-ready.`)
  }
  if (failed) process.exitCode = 1
} catch (error) {
  reportFailure(error instanceof Error ? error.message : 'Provider smoke test failed.')
  process.exitCode = 1
}
