import { load } from "npm:cheerio@1.0.0";

const PLAY4U = "https://play4u.org/";
const MOVY = "https://www.movy.sx/";
const MOVY_META = "https://db.wecollege.net/3/";
const MOVY_API = "https://api.wecollege.net/";
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
const MOVY_SERVERS = [
  "miami",
  "boise",
  "chicago",
  "vegas",
  "reno",
  "oakland",
  "seattle",
  "phoenix",
  "atlanta",
  "portland",
  "austin",
  "dallas",
  "delhi",
];
const rateWindows = new Map<string, { start: number; count: number }>();
const publicErrors = new Set([
  "Invalid catalog title.",
  "Unsupported catalog source.",
  "Invalid episode address.",
  "Invalid season address.",
  "Unsupported provider request.",
  "Provider request failed.",
  "Select a valid catalog source.",
  "Select a valid season.",
  "Episodes are only available for series.",
  "Provider stream data unavailable.",
  "Provider stream data changed.",
  "This title has no supported stream right now.",
  "No stream is available for this title.",
  "The provider returned an unsupported stream.",
  "The provider did not return a stream token.",
  "No supported stream is available for this title.",
]);

function allowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (
    origin === "https://shadow-tech-zone.github.io" ||
    origin === "http://localhost:5173" ||
    origin === "http://127.0.0.1:5173"
  ) return true;
  return /^https:\/\/[0-9]+-[a-z0-9-]+\.e2b\.app$/i.test(origin);
}

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "600",
    "Vary": "Origin",
  };
  if (origin && allowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function rateAllowed(request: Request): boolean {
  const address = request.headers.get("cf-connecting-ip") ??
    (request.headers.get("x-forwarded-for") ?? "unknown").split(",", 1)[0];
  const key = address.trim().slice(0, 80) || "unknown";
  const now = Date.now();
  const current = rateWindows.get(key);
  if (!current || now - current.start >= 60_000) {
    if (rateWindows.size >= 5000) {
      for (const [address, window] of rateWindows) {
        if (now - window.start >= 60_000) rateWindows.delete(address);
      }
      if (rateWindows.size >= 5000) return false;
    }
    rateWindows.set(key, { start: now, count: 1 });
    return true;
  }
  current.count++;
  return current.count <= 45;
}

function text(value: unknown, limit = 500): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function positiveInt(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? Math.min(parsed, max)
    : fallback;
}

function safeCatalogPath(source: string, raw: unknown): string {
  const value = text(raw, 2048);
  if (!value) throw new Error("Invalid catalog title.");
  const root = source === "Server 1" ? PLAY4U : MOVY;
  const uri = new URL(value, root);
  if (
    uri.protocol !== "https:" || uri.username || uri.password || uri.search ||
    uri.hash
  ) {
    throw new Error("Invalid catalog title.");
  }
  if (source === "Server 1") {
    if (
      uri.hostname !== "play4u.org" ||
      !/^\/(watch|series)\/[A-Za-z0-9._~-]{1,200}\/?$/.test(uri.pathname)
    ) {
      throw new Error("Invalid catalog title.");
    }
  } else if (source === "Server 2") {
    if (
      uri.hostname !== "www.movy.sx" ||
      !/^\/(movie|tv)\/[0-9]{1,12}$/.test(uri.pathname)
    ) {
      throw new Error("Invalid catalog title.");
    }
  } else {
    throw new Error("Unsupported catalog source.");
  }
  return uri.pathname.replace(/\/$/, "");
}

function safeEpisodePath(
  source: string,
  titlePath: string,
  raw: unknown,
): string {
  const value = text(raw, 2048);
  if (!value) return "";
  const uri = new URL(value, source === "Server 1" ? PLAY4U : MOVY);
  if (uri.protocol !== "https:" || uri.username || uri.password || uri.hash) {
    throw new Error("Invalid episode address.");
  }
  if (source === "Server 1") {
    const title = titlePath.match(/^\/series\/([A-Za-z0-9._~-]{1,200})\/?$/);
    const episode = uri.pathname.match(
      /^\/series\/([A-Za-z0-9._~-]{1,200})\/s-([1-9][0-9]{0,2})\/ep-([1-9][0-9]{0,3})\/?$/,
    );
    if (
      uri.hostname !== "play4u.org" || !title || !episode ||
      title[1].toLowerCase() !== episode[1].toLowerCase() ||
      uri.search || Number(episode[2]) > 500 || Number(episode[3]) > 10000
    ) throw new Error("Invalid episode address.");
    return uri.pathname.replace(/\/$/, "");
  }
  if (source === "Server 2") {
    const owner = titlePath.match(/^\/tv\/([0-9]{1,12})$/);
    const season = uri.searchParams.get("season");
    const episode = uri.searchParams.get("episode");
    if (
      uri.hostname !== "www.movy.sx" || !owner || uri.pathname !== titlePath ||
      !/^\d{1,3}$/.test(season ?? "") || !/^\d{1,4}$/.test(episode ?? "") ||
      Number(season) > 500 || Number(episode) > 10000 ||
      [...uri.searchParams.keys()].some((key) =>
        key !== "season" && key !== "episode"
      )
    ) {
      throw new Error("Invalid episode address.");
    }
    return `${uri.pathname}?season=${season}&episode=${episode}`;
  }
  throw new Error("Unsupported catalog source.");
}

function safeSeasonPath(titlePath: string, raw: unknown): string {
  const value = text(raw, 2048);
  const owner = titlePath.match(/^\/series\/([A-Za-z0-9._~-]{1,200})\/?$/);
  if (!value || !owner) throw new Error("Invalid season address.");
  const uri = new URL(value, PLAY4U);
  const season = uri.pathname.match(
    /^\/series\/([A-Za-z0-9._~-]{1,200})\/s-([1-9][0-9]{0,2})\/?$/,
  );
  if (
    uri.protocol !== "https:" || uri.hostname !== "play4u.org" ||
    uri.username || uri.password ||
    uri.search || uri.hash || !season ||
    owner[1].toLowerCase() !== season[1].toLowerCase() ||
    Number(season[2]) > 500
  ) {
    throw new Error("Invalid season address.");
  }
  return uri.pathname.replace(/\/$/, "");
}

function safeImage(source: string, raw: unknown): string {
  const value = text(raw, 2048);
  if (!value || value.toLowerCase() === "null") return "";
  try {
    const uri = new URL(
      value.startsWith("//") ? `https:${value}` : value,
      source === "Server 1" ? PLAY4U : MOVY,
    );
    return uri.protocol === "https:" && !uri.username && !uri.password
      ? uri.href
      : "";
  } catch {
    return "";
  }
}

function safeStreamUrl(raw: unknown, base: string): string {
  const value = text(raw, 8192);
  if (!value) return "";
  try {
    const uri = new URL(value, base);
    return uri.protocol === "https:" && !uri.username && !uri.password
      ? uri.href
      : "";
  } catch {
    return "";
  }
}

function parseYear(value: unknown): number {
  const match = String(value ?? "").match(
    /(?:^|\D)((?:18|19|20|21)\d{2})(?:\D|$)/,
  );
  return match ? Number(match[1]) : 0;
}

function parseRuntime(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(Math.trunc(value), 1000));
  }
  const match = String(value ?? "").match(/(\d{1,4})\s*(?:min|minute)/i);
  return match ? Math.max(0, Math.min(Number(match[1]), 1000)) : 0;
}

