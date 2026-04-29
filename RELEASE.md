# Release Guide

Step-by-step checklist for cutting a new `fhir-kit-client` release.

> **npm publishing is always manual.** There is no automated publish workflow.

---

## Prerequisites

- Write access to the `Vermonster/fhir-kit-client` GitHub repository
- npm account with publish rights to the `fhir-kit-client` package
- GitHub Pages configured (Settings → Pages → Source: **GitHub Actions**)

---

## Release Steps

### 1. Merge all changes to `main`

Ensure all PRs are merged and CI is green on `main`.

### 2. Update `CHANGELOG.md`

Add a new entry at the top for the version you're about to release:

```md
### X.Y.Z

- Summary of changes
```

Commit directly to `main` (or via a PR):

```bash
git checkout main && git pull
# edit CHANGELOG.md
git add CHANGELOG.md
git commit -m "chore: update CHANGELOG for vX.Y.Z"
git push
```

### 3. Bump the version

Use `npm version` — it updates `package.json`, creates a git commit, and tags it:

```bash
# choose one:
npm version patch   # 2.0.0 → 2.0.1  (bug fixes)
npm version minor   # 2.0.0 → 2.1.0  (new features, non-breaking)
npm version major   # 2.0.0 → 3.0.0  (breaking changes)

# or set an explicit version:
npm version 2.1.0
```

Push the commit **and** the tag:

```bash
git push && git push --tags
```

### 4. Publish to npm

```bash
npm login          # opens a browser to authenticate with npmjs.com
npm run build      # compile TypeScript → dist/
npm test           # verify nothing broke
npm publish --access public
```

### 5. Create a GitHub Release

```bash
gh release create vX.Y.Z \
  --title "vX.Y.Z" \
  --notes-file <(sed -n '/^### X.Y.Z/,/^### /p' CHANGELOG.md | head -n -1)
```

Or via the GitHub UI:

1. Go to https://github.com/Vermonster/fhir-kit-client/releases/new
2. Select the tag you just pushed (`vX.Y.Z`)
3. Set the title to `vX.Y.Z`
4. Paste the relevant CHANGELOG section as the release notes
5. Click **Publish release**

### 6. Verify

- **npm**: https://www.npmjs.com/package/fhir-kit-client — confirm the new version is listed
- **Docs**: https://vermonster.github.io/fhir-kit-client/ — docs deploy automatically when `main` is updated
- **GitHub Release**: https://github.com/Vermonster/fhir-kit-client/releases — confirm release notes look correct

---

## First-time setup: GitHub Pages

1. In the GitHub repo: **Settings → Pages**
2. Source: **GitHub Actions** *(not "Deploy from a branch")*
3. No further configuration needed — the `Deploy Docs` workflow deploys on every push to `main`

> **Important:** Do NOT use "Deploy from a branch" → `/docs`. The TypeDoc output is built by CI and served directly via the official `actions/deploy-pages` action. Setting the source to "GitHub Actions" prevents GitHub from running its own Jekyll pipeline on the repository.

