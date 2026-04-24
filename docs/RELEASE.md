# Release process

conductor-kit publishes four packages to npm:

- `@conductor-kit/assets`
- `@conductor-kit/core`
- `@conductor-kit/cli`
- `@conductor-kit/install`

The adapter packages (`@conductor-kit/agent-claude`, `agent-codex`, `agent-cursor`)
are intentionally unpublished — their files ship through
`@conductor-kit/install` instead.

## The happy path (Changesets + GitHub Actions)

1. Merge feature PRs. Each should land a `.changeset/*.md` entry describing
   the user-facing change.
2. In Actions, run the **Release** workflow manually (`workflow_dispatch`).
3. The workflow opens (or updates) a `chore: release packages` PR with
   version bumps + CHANGELOG updates.
4. Merge that PR → re-run the **Release** workflow → packages publish.

## Auth options for the publish step

The publish step in `.github/workflows/release.yml` historically used a
classic `NPM_TOKEN`. In this project that path is fragile because the
maintainer's npm account uses a WebAuthn-only 2FA configuration:

- **Classic Publish tokens** require a TOTP to write, which CI cannot
  provide.
- **Classic Automation tokens** are documented to bypass 2FA, but in
  practice returned `E404` on first scope publish. The 404 npm returns is
  an obfuscated 403 — the token authenticated but lacked publish rights
  for this scope at the time.
- **Granular access tokens** with "All packages → Read & Write" + the
  `conductor-kit` org "Read & Write" also returned the same `E404`.
- **User session tokens** (from `npm login` via WebAuthn) hit `EOTP` because
  npm still demands 2FA re-challenge on write operations, which CLI can't
  satisfy against a WebAuthn-only account.

The one path that succeeded for v0.1.0 was **manual publish** from the
maintainer's laptop — `npm publish` opens a browser, the maintainer taps
their security key, and npm completes the write. That's fine for a solo
project but doesn't scale.

### Recommended for v0.1.x+: trusted publisher (OIDC)

npm supports OIDC-based "trusted publishers" that replace `NPM_TOKEN`
entirely. Each package is linked to a specific GitHub repository +
workflow, and npm accepts the short-lived GitHub OIDC token as proof of
identity. No 2FA challenge fires because there's no long-lived credential
to authenticate.

**One-time setup per package** (four packages = four setups):

1. Sign in to npmjs.com with the publisher account.
2. Go to `https://www.npmjs.com/package/<pkg>/access` (for each of
   `@conductor-kit/assets`, `/core`, `/cli`, `/install`).
3. Under **Trusted Publishers**, add:
   - Publisher: `GitHub Actions`
   - Organization or user: `chanshin0`
   - Repository: `conductor-kit`
   - Workflow filename: `release.yml`
   - Environment (optional): leave blank
4. Save.

The workflow already has `permissions.id-token: write` and
`NPM_CONFIG_PROVENANCE=true` in `.github/workflows/release.yml`, so once
the npm side is configured, the next `workflow_dispatch` run should
publish cleanly without consulting `NPM_TOKEN` at all. You can safely
delete the `NPM_TOKEN` repo secret afterward.

As a bonus, publishes tied to a trusted publisher appear on npm with a
signed provenance attestation — consumers can verify the package came
from this repo + workflow run.

### Fallback: per-package 2FA for publish

If trusted publisher setup isn't an option, the per-package `Require
two-factor authentication` flag can be toggled off:

1. `https://www.npmjs.com/package/<pkg>/access` → **Two-factor
   authentication** → set to **Don't require**.
2. Rotate `NPM_TOKEN` to a fresh **Classic Automation token**.
3. Re-run the Release workflow.

This lowers the security bar on publishes — only use it if trusted
publisher doesn't suit your flow.

## Manual fallback (emergency)

If CI is blocked entirely, the maintainer can publish from their laptop
with their WebAuthn-authenticated session:

```bash
cd ~/Desktop/my-pjt/conductor-kit
git pull --ff-only origin main

# Publish in dependency order. Each command opens a browser tab on the
# first publish of the session; subsequent ones reuse the session.
pnpm --filter @conductor-kit/assets  publish --access public --no-git-checks
pnpm --filter @conductor-kit/core    publish --access public --no-git-checks
pnpm --filter @conductor-kit/cli     publish --access public --no-git-checks
pnpm --filter @conductor-kit/install publish --access public --no-git-checks
```

Don't use this for routine releases — it bypasses the changeset +
PR-review audit trail and skips the CI test gate.
