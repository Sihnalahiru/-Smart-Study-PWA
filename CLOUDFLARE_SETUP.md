# Cloudflare Worker setup

The app is served by the Worker configured in `wrangler.jsonc`. Keep the administrator reset password out of Git and out of the browser bundle.

## Cloudflare build configuration

In **Workers & Pages → smart-study-pwa → Settings → Builds & deployments**, use:

- **Root directory:** `/` (repository root)
- **Build command:** `bun run build`
- **Deploy command:** `bunx wrangler deploy`
- **Build output directory:** `dist` (only if the dashboard requires an output directory)

Use **Bun 1.4.4** for dependency installation, matching the repository's GitHub Actions build. The install command must be:

```bash
bun install --frozen-lockfile
```

Do not use `npm install` or `npm ci` for this repository's locked Bun dependency graph.

### If Cloudflare reports a frozen-lockfile mismatch

1. Confirm the build is running from the repository root and the `main` branch.
2. Confirm the checked-out commit contains both `package.json` and `bun.lock` from the same commit.
3. In the Cloudflare build settings, clear the build cache and retry once.
4. If the same mismatch remains, capture the exact commit SHA and the full dependency-install log. Do not manually edit `bun.lock` or add an `esbuild` dependency unless the checked-out `package.json` actually declares it.

The repository's GitHub Pages workflow has already passed with Bun 1.4.4 and `bun install --frozen-lockfile`. That validates the committed lockfile in GitHub Actions, but does not by itself prove Cloudflare's separate build cache or Worker deployment is healthy.

## Configure the administrator reset secret

In the Cloudflare dashboard:

1. Open **Workers & Pages**.
2. Select the `smart-study-pwa` Worker.
3. Open **Settings → Variables and Secrets**.
4. Add a secret named `ADMIN_RESET_PASSWORD`.
5. Enter the administrator password privately and save it.

Alternatively, from the repository root after authenticating Wrangler:

```bash
bunx wrangler secret put ADMIN_RESET_PASSWORD
```

Wrangler prompts for the secret value. Do not put the password in a source file, commit, command-line argument, or screenshot.

## Deploy manually

From the repository root with Bun 1.4.4 and Wrangler authenticated:

```bash
bun install --frozen-lockfile
bun run build
bunx wrangler deploy
```

The Settings page calls `POST /api/admin/verify-reset`. The Worker checks the username and secret server-side. The reset only clears the signed-in profile's local study progress and dashboard statistics; source study modules and PDFs remain untouched.
