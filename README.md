# Abençoada Fuel Control

A diesel refueling log for agricultural fleets, with an Android app for workers and a web dashboard for managers. Both the Android app and the web field form keep pending entries on the device when there is no internet.

The website runs on GitHub Pages. Supabase stores the records and handles administrator authentication. The interface is in Portuguese. Login names and text fields use uppercase, including typed values, reports, and CSV exports. Usernames remain case-insensitive; passwords keep their exact original case.

- [Android APK](https://github.com/abencoada-agricola/diesel/releases/latest/download/abencoada-diesel.apk)
- [Field form](https://abencoada-agricola.github.io/diesel/)
- [Administration](https://abencoada-agricola.github.io/diesel/admin.html)

## Android app: Abastece

Install the APK on Android 8 or later and sign in online with the username and password assigned in **Equipe e acessos**. The app uses `icone-app.png` as its icon.

1. Enter the **local code** and **material code**. These identify the dispenser location and diesel type. Both are required. Suggestions use the catalog stored in the control database.
2. Choose **Abastecimento** or **Transferência**.
3. For refueling, choose **QR Code** or **Digitar dados do abastecimento**.
4. Scan the fleet label or enter its code, check the previous readings, and enter the current required meters before refueling.
5. With QR/dispenser mode, enter the final dispenser reading. Liters are the final reading minus the last verified reading for that local/material. Manual mode asks for liters directly.
6. Save the entry. The account supplies the worker signature; date and time are automatic.

**Transferência** shows the current local/material and last dispenser reading. Enter the source dispenser’s final reading and the new local code. The app shows the difference and the last cached reading for the destination. Equal source readings are allowed when nothing was dispensed since the last entry. The server checks the source baseline before accepting the closure. Transfers do not move inventory in GMAIS, and their closing difference is not counted again as a fleet refueling. Older APK transfer entries remain readable as events without meter readings. A compact **Observação** warning button inside refueling and transfer opens a message linked to the current local and material. Saving or returning preserves the operation draft. An occurrence can include one optional photo, taken with the camera or selected from the gallery. Images are converted to JPEG, reduced to at most 1280 pixels on the longest side and under 280,000 data-URL characters. The compressed photo is saved with the draft and offline queue, including the Android background queue, and delivered atomically with the occurrence. Managers use **Ver foto** in **Transferências e ocorrências** to load the image; photo content is not included in routine operation lists. **Alterar local** appears only on the main menu, in the upper-left toolbar, with the connection state and last refresh time centered and the outlined **Sair** button on the right.

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

## Web field form

Open the form, enter the worker's name and fleet code, fill in the readings, and tap **Enviar abastecimento**. Fleet codes can be typed or selected from the suggestions.

Each entry requires:

- Worker name
- Fleet code
- Engine hour meter
- Elevator hour meter
- Mileage (KM)
- Initial and final dispenser readings
- Liters supplied

The date and time are recorded automatically when the entry is saved. The worker's name becomes the signature. This is a declared name, not a verified identity. Earlier records submitted through an account keep their original account signature.

All readings are required. Liters must be greater than zero, and the final dispenser reading must exceed the initial reading. Mileage and both hour meters cannot fall below the highest readings already recorded for that fleet. Equal readings are allowed. Managers can also require liters to match the difference between the dispenser readings, with a tolerance of 0.02 L.

## Web offline use

Open the app with internet at least once so it can download the form and fleet catalog. Before going to the field, test reopening it in airplane mode. On Android, use Chrome's **Install app** or **Add to Home screen** option.

Drafts and pending entries are stored in the browser's IndexedDB on that device. No login is needed to reopen the field form. With the app open, synchronization runs when the connection returns, every 15 seconds, or when **Tentar enviar** is tapped.

An entry stays on the device until the database confirms receipt. Each submission has a unique ID and confirmation key to prevent duplicate records after a retry. Date, time, and worker name are preserved during synchronization.

The app checks readings against its saved catalog and local queue. The database checks them again against the latest received readings. If another device has submitted a higher reading, the conflicting entry remains on the original device for correction and resubmission.

Do not clear browser storage while entries are pending. Pending entries do not transfer to another phone. Automatic synchronization requires the app to be open; it is not guaranteed after the app is closed. Pending entries from the earlier account-based form still require the original account session to synchronize.

## Administration

Administrators sign in with a username and password. They can view and filter records by fleet, worker, date, and synchronization status, inspect readings, export CSV files, and print reports. Received records cannot be edited or deleted through the app.

The dashboard checks for new records every 15 seconds while open and shows unread notices in the bell. Optional browser notifications also require the dashboard to remain open.

**Frotas** supports searching by fleet code, name, model, or type. **Editar frota** changes the name, model, type, active status, and total tank capacity. Required Android meters are configured separately and remain unchanged when fleet details are edited. Capacities start unset; managers must enter verified vehicle capacities rather than relying on category estimates. Updating the GMAIS catalog snapshot preserves custom models and capacities. The dashboard and forms offer light/dark themes with a saved browser preference.

Both refueling forms warn immediately above the registered tank capacity, without a tolerance margin. Workers can review and explicitly confirm an unusual quantity. The server checks that confirmation against the same quantity and current capacity; accepted exceptions retain the capacity snapshot and a confirmation flag. If capacity is unknown, the app does not invent a limit. Older APK submissions exceeding a newly configured capacity remain pending until corrected/confirmed in an updated app.

The dashboard displays monthly average liters per refueling and per-fleet estimated km/L and L/h. Ratios use the sum of positive meter intervals and the associated liters, not an average of individual ratios. Only confirmed refuelings count; transfers and occurrences do not. Missing baselines, unselected meters, and zero/negative intervals do not produce a ratio. Partial fills and missing refuelings can distort consumption estimates; these are not measured full-tank consumption figures.

**Frotas** also manages the required Android meters. Use **Gerar QR Code** to download or print a fleet label, or **Imprimir todos os QR Codes** for the whole active catalog. Attach the corresponding label to each machine. The APK download is also available on this page. **Transferências e ocorrências** lists app events. **Configurações** manages local/material catalogs, verified dispenser readings, access permissions, usernames, and validation rules. Use **Definir senha** in **Equipe e acessos** to create a login or replace an existing password. Passwords require at least 6 characters and confirmation. The server checks the manager’s authenticated session and team membership before calling Supabase Auth; passwords are never stored in the team table. These passwords belong to Diesel and do not change GMAIS credentials. Usernames contain 3–30 letters without accents, numbers, dots, hyphens, or underscores; capitalization does not matter. Email login remains available for existing accounts during the transition.

Public access is limited to the fleet catalog, latest readings, validation rules, and validated submissions. Stored record history and worker names can only be retrieved by authorized accounts. Administration requires a manager account. Database tables have Row Level Security and cannot be accessed directly by public clients.

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

The Android app bundles the interface in the APK and uses the native camera scanner. The existing web form remains available as a separate option.

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

Suggested first test: select fleet 990101 in QR/dispenser mode, enter KM 45020 and dispenser final 10050. The app should calculate 50 L. Then try a lower KM and a quantity over 70 L to check the block and capacity confirmation. Subsequent tests must use the latest readings, which advance normally. A manual-liter entry still invalidates the physical dispenser baseline; a manager can verify the test local again in settings.

Test airplane mode after refreshing the catalog: save a refueling and an occurrence with a photo, close and reopen the app, then restore connectivity and check receipt in the dashboard. Test transfer by closing the source dispenser and moving to local 990002.

Test entries are stamped on the server, labeled in history and operations, and excluded from the default dashboard totals, chart, averages and dashboard export. Use **Ver testes** to inspect test totals separately; history exports include a TESTE column. A test fleet cannot write to a real local, and transfers cannot mix real and test locals. Keep test codes out of any future GMAIS import/export.
