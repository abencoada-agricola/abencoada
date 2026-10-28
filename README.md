# Abençoada

Android app and web dashboard for Abençoada Agrícola.

Refueling, transfers, checklists and incident reports. Entries are saved offline and sent when the phone reconnects.

- [Dashboard](https://abencoada-agricola.github.io/Abencoada/admin.html)
- [Android APK](https://github.com/abencoada-agricola/Abencoada/releases/latest/download/abencoada.apk)
- [Database configuration](configuracao%20banco%20de%20dados.md)

Android menu buttons follow the user's enabled features after the next connected refresh. Offline phones retain their last received permissions. Incident reports remain available from the toolbar on every screen after login, including when all optional features are disabled; new incident reports require no local, material or fleet code. Text and an optional photo are saved offline and sent after reconnection. Apply supabase/general-occurrences.sql after operation-fleets.sql before deploying this app version.
