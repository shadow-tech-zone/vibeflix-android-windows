# VibeFlix private streaming UI experiment

A personal, static streaming-catalog prototype built with React Native Web and Vite. This is a hobby UI experiment—not a streaming service, media player, or provider integration.

The demo uses fictional titles, descriptions, and hand-authored original SVG illustrations. It includes responsive home, series, films, search, details, and My List screens. My List is saved in the current browser's local storage; nothing is sent to a backend. The Play action opens a clearly labelled preview state and does not load media. No third-party image, font, or provider API is required.

The Vercel project is deliberately protected by Vercel SSO. Do not make it public or disable that protection.

## Local development

```sh
npm ci
npm run dev
```

## Build

```sh
npm run build
```

Vercel project settings: root directory `site`, framework Vite, install `npm ci`, build `npm run build`, output `dist`.