function stableId(source: string, path: string): string {
  return `${source === "Server 1" ? "s1" : "s2"}-${
    path.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()
  }`;
}

function mapPlay4uItem(item: Record<string, unknown>, filter = "All") {
  const path = safeCatalogPath("Server 1", item.watch);
  const name = text(item.title, 250);
  if (!name) return null;
  const segments = path.split("/").filter(Boolean);
  const languages = Array.isArray(item.langs)
    ? item.langs
    : Array.isArray(item.languages)
    ? item.languages
    : [];
  const genres = Array.isArray(item.genre_names)
    ? item.genre_names
    : Array.isArray(item.genres)
    ? item.genres
    : [];
  const runtime = parseRuntime(item.runtime_minutes) ||
    parseRuntime(item.runtime);
  return {
    id: stableId("Server 1", path),
    name,
    kind: segments[0] === "series" ? "Series" : "Movie",
    year: parseYear(item.year) || parseYear(path),
    rating: text(item.age_rating, 30),
    runtimeMinutes: runtime,
    synopsis: text(item.overview, 3000),
    language: languages.map((value) => text(value, 30)).filter(Boolean).join(
      ", ",
    ),
    source: "Server 1",
    genres: [...new Set(genres.map((value) => text(value, 60)).filter(Boolean))]
      .slice(0, 16),
    isNew: filter === "Latest",
    catalogPath: path,
    posterUrl: item.poster || item.poster_url || item.poster_sm
      ? safeImage("Server 1", item.poster || item.poster_url || item.poster_sm)
      : safeImage(
        "Server 2",
        item.poster_path
          ? `https://image.tmdb.org/t/p/w342${
            String(item.poster_path).startsWith("/")
              ? item.poster_path
              : `/${item.poster_path}`
          }`
          : "",
      ),
    backdropUrl: "",
  };
}

