# Release Guide

Step-by-step checklist for cutting a new `fhir-kit-client` release.

---

## Prerequisites

- Write access to the `Vermonster/fhir-kit-client` GitHub repository
- `NPM_TOKEN` secret configured in the repo (Settings → Secrets → Actions)
  - Generate at https://www.npmjs.com/settings/~/tokens (type: **Automation**)
- GitHub Pages enabled (Settings → Pages → Source: **Deploy from a branch**, branch: `gh-pages`, folder: `/`)

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

### 4. Create a GitHub Release

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

### 5. Automated publishing (CI handles this)

Publishing the GitHub Release triggers **two** automated workflows:

| Workflow | File | What it does |
|---|---|---|
| `Publish to npm` | `.github/workflows/publish.yml` | Runs tests → build → `npm publish --provenance` |
| `Deploy Docs` | `.github/workflows/docs.yml` | Builds TypeDoc → deploys to `gh-pages` branch |

Monitor progress at https://github.com/Vermonster/fhir-kit-client/actions.

> **Note:** The Docs workflow triggers on push to `main`. The npm publish workflow triggers on GitHub Release publication.

### 6. Verify

- **npm**: https://www.npmjs.com/package/fhir-kit-client — confirm the new version is listed
- **Docs**: https://vermonster.github.io/fhir-kit-client/ — confirm the docs reflect the new version
- **GitHub Release**: https://github.com/Vermonster/fhir-kit-client/releases — confirm release notes look correct

---

## Manual npm publish (fallback)

If the CI publish fails, or for the first release before the `NPM_TOKEN` secret is configured:

```bash
npm login          # opens a browser to authenticate with npmjs.com
npm run build      # compile TypeScript → dist/
npm test           # verify nothing broke
npm publish --access public
```

> Add `--provenance` if publishing from a GitHub Actions environment with `id-token: write` permission.

---

## First-time setup: NPM_TOKEN secret

1. Log in to https://npmjs.com as the `vermonster` org account
2. Go to **Access Tokens** → **Generate New Token** → type **Automation**
3. Copy the token
4. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `NPM_TOKEN`
   - Value: the token you copied
5. Save

---

## First-time setup: GitHub Pages

1. In the GitHub repo: **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `gh-pages`, folder: `/`
4. Click **Save**

The `gh-pages` branch is created automatically by the `Deploy Docs` workflow on the first push to `main`.
