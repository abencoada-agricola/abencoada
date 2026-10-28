# Setup and deployment

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

The Android app bundles the interface in the APK and uses the native camera scanner. The web administration opens directly at the site root. The former admin.html address redirects to that root.


## Remaining database migrations

After `occurrence-photos.sql`, apply the following files in order from `supabase/`:

```text
test-data.sql
simulated-readings.sql
vehicle-meters.sql
trial-recorder-readings.sql
android-only.sql
record-controls.sql
tank-references.sql
checklists.sql
user-access.sql
member-removal.sql
operation-fleets.sql
```

The trial migrations create sample data and meter readings for field testing. Replace those values with verified readings before production use. GMAIS integration is not active.
