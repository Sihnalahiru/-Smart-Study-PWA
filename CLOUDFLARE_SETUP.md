# Cloudflare Worker setup

The app is served by the Worker configured in `wrangler.jsonc`. The administrator reset password is intentionally **not stored in Git** or in the browser bundle.

## Configure the administrator reset secret

In the Cloudflare dashboard:

1. Open **Workers & Pages**.
2. Select the `smart-study-pwa` Worker.
3. Open **Settings → Variables and Secrets**.
4. Add a secret named `ADMIN_RESET_PASSWORD`.
5. Enter the administrator password privately and save it.

Alternatively, from the repository root after authenticating Wrangler:

```bash
npx wrangler secret put ADMIN_RESET_PASSWORD
```

Wrangler prompts for the secret value. Do not put the password in a source file, commit, command-line argument, or screenshot.

## Deploy

Build and deploy from the repository root:

```bash
npm install
npm run build
npx wrangler deploy
```

The Settings page calls `POST /api/admin/verify-reset`. The Worker checks the username and the secret server-side. The reset only clears the signed-in profile's local study progress and dashboard statistics; source study modules and PDFs remain untouched.


## Automatic deployment from GitHub Actions

The repository includes `.github/workflows/deploy-cloudflare.yml`. To enable automatic Cloudflare deployment when this feature branch is updated, add these three **GitHub Actions repository secrets**:

1. `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with permission to deploy Workers and manage Worker secrets for this account.
2. `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.
3. `ADMIN_RESET_PASSWORD` — the administrator reset password. Add it as a secret only; never commit it.

Add them under **GitHub repository → Settings → Secrets and variables → Actions → New repository secret**. The workflow builds the app, configures the Worker secret, and deploys `wrangler.jsonc`.

The workflow is prepared in the feature branch, but it cannot deploy until all three secrets have been added by a repository administrator.
