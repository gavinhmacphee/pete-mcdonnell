# Pete McDonnell Site — How It Works

Static HTML site, content edited via **Sveltia CMS** at `/admin/`. Markdown lives in `content/writing/`. A small Node build script turns markdown into HTML at deploy time.

```
content/writing/*.md       ← source of truth (Sveltia writes here)
templates/article.html     ← per-article template
scripts/build.js           ← reads markdown, writes /writing/<slug>.html and updates index.html
admin/index.html           ← Sveltia CMS loader
admin/config.yml           ← Sveltia collection config
api/auth.js + callback.js  ← GitHub OAuth (Vercel functions)
```

## Daily use (after setup)

1. Go to **https://pete-mcdonnell.vercel.app/admin/**
2. Click **Login with GitHub**, authorize once
3. Click **New Article**, fill in title / slug / order / status / date / deck / body
4. Save → Publish
5. GitHub gets a commit, Vercel rebuilds, the article is live in ~60 seconds

## One-time setup

### 1. GitHub OAuth App
- Go to https://github.com/settings/developers
- **New OAuth App**
  - Application name: `pete-mcdonnell-cms`
  - Homepage URL: `https://pete-mcdonnell.vercel.app`
  - Authorization callback URL: `https://pete-mcdonnell.vercel.app/api/callback`
- Click **Register application**
- Copy the **Client ID**
- Click **Generate a new client secret**, copy the secret

### 2. Vercel env vars
Project settings → Environment Variables, add for **Production** (and Preview if you like):
- `OAUTH_GITHUB_CLIENT_ID` — from step 1
- `OAUTH_GITHUB_CLIENT_SECRET` — from step 1

Redeploy after adding the env vars.

### 3. GitHub repo + Vercel git integration
The repo lives at https://github.com/gavinhmacphee/pete-mcdonnell. The Vercel project must be connected to that repo so commits trigger deploys (Sveltia commits via the GitHub API, so this is non-optional). In the Vercel dashboard:
- Project → Settings → **Git** → Connect to `gavinhmacphee/pete-mcdonnell` (branch `main`)

## Adding a new post by hand (without Sveltia)
Drop a file in `content/writing/`:

```markdown
---
title: My new article
slug: my-new-article
order: 2
status: live          # or "coming-soon"
date: 2026-06-01
date_label: June 2026
deck: One-sentence summary shown under the headline.
read_time: 5 min read
---

Body in markdown. Use `### Subheads`, `**bold**`, blockquotes (`>`), etc.
```

Commit, push — Vercel rebuilds.

## Local preview
```
npm install
npm run build
```
Open `index.html` in a browser. (No dev server needed; everything is static.)
