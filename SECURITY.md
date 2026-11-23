# Security notes

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access.

## Repository and secrets

- This repository is private, but privacy is not a substitute for secret management.
- Do not commit keystores, passwords, provider tokens, API credentials, Supabase service-role keys, or user data. `.gitignore` excludes common signing files and local secrets.
- Signed builds must use protected GitHub Actions secrets and an approved expected-certificate fingerprint. Never print secret values in logs, chat, issues, release notes, or artifacts.
- The previous source repository was publicly accessible during migration and had tracked signing material. Treat those legacy credentials as compromised; changing visibility does not revoke copies or erase historical exposure. Do not reuse them for a new release. A compatible signing-key rotation/update plan must be confirmed before signing updates to the existing Android package.
- Supabase service-role credentials must never be placed in the Android app or this repository. Client apps may use only an approved publishable/anon key; user sessions belong in platform-secure storage.

## Product safety and verification

A Play Protect warning was previously observed and remains unresolved. Keep Play Protect enabled. Do not advise bypassing warnings or present a build as malware-cleared. A valid APK signature verifies the signer, not the app's safety or provider content.

CI compilation, offline unit tests, signature verification, and package metadata checks do not prove live playback, provider availability, real-device behavior, or Play Protect clearance.

## Reporting

Report security concerns through the private repository's issue or security channel. Include affected version and reproduction steps, but never attach secrets, tokens, passwords, signing files, or private user data.
