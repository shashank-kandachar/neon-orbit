# Codex Handoff Prompt — Neon Orbit Composition Guide

You are continuing the Neon Orbit Composition Guide app.

## Project identity

Neon Orbit is a guitar-connected psychedelic live-electronic project with Ableton at the centre. The app must help compose original psychedelic live-electronic music using electric guitar, Ableton, Arturia MicroFreak, Boss SL-2, Hotone Ampero II Stomp, field recordings, Indian rhythmic/melodic influence, global music awareness, ambient/downtempo/psytrance/experimental energy, and live-performance thinking.

Do not turn this into a generic songwriting app, generic EDM prompt picker, or random prompt dump.
/Users/admin/Documents/GitHub/neon-orbit/README.md
## Current repo state

This repo currently contains the key-first clean wizard v3 static web app.

Important files:

- `index.html`
- `styles/app.css`
- `src/main.js`
- `src/config.js`
- `src/engine.js`
- `src/data-loader.js`
- `src/storage.js`
- `src/export-utils.js`
- `data/manifest.json`
- `data/ideas.compact.json`
- `data/source-ledger.json`
- `data/raga-cards.json`
- `data/seed-panels.json`

The app is local-first and should remain GitHub Pages-friendly unless explicitly changed.

## Source-of-truth data

The data comes from the audited master archive:

- Books: 72
- Ideas: 64,355
- Final authority: `Neon_Orbit_Master_All_Books_01_72_AUDITED_COMPLETE.zip`
- This repo uses compact app data generated from that authority.

Critical requirements:

- Do not lose ideas.
- Do not remove source/book/domain metadata.
- Do not flatten all ideas into one generic list.
- Do not deduplicate similar ideas unless they are exact structural duplicates and the raw/source mapping is preserved.
- Preserve source traceability.
- Prefer the audited master data over any older handoff/reference package.
- Use UK English in UI copy.

## Current desired UX

The user wants a clean, non-cluttered, step-by-step wizard.

The pitch/key screen must follow this flow:

1. Choose tonic/root note first.
2. Then choose scale/mode/raga.
3. Show a combined key world such as:
   - `D Dorian`
   - `A Bhairavi`
   - `C♯ / D♭ Lydian dominant`

The app should avoid overwhelming the user. Show a small number of useful prompts at a time, ideally three prompt choices per build step.

## Immediate task for Codex

1. Inspect the repo structure.
2. Run the app locally.
3. Verify that `index.html`, `styles/app.css`, and `src/main.js` are all from the same version.
4. Confirm the key-first selector works:
   - note buttons update the selected key root
   - scale/mode dropdown updates the pitch world
   - raga dropdown is optional
   - section summary shows the combined key world
   - export includes the selected key root and scale/raga
5. Fix any runtime errors or broken styling.
6. Improve iPhone Safari compatibility without making the desktop view cluttered.
7. Keep the app local-first and GitHub Pages compatible.
8. Keep the source trace, save/export and prompt-engine functions working.
9. Report exactly what changed.

## Guardrails

- Do not introduce a framework unless it clearly solves a real problem.
- Do not rewrite the whole app unless necessary.
- Do not delete `data/ideas.compact.json`.
- Do not make the first screen a dashboard.
- Do not show the entire idea pool by default.
- Do not remove raga behaviour guardrails.
- Do not remove gear-specific pathways.
- Keep the app joyful, musical, practical and fast to use.

## Suggested verification

Run:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000
```

Then test:

1. Start → Pitch screen.
2. Choose `D`.
3. Choose `Dorian`.
4. Confirm the UI shows `D Dorian`.
5. Choose a raga.
6. Confirm the UI switches to `D <Raga Name>` and shows raga behaviour text.
7. Continue to build prompts.
8. Load idea pool.
9. Choose prompts.
10. Save and export Markdown/JSON.
11. Test on iPhone Safari or responsive mobile width.