function mapPlay4uCard(
  $: ReturnType<typeof load>,
  element: any,
  filter: string,
) {
  const card = $(element);
  const anchor = card.find("a.poster-link").first();
  const image = anchor.find("img").first().length
    ? anchor.find("img").first()
    : card.find("img").first();
  const path = anchor.attr("href") ?? "";
  const rawName = card.attr("data-title") || anchor.attr("aria-label") ||
    image.attr("alt") || "";
  const normalizedPath = safeCatalogPath("Server 1", path);
  const segments = normalizedPath.split("/").filter(Boolean);
  const name = text(rawName, 250);
  if (!name) return null;
  return {
    id: stableId("Server 1", normalizedPath),
    name,
    kind: segments[0] === "series" ? "Series" : "Movie",
    year: parseYear(card.attr("data-year")),
    rating: "",
    runtimeMinutes: 0,
    synopsis: "",
    language: "",
    source: "Server 1",
    genres: [],
    isNew: filter === "Latest",
    catalogPath: normalizedPath,
    posterUrl: safeImage(
      "Server 1",
      image.attr("src") || image.attr("data-src") ||
        image.attr("data-lazy-src"),
    ),
    backdropUrl: "",
  };
}

function play4uBrowseUrl(
  filter: string,
  page: number,
  categoryKey = "",
  categoryValue = "",
): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filter === "Movies") params.set("type", "movie");
  else if (filter === "Series") params.set("type", "series");
  else if (filter === "Latest") params.set("cat", "latest");
  else if (filter === "Hindi") params.set("lang", "hi");
  else if (
    filter === "Category" && /^(industry|lang|genre)$/.test(categoryKey) &&
    /^[a-z0-9-]{1,80}$/.test(categoryValue)
  ) {
    params.set(categoryKey, categoryValue);
  }
  return `${PLAY4U}?${params}`;
}

function providerHostAllowed(source: string, hostname: string): boolean {
  if (source === "Server 1") return hostname === "play4u.org";
  if (source === "Server 2 metadata") {
    return hostname === "db.wecollege.net" || hostname === "www.movy.sx";
  }
  if (source === "Server 2 api") {
    return hostname === "api.wecollege.net" || hostname === "db.wecollege.net";
  }
  return false;
}

function safeUpstreamTarget(target: URL, source: string): boolean {
  return target.protocol === "https:" &&
    (!target.port || target.port === "443") &&
    providerHostAllowed(source, target.hostname) &&
    !target.username &&
    !target.password;
}

async function upstream(
  url: string,
  source: string,
  accept = "application/json, text/html;q=0.9, */*;q=0.8",
): Promise<Response> {
  let target = new URL(url);
  if (!safeUpstreamTarget(target, source)) {
    throw new Error("Unsupported provider request.");
  }
  const headers = new Headers({
    "Accept": accept,
    "Cache-Control": "no-cache",
    "User-Agent": USER_AGENT,
  });
  if (source === "Server 1") headers.set("Referer", PLAY4U);
  else {
    headers.set("Referer", MOVY);
    headers.set("Origin", new URL(MOVY).origin);
  }

  const signal = AbortSignal.timeout(20_000);
  for (let redirectCount = 0; redirectCount <= 4; redirectCount++) {
    const response = await fetch(target, {
      headers,
      signal,
      redirect: "manual",
    });
    const location = response.headers.get("location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) {
      return response;
    }
    if (redirectCount === 4) {
      await response.body?.cancel();
      throw new Error("Provider request failed.");
    }
    const next = new URL(location, target);
    await response.body?.cancel();
    if (!safeUpstreamTarget(next, source)) {
      throw new Error("Unsupported provider request.");
    }
    target = next;
  }
  throw new Error("Provider request failed.");
}

async function fetchJson(url: string, source: string): Promise<any> {
  const response = await upstream(url, source, "application/json, */*;q=0.8");
  if (!response.ok) throw new Error("Provider request failed.");
  return await response.json();
}

async function fetchText(url: string, source: string): Promise<string> {
  const response = await upstream(
    url,
    source,
    "text/html, application/json;q=0.9, */*;q=0.8",
  );
  if (!response.ok) throw new Error("Provider request failed.");
  return await response.text();
}

async function browsePlay4u(
  filter: string,
  query: string,
  page: number,
  categoryKey: string,
  categoryValue: string,
) {
  if (query) {
    const params = new URLSearchParams({
      q: query,
      per_page: "24",
      page: String(page),
    });
    if (filter === "Hindi") params.set("lang", "hi");
    else if (filter === "Movies") params.set("type", "movie");
    else if (filter === "Series") params.set("type", "series");
    else if (
      filter === "Category" && /^(industry|lang|genre)$/.test(categoryKey) &&
      /^[a-z0-9-]{1,80}$/.test(categoryValue)
    ) params.set(categoryKey, categoryValue);
    const data = await fetchJson(
      `${PLAY4U}api/search.php?${params}`,
      "Server 1",
    );
    const rows = Array.isArray(data.items) ? data.items : [];
    const titles = rows.flatMap((item: Record<string, unknown>) => {
      try {
        const title = mapPlay4uItem(item, filter);
        return title ? [title] : [];
      } catch {
        return [];
      }
    });
    const pages = positiveInt(data.pages, 1, 500);
    return { titles, hasNext: page < pages };
  }
  const html = await fetchText(
    play4uBrowseUrl(filter, page, categoryKey, categoryValue),
    "Server 1",
  );
  const $ = load(html);
  const titles = $(".poster-card").toArray().flatMap((element: any) => {
    try {
      const title = mapPlay4uCard($, element, filter);
      return title ? [title] : [];
    } catch {
      return [];
    }
  });
  const hasNext = $("a[href*='page=']").toArray().some((node: any) =>
    $(node).text().trim().toLowerCase() === "next"
  );
  return { titles, hasNext };
}

