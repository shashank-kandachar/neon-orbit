# Neon Orbit — Key-first Clean Wizard v3

This is a safer, cleaner replacement for the previous wizard package.

## Why this version exists

The earlier wizard could look broken if `index.html`, `styles/app.css` and `src/main.js` were not all updated together, or if Safari/GitHub Pages cached old assets. This version uses simpler CSS, cache-busted file links, and a single focused wizard card.

## Replace these files together

When updating GitHub, replace the whole repo contents with this package, or at minimum replace these files together:

- `index.html`
- `styles/app.css`
- `src/main.js`
- `README.md`

Keep the existing `data/` folder, `src/config.js`, `src/data-loader.js`, `src/engine.js`, `src/export-utils.js` and `src/storage.js`.

## Run locally

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages URL

```text
https://shashank-kandachar.github.io/neon-orbit/
```

## Important

After pushing to GitHub, hard refresh Safari or add `?v=2` to the URL once:

```text
https://shashank-kandachar.github.io/neon-orbit/?v=2
```


## v3 change

The pitch screen now follows the requested reference-style flow:

1. Choose the tonic/root note.
2. Choose the scale, mode or raga.
3. The app displays the combined key world, for example `D Dorian` or `A Bhairavi`.

The rest of the wizard remains clean and step-by-step.


## Codex handoff

This master package includes:

- `AGENTS.md` — repository-level guidance for Codex
- `CODEX_HANDOFF_PROMPT.md` — paste this into Codex for the first task
- `GITHUB_CODEX_SETUP.md` — GitHub and Codex setup instructions
