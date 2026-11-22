# Project history and retained decisions

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

This document records decisions that still affect current work; it is not a chronology of every experiment.

## Active Android product

The active product is the native Android phone app distributed as a side-by-side package, `org.example.play4u.movyexperiment.v31`. It installs alongside the original app so local history, My List, and playback progress remain separate. The original app is not modified by this repository.

The canonical baseline is `android/vibeflix-v31-source.zip`; CI extracts and patches it. The new repository currently has no published Android release.

## Retained behavior requirements

- User-facing source names: **Server 1**, **Server 2**, and **Both Servers**.
- Preserve My List grid, watch history, Continue Watching, per-title resume, and hidden Continue Watching state.
- Preserve Episodes button, immediate current-season episode list, season picker, and Next Episode behavior.
- Home and Search auto-load more on scroll; no Next page buttons there. Preserve scroll and back state.
- No share buttons. Adult-content blocking is postponed.
- Playback defaults to landscape; captions default to off with a manual CC control.
- No direct TMDB API integration or tokens. Provider-linked poster/backdrop image URLs are allowed.
- Keep Play Protect enabled. Do not claim security clearance or real-device playback success without evidence.

## Removed experiments

- The Smart TV app, old WPF/desktop experiment, and direct-TMDB experiment were intentionally removed and must not be reintroduced.
- The approved future Windows client is a fresh native desktop app, not the old WPF experiment.
- Historical workspace exports, old APKs, SDK/JDK copies, and old build logs are not part of this repository.

## Next phase

The user explicitly chose to begin Windows work and defer the second-Android-install restore test. The installed Android debug build signed in successfully, and live Supabase queries confirmed cloud writes, including a resumable checkpoint; cross-device restore and request-level cross-user RLS isolation with real Auth tokens remain unverified. Do not describe those checks as passed or make them a blocker to Windows scaffolding. They remain necessary before claiming cross-device restoration or relying on cross-user isolation. The `vibeflix-sync` Supabase project and RLS-protected schema are in place; public email signup is disabled. Android source contains versioned explicit consent and local-first sync for My List, latest History per title, per-episode resume/progress, Continue Watching hidden state, title-removal tombstones, and a Clear all History watermark. Future timestamp clamping and removal-wins ties are enforced by database triggers; live SQL checks passed for the History/progress guards, clear watermark, hidden-state tie and later unhide behavior, completion conflict, and fixture cleanup. The latest Android CI run [44971555380](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44971555380) passed offline tests, debug-package verification, client-key configuration checks, and private artifact upload. Stream/playback URLs and provider credentials are excluded from cloud payloads.

The new Windows project is a native WinUI 3/.NET 10 app in `windows/`, not the removed WPF experiment. It provides a fictional local catalogue, search/source/genre filters, title details with season/episode selection, local My List and History, and local-file playback via `Windows.Media.Playback` with play/pause, seek, episode navigation, actual timed-text captions (off by default), and per-episode local progress. Selected files are not copied or persisted as paths. Provider catalogues/streams, audio-track selection, Windows Auth, optional cloud sync, and packaging remain future work. Local compilation is unavailable in this workspace; the Windows GitHub Actions workflow is the remote compile path, while runtime playback still needs Windows testing.

A source-based Windows UX and design brief is in `windows/UX-RESEARCH.md`. The current Microsoft Store product form is verified from its listing and Netflix Help, but the installed app's actual current screens and resize behavior remain unverified. The first VibeFlix visuals are original and clearly labelled as sample-data preview; they are not a hands-on Netflix recreation. Preserve Android's core workflows, but do not transplant its phone layouts or copy Netflix screens/assets. Sync should require a one-time explicit opt-in and then run automatically after sign-in and on app resume, local changes, and network recovery, with queued/retried writes and no repeated manual “Sync now” step. The current Android UI still requires a manual sync action; automatic background syncing remains future work, not a completed feature.

## Verification posture

Automated checks cover compilation, offline unit tests, signing verification, and package metadata. Live provider responses, stream playback, real-device behavior, and Play Protect status are not proven by those checks. Distinguish user-reported device success from CI verification in all communication.