function movyCatalogRoute(
  filter: string,
  query: string,
  page: number,
): { route: string; type: string } {
  if (query) {
    return {
      route: `/search/multi?query=${encodeURIComponent(query)}&page=${page}`,
      type: "",
    };
  }
  if (filter === "Movies") {
    return {
      route: `/discover/movie?sort_by=popularity.desc&page=${page}`,
      type: "movie",
    };
  }
  if (filter === "Series") {
    return {
      route: `/discover/tv?sort_by=popularity.desc&page=${page}`,
      type: "tv",
    };
  }
  return { route: `/trending/all/week?page=${page}`, type: "" };
}

function mapMovyItem(item: Record<string, unknown>, defaultType: string) {
  const type = text(item.media_type, 10) || defaultType;
  if (type !== "movie" && type !== "tv") return null;
  const id = text(String(item.id ?? ""), 12);
  const name = text(type === "tv" ? item.name : item.title, 250);
  const posterPath = text(item.poster_path, 300);
  if (!/^\d{1,12}$/.test(id) || !name || !posterPath || posterPath === "null") {
    return null;
  }
  const path = `/${type}/${id}`;
  return {
    id: stableId("Server 2", path),
    name,
    kind: type === "tv" ? "Series" : "Movie",
    year: parseYear(type === "tv" ? item.first_air_date : item.release_date),
    rating: typeof item.vote_average === "number" && item.vote_average > 0
      ? item.vote_average.toFixed(1)
      : "",
    runtimeMinutes: 0,
    synopsis: text(item.overview, 3000),
    language: text(item.original_language, 20),
    source: "Server 2",
    genres: [],
    isNew: false,
    catalogPath: path,
    posterUrl: safeImage(
      "Server 2",
      `https://image.tmdb.org/t/p/w342${
        posterPath.startsWith("/") ? posterPath : `/${posterPath}`
      }`,
    ),
    backdropUrl: safeImage(
      "Server 2",
      `https://image.tmdb.org/t/p/w780${
        text(item.backdrop_path, 300).startsWith("/")
          ? text(item.backdrop_path, 300)
          : `/${text(item.backdrop_path, 300)}`
      }`,
    ),
  };
}

function mapMovyWebsiteItem(item: Record<string, unknown>) {
  const path = safeCatalogPath("Server 2", item.slug);
  const name = text(item.title, 250);
  const poster = text(item.poster, 300);
  if (!name || !poster.startsWith("/img/")) return null;
  const segments = path.split("/").filter(Boolean);
  return {
    id: stableId("Server 2", path),
    name,
    kind: segments[0] === "tv" ? "Series" : "Movie",
    year: parseYear(item.release_date),
    rating: "",
    runtimeMinutes: 0,
    synopsis: "",
    language: "",
    source: "Server 2",
    genres: [],
    isNew: false,
    catalogPath: path,
    posterUrl: safeImage("Server 2", poster),
    backdropUrl: "",
  };
}

async function browseMovyWebsiteFallback(
  filter: string,
  query: string,
  page: number,
) {
  if (query || page !== 1 || !["All", "Movies", "Series"].includes(filter)) {
    return null;
  }
  const route = filter === "Movies"
    ? "browse/movie"
    : filter === "Series"
    ? "browse/tv"
    : "";
  const html = await fetchText(new URL(route, MOVY).href, "Server 2 metadata");
  const $ = load(html);
  const script = $("script#__NEXT_DATA__").first().text();
  if (!script) return null;
  const root = JSON.parse(script);
  const pageProps = root?.props?.pageProps;
  if (!pageProps || typeof pageProps !== "object") return null;
  const output: ReturnType<typeof mapMovyWebsiteItem>[] = [];
  const seen = new Set<string>();
  const addRows = (rows: unknown) => {
    if (!Array.isArray(rows)) return;
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      try {
        const title = mapMovyWebsiteItem(row as Record<string, unknown>);
        if (title && !seen.has(title.catalogPath)) {
          seen.add(title.catalogPath);
          output.push(title);
        }
      } catch {
        /* Ignore malformed provider cards without losing other titles. */
      }
    }
  };
  if (filter === "All") {
    for (
      const sectionKey of [
        "trendingSections",
        "defaultSections",
        "streamingSections",
      ]
    ) {
      const sections = pageProps[sectionKey];
      if (Array.isArray(sections)) {
        for (const section of sections) addRows(section?.movies);
      }
    }
    addRows(pageProps.upcomingTv);
    addRows(pageProps.recent4k);
  } else {
    addRows(pageProps.initialGrid);
  }
  return output.length ? { titles: output, hasNext: false } : null;
}

