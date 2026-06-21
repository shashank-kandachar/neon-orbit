# How to link this project to GitHub and Codex

Repo target:

```text
https://github.com/shashank-kandachar/neon-orbit
```

GitHub Pages target:

```text
https://shashank-kandachar.github.io/neon-orbit/
```

## 1. Put this package into GitHub

Unzip this master package.

The repo root should contain:

```text
index.html
src/
styles/
data/
README.md
AGENTS.md
CODEX_HANDOFF_PROMPT.md
GITHUB_CODEX_SETUP.md
start-local.sh
```

It should not be nested inside another folder.

From Terminal:

```bash
cd /path/to/neon-orbit

git init
git branch -M main
git add .
git commit -m "Add Neon Orbit key-first wizard"
git remote add origin https://github.com/shashank-kandachar/neon-orbit.git
git push -u origin main
```

If the remote already exists:

```bash
git remote set-url origin https://github.com/shashank-kandachar/neon-orbit.git
git push -u origin main
```

## 2. Enable GitHub Pages

In GitHub:

```text
Repository → Settings → Pages
```

Set:

```text
Source: Deploy from a branch
Branch: main
Folder: / root
```

Then open:

```text
https://shashank-kandachar.github.io/neon-orbit/?v=3
```

The `?v=3` helps bypass cached files after updating.

## 3. Connect GitHub to ChatGPT / Codex

Open ChatGPT settings and connect GitHub:

```text
Settings → Apps → GitHub
```

Install/authorise the GitHub app, then allow access to:

```text
shashank-kandachar/neon-orbit
```

If the repo does not appear immediately, wait a few minutes and check repository access settings again.

## 4. Open Codex web

Go to:

```text
https://chatgpt.com/codex
```

Connect GitHub if prompted.

Create or select an environment for:

```text
shashank-kandachar/neon-orbit
```

Then start a task and paste the contents of:

```text
CODEX_HANDOFF_PROMPT.md
```

## 5. Recommended first Codex instruction

Paste this:

```text
Read AGENTS.md and CODEX_HANDOFF_PROMPT.md first.

Then inspect the app, run it locally, and fix any runtime or styling errors without changing the knowledge data model. Confirm the key-first pitch selector works on desktop and mobile. Keep the app local-first and GitHub Pages compatible.
```

## 6. Good workflow

Ask Codex to make small pull requests.

Recommended first PR:

```text
Stabilise key-first wizard v3
```

Do not ask for a huge redesign until the current app is stable.
