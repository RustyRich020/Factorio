# Factorio → Microsoft To Do Sync (Codespaces-ready)

This repo syncs Factorio task change events to **Microsoft To Do** using **device code auth** + file-backed token cache. It also has an optional **RCON round-trip** test to push a task *into* Factorio.

## What you get

- `sync.mjs`:
  - **Device Code** login (MSAL), **file cache** at `.cache/msal_cache.json`
  - Resolves due tokens like `+1d`, `+3d`, `+2w`, `+1m`, `+1y` into actual ISO dates in your TZ
  - Reads `script-output/todo/changes.jsonl`
  - Creates / updates / completes tasks in **Microsoft To Do** via Graph API
  - Optional **RCON** integration: send `/todo add "<title>" ##meta={...}` to Factorio
- `package.json` with scripts for common actions
- `test/sample_changes.jsonl` to dry-run without Factorio
- `sync.tmpl` contains the raw `<SYNC_CONTENT>...</SYNC_CONTENT>` fragment. `sync.mjs` now reads this template and exports it as `syncContent` (named export), provides a default export for compatibility, and an async loader `loadSyncContent()` for consumers that prefer async I/O.
- A lightweight test script was added: run `npm test` to execute `test/sync.test.mjs`, which validates the template export.

---

## 0) GitHub Codespaces: create & open

1. Push these files to a new GitHub repo (or upload the provided zip and commit).
2. Click **Code → Create codespace on main**.
3. Terminal opens inside Codespaces.

> You can also run locally with Node 20+.

---

## 1) Configure the Microsoft Entra app

Create a **Public client** app (no secret needed):

- **Platform:** "Mobile and desktop applications"
- **Redirect URIs:** Add `https://login.microsoftonline.com/common/oauth2/nativeclient`
- **API permissions:** Microsoft Graph → **Tasks.ReadWrite**, **offline_access**, **openid**, **profile**

Grab the **Application (client) ID** and your **Tenant ID** (or use `consumers`/`common` if this is a Microsoft account).

---

## 2) Set environment variables

Copy `.env.example` to `.env` and fill in:

```env
CLIENT_ID=your_client_id_here
TENANT_ID=consumers
SCOPES=Tasks.ReadWrite offline_access openid profile
TODO_TZ=America/New_York
TOKEN_CACHE_FILE=.cache/msal_cache.json
```

Optional Factorio / RCON settings (edit later as needed).

---

## 3) Install & auth

```bash
npm install
npm run auth
```

Follow the **device code** instructions shown in the terminal. The token will be cached in `.cache/msal_cache.json`.

---

## 4) Quick Graph sanity

```bash
npm run print-list
npm run list-tasks
```

You should see your default To Do list and some tasks, if any.

---

## 5) Test with a sample changes file (no Factorio needed)

```bash
# use the sample file as the changelog source
CHANGELOG_FILE=./test/sample_changes.jsonl npm run start
```

This will create one task using your account.

---

## 6) Point to Factorio’s live change-log

On Windows the default is:
```
%AppData%\Factorio\script-output\todo\changes.jsonl
```

If yours is different, set `CHANGELOG_FILE` in `.env`.

To **process existing lines once**:
```bash
npm run start
```

To **watch live** as the mod appends lines:
```bash
npm run watch
```

---

## 7) Optional: Round-trip via RCON

If you have Factorio headless or RCON enabled on a running instance:

```env
RCON_HOST=127.0.0.1
RCON_PORT=27015
RCON_PASSWORD=your_rcon_password
```

Then run:
```bash
npm run rcon:test
```

You should see `/todo add "Hello from Codespaces"` executed in-game.

---

## 8) Troubleshooting

- **"No To Do list found"** → open Microsoft To Do once in the browser/app.
- **Auth loop** → delete `.cache/msal_cache.json` and rerun `npm run auth`.
- **403 / insufficient privileges** → verify Graph API permissions and consent.
- **Timezone off** → set `TODO_TZ` in `.env`.
- **Nothing happens while watching** → confirm the path to `changes.jsonl` and that the mod is writing.

---

## 9) Next ideas

- Persist a mapping `localId ↔ externalId` file for faster updates.
- Add backfill: pull Graph tasks and mirror into Factorio (two-way).
- Queue/debounce to batch writes if the change-log is very chatty.

## CLI examples and dry-run mode

You can run the included CLI commands directly via the `npm` scripts. To avoid network calls (useful for testing or CI), use the `--dry-run` flag after the script name.

- Run the device-code auth flow (interactive):

```bash
npm run auth -- --dry-run   # simulate auth without contacting MSAL
npm run auth               # perform real device-code auth (requires CLIENT_ID)
```

- List tasks (will prompt for auth if needed):

```bash
npm run list-tasks -- --dry-run --list-tasks 10  # simulate listing tasks
npm run list-tasks -- --list-tasks 10           # real run
```

- RCON round-trip test (simulated):

```bash
npm run rcon:test -- --dry-run --rcon-test "Hello from Codespaces"
```

Notes:
- To pass extra flags to the script when using `npm run`, put `--` after the script name (as shown above).
- `--dry-run` prevents network calls and side-effects; the CLI will print what it would do instead.