async function browseMovy(filter: string, query: string, page: number) {
  const routes = filter === "Hindi"
    ? [
      {
        route:
          `/discover/movie?sort_by=popularity.desc&with_original_language=hi&page=${page}`,
        type: "movie",
      },
      {
        route:
          `/discover/tv?sort_by=popularity.desc&with_original_language=hi&page=${page}`,
        type: "tv",
      },
    ]
    : [movyCatalogRoute(filter, query, page)];
  const results = await Promise.allSettled(
    routes.map(async ({ route, type }) => {
      const data = await fetchJson(
        new URL(route.replace(/^\//, ""), MOVY_META).href,
        "Server 2 metadata",
      );
      const rows = Array.isArray(data.results) ? data.results : [];
      return {
        titles: rows.flatMap((item: Record<string, unknown>) => {
          const title = mapMovyItem(item, type);
          return title ? [title] : [];
        }),
        hasNext: page < positiveInt(data.total_pages, 1, 500),
      };
    }),
  );
  const good = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  if (!good.length) {
    const fallback = await browseMovyWebsiteFallback(filter, query, page);
    if (fallback) {
      return { ...fallback, unavailable: false, websiteFallback: true };
    }
    throw new Error("Provider request failed.");
  }
  return {
    titles: interleave(...good.map((item) => item.titles)),
    hasNext: good.some((item) => item.hasNext),
    unavailable: good.length < routes.length,
    websiteFallback: false,
  };
}

function interleave<T>(...lists: T[][]): T[] {
  const output: T[] = [];
  for (let index = 0; lists.some((list) => index < list.length); index++) {
    for (const list of lists) if (index < list.length) output.push(list[index]);
  }
  return output;
}

async function browse(payload: any) {
  const source = Number(payload.sourceIndex);
  if (![0, 1, 2].includes(source)) {
    throw new Error("Select a valid catalog source.");
  }
  const filter =
    ["All", "Movies", "Series", "Latest", "Hindi"].includes(payload.filter)
      ? payload.filter
      : "All";
  const query = text(payload.query, 100);
  const page = positiveInt(payload.page, 1, 500);
  const categoryKey = text(payload.categoryKey, 32);
  const categoryValue = text(payload.categoryValue, 80);
  const hindiCategory = filter === "Hindi" ||
    (filter === "Category" && ["lang", "language"].includes(categoryKey) &&
      categoryValue === "hi");
  const server1OnlyCategory = filter === "Category" && !hindiCategory;
  const useServer1 = source === 0 || source === 1;
  const useServer2 = !server1OnlyCategory && (source === 0 || source === 2);
  const tasks: Promise<
    {
      source: string;
      titles: any[];
      hasNext: boolean;
      unavailable?: boolean;
      websiteFallback?: boolean;
    }
  >[] = [];
  if (useServer1) {
    tasks.push(
      browsePlay4u(filter, query, page, categoryKey, categoryValue).then(
        (result) => ({ source: "Server 1", ...result }),
      ),
    );
  }
  if (useServer2) {
    tasks.push(
      browseMovy(filter, query, page).then((result) => ({
        source: "Server 2",
        ...result,
      })),
    );
  }
  const results = await Promise.allSettled(tasks);
  const successful = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  const server1Unavailable = useServer1 &&
    !successful.some((result) => result.source === "Server 1");
  const server2Result = successful.find((result) =>
    result.source === "Server 2"
  );
  const server2Unavailable = useServer2 &&
    (!server2Result || !!server2Result.unavailable);
  const titles = interleave(...successful.map((result) => result.titles));
  return {
    titles,
    hasNext: successful.some((result) => result.hasNext),
    server1Unavailable,
    server2Unavailable,
    server2WebsiteFallback: !!server2Result?.websiteFallback,
    server1OnlyCategory: server1OnlyCategory && source === 2,
  };
}

async function details(payload: any) {
  const source = text(payload.source, 20);
  const path = safeCatalogPath(source, payload.catalogPath);
  if (source === "Server 2") {
    const [kind, id] = path.split("/").filter(Boolean);
    const item = await fetchJson(
      new URL(`${kind}/${id}`, MOVY_META).href,
      "Server 2 metadata",
    );
    const seasons = kind === "tv" && Array.isArray(item.seasons)
      ? item.seasons.flatMap((season: any) => {
        const number = positiveInt(season.season_number, 0, 500);
        if (!number) return [];
        return [{
          number,
          name: text(season.name, 160),
          path: `/tv/${id}/season/${number}`,
        }];
      })
      : [];
    const runtime = positiveInt(item.runtime, 0, 1000) ||
      (Array.isArray(item.episode_run_time)
        ? positiveInt(
          item.episode_run_time.find((value: unknown) => Number(value) > 0),
          0,
          1000,
        )
        : 0);
    const vote = Number(item.vote_average ?? 0);
    return {
      synopsis: text(item.overview, 4000),
      rating: vote > 0 ? vote.toFixed(1) : "",
      runtimeMinutes: runtime,
      language: text(item.original_language, 20),
      genres: Array.isArray(item.genres)
        ? item.genres.map((genre: any) => text(genre.name, 60)).filter(Boolean)
        : [],
      backdropUrl: safeImage(
        "Server 2",
        `https://image.tmdb.org/t/p/w780${
          text(item.backdrop_path, 300).startsWith("/")
            ? text(item.backdrop_path, 300)
            : `/${text(item.backdrop_path, 300)}`
        }`,
      ),
      seasons,
    };
  }
  const html = await fetchText(
    new URL(path.replace(/^\//, ""), PLAY4U).href,
    "Server 1",
  );
  const $ = load(html);
  const overview = $(".vinfo-overview").first().text().trim();
  const image = $("meta[property='og:image']").attr("content") ?? "";
  const metadata = $(".vinfo-meta").first().text().trim();
  const year = parseYear(metadata);
  const runtimeMinutes = parseRuntime(metadata);
  const genres = $(".vinfo-meta a[href]").toArray().map((node: any) =>
    $(node).text().trim()
  ).filter(Boolean).slice(0, 16);
  const seasons = $("a.season-card, a.chip").toArray().flatMap((node: any) => {
    const href = $(node).attr("href") ?? "";
    let seasonPath = "";
    try {
      seasonPath = safeSeasonPath(path, href);
    } catch {
      return [];
    }
    const match = seasonPath.match(/\/s-([0-9]+)/);
    if (!match) return [];
    return [{
      number: Number(match[1]),
      name: $(node).text().trim(),
      path: seasonPath,
    }];
  });
  return {
    synopsis: overview,
    rating: "",
    year,
    runtimeMinutes,
    language: "",
    genres,
    backdropUrl: safeImage("Server 1", image),
    seasons,
  };
}

async function episodes(payload: any) {
  const source = text(payload.source, 20);
  const titlePath = safeCatalogPath(source, payload.catalogPath);
  const seasonNumber = positiveInt(payload.seasonNumber, 0, 500);
  if (!seasonNumber) throw new Error("Select a valid season.");
  if (source === "Server 2") {
    const match = titlePath.match(/^\/tv\/([0-9]{1,12})$/);
    if (!match) throw new Error("Episodes are only available for series.");
    const data = await fetchJson(
      new URL(`tv/${match[1]}/season/${seasonNumber}`, MOVY_META).href,
      "Server 2 metadata",
    );
    const rows = Array.isArray(data.episodes) ? data.episodes : [];
    return {
      episodes: rows.flatMap((item: any) => {
        const number = positiveInt(item.episode_number, 0, 10000);
        if (!number) return [];
        const still = text(item.still_path, 300);
        return [{
          number,
          name: text(item.name, 250) || `Episode ${number}`,
          synopsis: text(item.overview, 2500),
          runtimeMinutes: positiveInt(item.runtime, 0, 1000),
          catalogPath: `${titlePath}?season=${seasonNumber}&episode=${number}`,
          thumbnailUrl: safeImage(
            "Server 2",
            still
              ? `https://image.tmdb.org/t/p/w300${
                still.startsWith("/") ? still : `/${still}`
              }`
              : "",
          ),
        }];
      }),
    };
  }
  const seasonPath = safeSeasonPath(titlePath, payload.seasonPath);
  if (!seasonPath.includes(`/s-${seasonNumber}`)) {
    throw new Error("Invalid season address.");
  }
  const html = await fetchText(
    new URL(seasonPath.replace(/^\//, ""), PLAY4U).href,
    "Server 1",
  );
  const $ = load(html);
  const result = $("a.ep[href]").toArray().flatMap((node: any) => {
    const href = $(node).attr("href") ?? "";
    let episodePath = "";
    try {
      episodePath = safeEpisodePath("Server 1", titlePath, href);
    } catch {
      return [];
    }
    const numberMatch = episodePath.match(/\/ep-([0-9]+)/);
    if (!numberMatch) return [];
    const style = $(node).find(".ep-still").attr("style") ?? "";
    const imageMatch = style.match(/url\(["']?(https:\/\/[^)"']+)["']?\)/i);
    return [{
      number: Number(numberMatch[1]),
      name: $(node).find("h3").first().text().trim() || $(node).text().trim(),
      synopsis: $(node).find("p").first().text().trim(),
      runtimeMinutes: 0,
      catalogPath: episodePath,
      thumbnailUrl: safeImage("Server 1", imageMatch?.[1] ?? ""),
    }];
  });
  return { episodes: result.sort((a: any, b: any) => a.number - b.number) };
}

function decodeBase64Url(value: string): Uint8Array {
  let normalized = value.trim().replace(/"/g, "").replace(/-/g, "+").replace(
    /_/g,
    "/",
  ).replace(/=+$/, "");
  normalized = normalized.padEnd(
    normalized.length + ((4 - normalized.length % 4) % 4),
    "=",
  );
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodePlay4u(encoded: string, key: string): string {
  const data = decodeBase64Url(encoded);
  const keyBytes = new TextEncoder().encode(key);
  if (!keyBytes.length) throw new Error("Provider stream data unavailable.");
  for (let index = 0; index < data.length; index++) {
    data[index] ^= keyBytes[index % keyBytes.length];
  }
  return new TextDecoder().decode(data);
}

function rotl(value: number, count: number): number {
  const shift = count & 31;
  return ((value << shift) | (value >>> ((32 - shift) & 31))) >>> 0;
}

function mix(input: number): number {
  let value = input >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b) >>> 0;
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function decodeMovy(encoded: string, seed: string, mediaId: number): string {
  const data = decodeBase64Url(encoded);
  if (data.length < 4) throw new Error("Provider stream data unavailable.");
  const golden = 0x9e3779b9;
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    hash = Math.imul((hash ^ seed.charCodeAt(index)) >>> 0, 0x01000193) >>> 0;
  }
  let stateValue = mix(mix(hash) ^ mix(((mediaId >>> 0) ^ golden) >>> 0));
  const state = new Uint32Array(61);
  const used = new Uint8Array(61);
  for (let index = 0; index < 8; index++) {
    const slot = stateValue % 61;
    stateValue = rotl((stateValue + golden) >>> 0, 7 + (index & 7));
    state[slot] = (stateValue ^ mix(stateValue)) >>> 0;
    used[slot] = 1;
    stateValue = mix((stateValue + slot) >>> 0);
  }
  let accumulator = mix(0xa5a5a5a5 ^ stateValue);
  let word = 0;
  for (let index = 0; index < data.length; index++) {
    if (index % 4 === 0) {
      const slot = accumulator % 61;
      const value =
        (state[slot] ^ Math.imul(golden, Math.floor(index / 4) + 1)) >>> 0;
      let mixed = (accumulator ^ value) >>> 0;
      if (used[slot]) mixed |= accumulator & value;
      mixed = (rotl((mixed + accumulator) >>> 0, slot & 31) ^
        rotl(accumulator, (slot * 7) & 31)) >>> 0;
      accumulator = mix((mixed + golden) >>> 0);
      state[slot] = accumulator;
      used[slot] = 1;
      word = accumulator;
    }
    data[index] ^= (word >>> ((index % 4) * 8)) & 0xff;
  }
  if (
    data[0] !== 0x6d || data[1] !== 0x76 || data[2] !== 0x6d || data[3] !== 0x31
  ) throw new Error("Provider stream data changed.");
  return new TextDecoder().decode(data.subarray(4));
}

function formEncode(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+").replace(
    /[!'()~]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

async function resolvePlay4u(titlePath: string, rawEpisodePath: unknown) {
  const episodePath = safeEpisodePath("Server 1", titlePath, rawEpisodePath);
  const requestPath = episodePath || titlePath;
  const html = await fetchText(
    new URL(requestPath.replace(/^\//, ""), PLAY4U).href,
    "Server 1",
  );
  const match = html.match(/window\.__PA_PLAY__\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!match) throw new Error("This title has no supported stream right now.");
  const payload = JSON.parse(match[1]);
  const streamList = Array.isArray(payload.streams) ? payload.streams : [];
  let raw = "";
  for (const item of streamList) {
    raw = text(item.m3u8_url, 8192);
    if (raw && raw.toLowerCase() !== "null") break;
  }
  if (!raw || raw.toLowerCase() === "null") {
    throw new Error("No stream is available for this title.");
  }
  if (raw.startsWith("pa!~")) {
    const key =
      html.match(/window\.__PA_SEAL_KEY__\s*=\s*["']([^"']+)["']/)?.[1] ?? "";
    raw = decodePlay4u(raw.slice(4), key);
  }
  const url = safeStreamUrl(raw, PLAY4U);
  if (!url) throw new Error("The provider returned an unsupported stream.");
  return {
    streams: [{ url, mimeType: "application/x-mpegURL", server: "Server 1" }],
  };
}

async function resolveMovy(titlePath: string, rawEpisodePath: unknown) {
  const [kind, id] = titlePath.split("/").filter(Boolean);
  let season = 1;
  let episode = 1;
  if (rawEpisodePath) {
    const episodePath = safeEpisodePath("Server 2", titlePath, rawEpisodePath);
    const uri = new URL(episodePath, MOVY);
    season = positiveInt(uri.searchParams.get("season"), 1, 500);
    episode = positiveInt(uri.searchParams.get("episode"), 1, 10000);
  }
  const metadata = await fetchJson(
    new URL(`${kind}/${id}?append_to_response=external_ids`, MOVY_META).href,
    "Server 2 metadata",
  );
  const titleName = text(kind === "tv" ? metadata.name : metadata.title, 250);
  const date = text(
    kind === "tv" ? metadata.first_air_date : metadata.release_date,
    20,
  );
  const year = date.length >= 4 ? date.slice(0, 4) : "";
  const imdbId = text(metadata.imdb_id || metadata.external_ids?.imdb_id, 32);
  const totalSeasons = Math.max(
    1,
    positiveInt(metadata.number_of_seasons, 1, 500),
  );
  const params = `title=${
    formEncode(formEncode(titleName))
  }&mediaType=${kind}&year=${
    formEncode(year)
  }&episodeId=${episode}&seasonId=${season}&tmdbId=${id}&imdbId=${
    formEncode(imdbId)
  }${kind === "tv" ? `&totalSeasons=${totalSeasons}` : ""}`;
  const seedData = await fetchJson(
    new URL(`seed?mediaId=${id}`, MOVY_API).href,
    "Server 2 api",
  );
  const seed = text(seedData.seed, 300);
  if (!seed) throw new Error("The provider did not return a stream token.");
  const results = await Promise.allSettled(MOVY_SERVERS.map(async (server) => {
    const body = await fetchText(
      new URL(
        `${server}/sources?${params}&enc=2&seed=${formEncode(seed)}`,
        MOVY_API,
      ).href,
      "Server 2 api",
    );
    const decoded = JSON.parse(decodeMovy(body, seed, Number(id)));
    const candidates: any[] = [];
    const add = (raw: unknown, hint: unknown) => {
      const url = safeStreamUrl(raw, MOVY_API);
      if (!url) return;
      const mimeType = String(hint).toLowerCase().includes("playlist") ||
          String(hint).toLowerCase().includes("hls") ||
          new URL(url).pathname.toLowerCase().endsWith(".m3u8")
        ? "application/x-mpegURL"
        : String(hint).toLowerCase().includes("mp4") ||
            new URL(url).pathname.toLowerCase().endsWith(".mp4")
        ? "video/mp4"
        : "";
      if (mimeType) candidates.push({ url, mimeType, server });
    };
    add(decoded.playlist, "playlist");
    if (Array.isArray(decoded.sources)) {
      for (const source of decoded.sources) add(source.url, source.type);
    }
    return candidates;
  }));
  const streams = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const unique = [
    ...new Map(streams.map((stream: any) => [stream.url, stream])).values(),
  ];
  if (!unique.length) {
    throw new Error("No supported stream is available for this title.");
  }
  return { streams: unique };
}

async function readBoundedBody(
  request: Request,
  maximumBytes: number,
): Promise<string | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return null;
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function handleAction(payload: any) {
  switch (text(payload.action, 24)) {
    case "catalog":
      return await browse(payload);
    case "details":
      return await details(payload);
    case "episodes":
      return await episodes(payload);
    case "resolve": {
      const source = text(payload.source, 20);
      const titlePath = safeCatalogPath(source, payload.catalogPath);
      return source === "Server 1"
        ? await resolvePlay4u(titlePath, payload.episodeCatalogPath)
        : await resolveMovy(titlePath, payload.episodeCatalogPath);
    }
    default:
      throw new Error("Unsupported provider request.");
  }
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!allowedOrigin(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (!allowedOrigin(origin)) {
    return jsonResponse(
      { error: "This app origin is not allowed." },
      403,
      origin,
    );
  }
  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Use POST for provider requests." },
      405,
      origin,
    );
  }
  if (!request.headers.get("apikey")) {
    return jsonResponse(
      { error: "The public app key is required." },
      401,
      origin,
    );
  }
  if (!rateAllowed(request)) {
    return jsonResponse(
      { error: "Too many requests. Please wait a moment." },
      429,
      origin,
    );
  }

  try {
    const body = await readBoundedBody(request, 32_000);
    if (body === null) {
      return jsonResponse({ error: "Request is too large." }, 413, origin);
    }
    const payload = JSON.parse(body);
    const result = await handleAction(payload);
    return jsonResponse(result, 200, origin);
  } catch (error) {
    const internalMessage = error instanceof Error ? error.message : "";
    const message = publicErrors.has(internalMessage)
      ? internalMessage
      : "Provider request failed.";
    const status = /invalid|unsupported|select|episodes are only/i.test(message)
      ? 400
      : 502;
    return jsonResponse({ error: message }, status, origin);
  }
});
