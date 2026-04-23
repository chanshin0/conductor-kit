# Changesets

When you make a change that should publish a new npm version, run:

```sh
pnpm changeset
```

Pick the affected packages, pick the bump type (patch / minor / major), and write a short summary. The file produced in this directory is committed with your PR. On merge to `main`, the release workflow opens a PR that aggregates pending changesets and publishes on approval.
