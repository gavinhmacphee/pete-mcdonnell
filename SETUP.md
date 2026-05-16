# Peter McDonnell Site — How It Works

Static HTML site with a custom password-protected admin at `/admin`. Content
lives in markdown + JSON files in `/content/`. A Node build script generates
the public HTML from those sources at deploy time. The admin commits changes
to GitHub via REST; GitHub triggers Vercel, which rebuilds the site.

```
content/writing/*.md     ← articles (one file per post)
content/site.json        ← about, qualifications, achievements
templates/article.html   ← per-article HTML template
scripts/build.js         ← reads content, injects into index.html, writes /writing/<slug>.html
admin/                   ← /admin login, dashboard, article editor, site editor
api/                     ← login/logout/me/articles/site endpoints (Vercel functions)
lib/                     ← session + GitHub helpers shared by api routes
```

## Daily use

1. Go to **https://petermcdonnell.com/admin/**
2. Sign in (single shared password — see Vercel env var `ADMIN_PASSWORD`)
3. **Writing** section: create new articles, edit/delete existing ones
4. **Site content** section: edit the About paragraphs, Qualifications list, Achievements list
5. Hit Save — commits to GitHub, Vercel rebuilds, live in ~60 seconds

## Vercel env vars

Set in Project → Settings → Environment Variables:

- `ADMIN_PASSWORD` — shared password for the admin
- `SESSION_SECRET` — random 32-char hex, used to sign session cookies
- `GITHUB_TOKEN` — token with `repo` scope on `gavinhmacphee/pete-mcdonnell` (currently sourced from `gh auth token`)
- `GITHUB_REPO` — `gavinhmacphee/pete-mcdonnell`
- `GITHUB_BRANCH` — `main`

## Adding a post by hand (skip the admin)

Drop a file in `content/writing/` named `NN-slug.md`:

```markdown
---
title: My article title
slug: my-article-title
order: 2
status: live
date: 2026-06-01
date_label: June 2026
deck: One-sentence summary shown under the headline.
read_time: 5 min read
---

Body in markdown.
```

Commit, push — Vercel rebuilds.

## Local preview

```
npm install
npm run build
```

Open `index.html` in a browser.
