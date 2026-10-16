# Abençoada Fuel Control

A diesel refueling log for agricultural fleets, with an Android app for workers and a web dashboard for managers. The Android app keeps pending entries on the device when there is no internet. Refuelings are entered only through the Android app; the website is for administration.

The website runs on GitHub Pages. Supabase stores the records and handles administrator authentication. The interface is in Portuguese. Login names and text fields use uppercase, including typed values, reports, and CSV exports. Usernames remain case-insensitive; passwords keep their exact original case.

- [Android APK](https://github.com/abencoada-agricola/diesel/releases/latest/download/abencoada-diesel.apk)
- [Administration](https://abencoada-agricola.github.io/diesel/admin.html)

## Android app: Abastece

Install the APK on Android 8 or later and sign in online with the username and password assigned in **Equipe e acessos**. The app uses `icone-app.png` as its icon.

1. Enter the **local code** and **material code**. These identify the dispenser location and diesel type. Both are required. Suggestions use the catalog stored in the control database.
2. Choose **Abastecimento** or **Transferência**.
3. For refueling, choose **QR Code** or **Digitar dados do abastecimento**.
4. Scan the fleet label or enter its code, check the previous readings, and enter the current required meters before refueling.
5. With QR/dispenser mode, enter the final dispenser reading. Liters are the final reading minus the last verified reading for that local/material. Manual mode asks for liters directly.
6. Save the entry. The account supplies the worker signature; date and time are automatic.

**Transferência** shows the current local/material and last dispenser reading. Enter the source dispenser’s final reading and the new local code. The app shows the difference and the last cached reading for the destination. Equal source readings are allowed when nothing was dispensed since the last entry. The server checks the source baseline before accepting the closure. Transfers do not move inventory in GMAIS, and their closing difference is not counted again as a fleet refueling. Older APK transfer entries remain readable as events without meter readings. The **Observação** warning icon beside **Sair** opens a message linked to the current local and material. Saving or returning preserves the operation draft. An occurrence can include one optional photo, taken with the camera or selected from the gallery. Images are converted to JPEG, reduced to at most 1280 pixels on the longest side and under 280,000 data-URL characters. The compressed photo is saved with the draft and offline queue, including the Android background queue, and delivered atomically with the occurrence. Managers use **Ver foto e detalhes** in **Ocorrências** to load the image; photo content is not included in routine operation lists. Local and material stay fixed until sign-out and a new login. Transfers record the destination without changing this selection.

Managers choose the required fleet meters under **Frotas → Escolher leituras**. Initial defaults are KM for vehicles, engine hours for tractors, and engine/elevator hours for harvesters. Only the selected meters are shown. Numeric inputs use the numeric keyboard and format decimal values automatically. Buttons have pressed feedback and vibration where supported.

QR labels contain a stable fleet code and descriptions. Readings come from the control database and its saved offline copy, not from the printed QR. Only active catalog fleets can be selected.

### Offline operation

The first login needs internet. After login, the installed app opens offline and saves drafts, catalog data and pending entries in IndexedDB. Earlier pending entries are included when computing local previous readings. The Android worker keeps an encrypted copy of the upload queue and a restricted submission credential in Android Keystore-backed storage. This credential can submit entries for the authorized account; it cannot read history or administer the database. It expires after 90 days and is renewed when the app connects. Removing the team member disables submission.

The app checks every 15 seconds, when resumed, when connectivity returns, and when **Enviar** is tapped. WorkManager also schedules uploads with a connected-network requirement, including while the interface is closed. Android controls background execution timing and battery restrictions may delay it. A force-stopped app must be opened again. Pending records are removed only after a matching database receipt. Retries reuse the same ID to prevent duplicates.

Current KM and hour meters cannot be lower than previous received readings. The database validates again when entries synchronize. Conflicts stay on the phone for correction; dependent entries wait. Do not uninstall, clear app data, or switch accounts with pending entries. Sign-out is blocked while the local queue is not empty.

Dispenser calculation requires a verified initial reading, entered under **Configurações → Locais, materiais e registradoras**. Stock balance is not a dispenser reading. A manual-liter entry invalidates that local/material's dispenser baseline because the physical final reading is unknown. A manager must verify it again before dispenser refueling mode is used. The last known physical reading is preserved separately for transfer closure; it is not treated as an up-to-date refueling baseline. A transfer final reading can close that physical interval and establish the next verified source reading. Historical unknown baselines are not guessed. Two disconnected phones may have different baselines; the server rejects mismatches for correction instead of silently changing liters.

## GMAIS data

The fleet catalog was exported from GMAIS. Local/material codes and descriptions consulted in GMAIS are stored in the private control database and downloaded after app login. Operational stock balances and credentials are not bundled into the public repository. This is a catalog snapshot, not a live GMAIS integration. GMAIS user accounts are not imported.

A future integration needs an authorized GMAIS API or read-only backend connection. Database credentials must stay on the server. The app must continue using its cached catalog and queue when disconnected. The October 9, 2026 snapshot includes 234 available primary odometer readings, with their source dates. Identifiable tractor/harvester readings seed engine hours; identifiable vehicle readings seed KM. Unclassified values remain a labeled GMAIS reference. Elevator hours and dispenser baselines are not inferred. Previous readings use the greater of the imported baseline and records received by the Diesel control database. Missing GMAIS meter readings must be verified before they are used as initial values.

## Administration

Administrators sign in with a username and password. They can view and filter records by fleet, worker, date, and synchronization status, inspect readings, export CSV files, and print reports. Managers can exclude incorrect received records with a reason and restore them through **Excluídos**. The Android app cannot edit received entries.

The dashboard checks for new records every 15 seconds while open and shows unread notices in the bell. Optional browser notifications also require the dashboard to remain open.

**Frotas** supports searching by fleet code, name, model, or type. **Editar frota** changes the name, model, type, active status, and total tank capacity. Required Android meters are configured separately and remain unchanged when fleet details are edited. Manufacturer reference capacities are prefilled where the model is sufficiently identifiable. Ambiguous variants remain unset; managers can enter the verified total capacity of the actual tank(s). Updating the GMAIS catalog snapshot preserves custom models and capacities. The dashboard and forms offer light/dark themes with a saved browser preference. The sun/moon icon stays in the header, beside notifications in the dashboard.

The Android refueling form warns immediately above the registered tank capacity, without a tolerance margin or confirmation dialog. Sending remains allowed. The server records the capacity snapshot and an excess-volume flag, including submissions from older APKs. Unknown capacities have no invented limit.

The dashboard offers 7, 30, 60 and 90 day periods, including today, with a saved per-user selection. Totals, fleet volumes, latest entries, averages and CSV exports use the selected period. The chart shows daily volumes for 7 days and groups of 7 days for longer periods. The header displays the current section. The dashboard displays average liters per refueling and per-fleet estimated km/L and L/h. Ratios use the sum of positive meter intervals and the associated liters, not an average of individual ratios. Only confirmed refuelings count; transfers and occurrences do not. Missing baselines, unselected meters, and zero/negative intervals do not produce a ratio. Partial fills and missing refuelings can distort consumption estimates; these are not measured full-tank consumption figures.

**Frotas** also manages the required Android meters. Use **Gerar QR Code** to download or print a fleet label, or **Imprimir todos os QR Codes** for the whole active catalog. Attach the corresponding label to each machine. **Transferências** lists location changes. **Ocorrências** lists observations with the operator and capture date; details show the text and attached photo together. New events appear in the notification bell and trigger an optional browser notification while the dashboard remains open. **Configurações** manages local/material catalogs, verified dispenser readings, access permissions, usernames, and validation rules. Use **Definir senha** in **Equipe e acessos** to create a login or replace an existing password. Passwords require at least 6 characters and confirmation. The server checks the manager’s authenticated session and team membership before calling Supabase Auth; passwords are never stored in the team table. These passwords belong to Diesel and do not change GMAIS credentials. Usernames contain 3–30 letters without accents, numbers, dots, hyphens, or underscores; capitalization does not matter. Email login remains available for existing accounts during the transition.

Public access is limited to the fleet catalog, latest readings and validation rules. Submission requires an Android account or its restricted device synchronization credential. Stored record history and worker names can only be retrieved by authorized accounts. Administration requires a manager account. Database tables have Row Level Security and cannot be accessed directly by public clients.

## Setup and deployment

For a new Supabase project:

1. Run `supabase/schema.sql`, then `supabase/fleets.sql` in the SQL Editor. The bundled catalog contains 246 fleets exported on October 7, 2026.
2. Disable public account signup in Supabase Authentication and create the manager's account there.
3. Register that account in the database, using its lowercase email:

   ```sql
   insert into public.members (email, name, role)
   values ('manager@example.com', 'Manager Name', 'admin');
   ```

4. Run `supabase/usernames.sql`, then `supabase/field-access.sql` , `supabase/mobile.sql`, `supabase/operations.sql`, `supabase/background-sync.sql`, and `supabase/gmais-readings.sql`, then `supabase/fuel-control.sql` and `supabase/transfer-baseline.sql`, then `supabase/occurrence-photos.sql`, once and in that order. The username migration assigns existing accounts an initial username based on their email prefix. It can be changed in the dashboard.
5. Deploy `supabase/functions/diesel-login/index.ts` as **diesel-login**, using `supabase/config.toml`. Keep `verify_jwt = true`. The function resolves usernames on the server and checks passwords with Supabase Auth. Login attempts are limited by username and IP address.
6. Add these repository variables under **Settings → Secrets and variables → Actions → Variables**:

   | Variable | Value |
   | --- | --- |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_PUBLISHABLE_KEY` | Public publishable key |
   | `SUPABASE_LOGIN_KEY` | Public legacy `anon` JWT key for the login function |

7. Enable GitHub Pages with **GitHub Actions** as the source, then run **Publicar sistema** or push to `main`.

Existing installations should apply only migrations they have not already run. Do not rerun the initial schema on an existing database.

The workflow runs tests, builds the site, and deploys `dist/`. Administrative keys stay in the Supabase function environment. Never place passwords, secret keys, or `service_role` keys in the website or repository.

## Android builds

The **Build Android APK** workflow builds and signs the app, verifies its signature, and publishes it under GitHub Releases. It uses the same three public Supabase variables as the website. Add these repository secrets:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded PKCS12 signing keystore, with alias `abencoada`.
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password.

Keep a private backup of the original keystore and its password outside the repository. Future APK updates must use the same signing key. Do not commit keystores or passwords. The Android application ID is `br.com.abencoada.diesel`.

For local builds, install Node.js 22, Java 21, and the Android SDK, then run:

```sh
npm ci
npm run android:sync
```

Open `android/` in Android Studio to run on a phone. For a signed release, pass `ANDROID_KEYSTORE_PATH` and `ANDROID_KEYSTORE_PASSWORD` to Gradle and build `assembleRelease`. Supply the public Supabase variables before `android:sync`; a build without them only previews the interface.

The Android app bundles the interface in the APK and uses the native camera scanner. The former web entry page redirects to administration.

## Development

Use Node.js 22 or later.

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm run dev` serves the local interface. Backend access requires Supabase configuration. The build reads the deployment variables above and writes the configured site to `dist/`.

The service worker caches the interface, fleet catalog, and authentication SDK. Versioned asset names keep deployed updates consistent. Tests use a local PostgreSQL-compatible database to check permissions, required fields, meter rules, declared signatures, and duplicate submissions. Login tests check session handling and failure responses, including the Android origin. Android submission tests cover selected meters, previous readings, account signatures, conflicting entries, and permissions. QR tests generate a real image and decode it to verify the fleet code. They do not write to the production database.

## Field testing before GMAIS integration

Apply `supabase/test-data.sql` after the other migrations. It adds four clearly named test fleets, two test dispensers and a test material in the existing fuel-control database. No GMAIS data is changed, and no fake refueling history or accounts are created. Use an existing app account. The seed refuses to overwrite an existing real code and can be rerun without resetting readings or removing entries.

On the phone, connect once to refresh the catalog. Enter local **990001** and material **990010**.

| Fleet | Example | Initial KM | Engine hours | Elevator hours | Test tank capacity |
| --- | --- | --- | --- | --- | --- |
| 990101 | Pickup | 45,000 | — | — | 70 L |
| 990102 | Truck | 180,000 | 8,500 | — | 900 L |
| 990103 | Tractor | — | 3,200 | — | 300 L |
| 990104 | Harvester | — | 5,600 | 4,200 | 600 L |

These capacities are fictional test values. Local **990001** starts at **10,000**; destination **990002** starts at **20,000**. Use the fleet QR labels generated in **Frotas** or enter the fleet code manually.

Suggested first test: select fleet 990101 in QR/dispenser mode, enter KM 45020 and dispenser final 10050. The app should calculate 50 L. Then try a lower KM and a quantity over 70 L to check the lower-meter block and the nonblocking capacity warning. Subsequent tests must use the latest readings, which advance normally. With the optional trial-counter migration below, manual liters advance simulated counters. Physical counters still require a verified reading after manual entries.

Test airplane mode after refreshing the catalog: save a refueling and an occurrence with a photo, close and reopen the app, then restore connectivity and check receipt in the dashboard. Test transfer by closing the source dispenser and moving to local 990002.

All current data is used for field trials. The dashboard includes all entries in totals, charts, averages and exports, without a separate test toggle. Internal trial flags remain in the database and history exports include a TESTE column. A test fleet cannot write to a real local, and transfers cannot mix real and test locals. Keep test codes out of any future GMAIS import/export.

### Simulated readings on the existing catalog

Optionally apply `supabase/simulated-readings.sql` after `test-data.sql`. It keeps every fleet name and code and fills only meter baselines whose existing catalog value and recorded maximum are zero. Positive existing readings are preserved. Generated KM, engine hours and elevator hours are deterministic, recorded in each fleet's `simulatedFields` metadata. Rerunning does not reset them. No fake refueling records are inserted and no GMAIS database is changed.

Use local 990001 or 990002 and material 990010 to test any catalog fleet with its current name. Entries at these test locals are stamped TESTE by the server, including those for normally named fleets, and are included in dashboard totals. The fleet's configured required meters still apply. Simulated baselines and test records must be reviewed and replaced or isolated with verified readings before connecting a live GMAIS integration; they are not genuine machine measurements.

Elevator readings are available only for machine categories (Trator and Colhedora), when enabled for that fleet. Cars, pickups, buses and trucks do not show or request elevator readings. Apply `supabase/vehicle-meters.sql` after the trial migrations to enforce this rule for existing fleets, imports and type changes. Previous records remain intact.

Trial and simulated-reading badges are hidden in the interface. Internal trial flags and provenance remain available for dashboard separation and future migration.

### Initial dispenser readings for field trials

Apply `supabase/trial-recorder-readings.sql` once after `vehicle-meters.sql`. It fills missing local/material readings, preserving existing readings and reusing the last verified value when available. Other missing baselines receive a random value between 10,000 and 49,999. These baselines are stored in the control database, not GMAIS.

Simulated counters advance with manual liters and pending entries on the phone. Retries do not advance a counter twice. Saving a physical reading in settings ends simulation for that local/material. Refresh the app online before going offline. Replace generated baselines with verified readings before live use.

Android numeric fields use normal number entry: `100` means 100, while `100,50` means 100.50. Thousands separators appear automatically; leaving the field displays two decimal places. The Android decimal point key is accepted as a decimal comma.

The Android header shows the company logo, connection status, an observation warning icon and sign-out. Observation is available after choosing a local/material, including from the main menu. Send text, a photo, or both; photo-only entries use the caption FOTO ANEXADA. Pending observations keep the original operator, capture time and photo offline until confirmed.

The Android menu has a white toolbar, a local/material context box and large rounded action buttons centered in the available screen area. Location changes use the transfer flow; there is no separate change-local button.

## Icon credits

- [Fuel icon by Smashicons — Flaticon](https://www.flaticon.com/br/icone-gratis/combustivel_1506329).
- [Transfer icon by Magnific — Flaticon](https://www.flaticon.com/br/icone-gratis/troca_1372789).

These icons are distributed under the Flaticon free license with attribution. The original PNG files are bundled in the APK, so the menu icons work offline. Credits are also included on the APK release page.

The app uses yellow action buttons, responsive text sizes, a scrolling form area and a bounded content width on tablets. The login logo is displayed at 70% of its previous width.

The login password eye toggles visibility without changing letter case. Once chosen, local and material stay fixed across app restarts until explicit sign-out and a new login. A transfer records its destination without changing the current session selection. Reauthentication after an expired session preserves the existing selection and pending records.

Apply `supabase/android-only.sql` after `trial-recorder-readings.sql` to disable the old web submission endpoints. Android operation and device synchronization endpoints stay available; historical records are preserved.

Submission failures now show their cause separately from connectivity: expired session, permission, server response or network failure. Pending entries are preserved. A native background setup failure does not stop delivery with the app open. Photo uploads have a longer timeout for slower connections.

Managers can exclude an incorrect refueling, transfer or occurrence from its details, entering a reason. Excluded entries disappear from lists, totals and fleet meter baselines. Use **Excluded** to restore them. The server keeps an audit of each action and retains occurrence photos. Excluding an entry does not undo physical fuel delivery or rewind the local recorder; correct that meter in Settings when necessary.

Fuel volume above a fleet's tank capacity shows an advisory warning and can still be submitted, online or offline. Manufacturer references and unresolved model variants are documented in [tank capacities](docs/tank-capacities.md). Review the actual vehicle's tank configuration in Fleets. Apply `supabase/record-controls.sql` after `android-only.sql`, then `supabase/tank-references.sql`.

## Checklists

After login the Android menu has Refueling, Transfer and Checklist. Refueling and Transfer request local/material on first use; the selection remains fixed until sign-out. Checklist lets the operator scan the fleet QR code generated by the administration or enter the fleet code, without requiring local/material. Both options open the same fleet questions and work with the cached catalog offline. Questions cached during a connected session remain usable offline. Every question requires Perfect, Attention or Critical. A completed checklist stores capture date/time and the authenticated operator, stays in the phone queue, and synchronizes automatically when connected.

In **Configurações → Aplicativo Android**, managers can enable or disable Checklist on all phones. The setting is stored with the operation rules and received on the next connected sync; offline phones keep their last received setting. Disabling hides the menu option and prevents new checklists after the setting arrives, while retaining drafts, history and pending submissions (including correction and delivery). Existing installations need an app version that supports this setting.

In **Checklist → Configurar perguntas**, choose a fleet, add/edit/remove questions and save. Copying questions from another fleet/model appends independent questions that can be adapted for the destination fleet. There is no fixed question-count limit; individual questions allow 500 characters and each configuration has a 500 KB payload limit. Connect the app to receive changes. Immutable revisions preserve submitted checklists and offline captures based on previous questions.

**Checklists recebidos** filters by fleet, operator, capture dates and result. Attention/Critical buttons list records with unresolved items. New checklists appear in the notification bell; unresolved items also appear in the overview. Open the responses to register a replacement/service with a description and mark an item resolved. The original response stays in history, with the manager and resolution timestamp. **Baixar PDF** downloads a report containing fleet, operator, capture and reception timestamps, every question/response and recorded services.

Apply `supabase/checklists.sql` after `tank-references.sql`. Only managers edit questions, review records or resolve issues. Operators submit checklists; the server verifies all answers and derives the operator, original question wording and overall severity. Retries keep the same ID to prevent duplicates.

Checklist icon: [Check by Paul J. — Flaticon](https://www.flaticon.com/free-icon/check_10647890).

## Development map

Graphify provides a local code and SQL map. See [development workflow](docs/development.md) for setup, queries, automatic updates and downloadable GitHub snapshots. Material changes are recorded in [change log](docs/changes.md).

## User access

In **Configurações → Equipe e acessos → Permissões**, an administrator chooses the account profile (Operator or Administrator) and independently enables Refueling, Transfer and Checklist. New accounts have the same choices. Existing accounts keep all three functions until edited. Administrator controls access to the web administration; Android shows only the functions enabled for that login. The global Checklist setting must also be enabled.

Apply `supabase/user-access.sql` after `checklists.sql`. Current permissions are checked by the server for foreground and native background submissions, including legacy refueling RPCs. A user cannot grant their own permissions or remove their own administrator profile. Changes are audited.

Phones receive access changes at login or connected synchronization. Offline phones keep their cached permissions, so revocation cannot immediately hide an offline menu. The server rejects new unauthorized records when the phone reconnects. Pending records and drafts are retained; restoring access allows them to be sent. Already received records still return duplicate receipts after revocation so lost acknowledgments do not leave false pending entries. Permission failures remain separate from connection failures. Update the Android app to receive the filtered menu.
