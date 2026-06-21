# Neon Orbit — Composition Guide (Stage 1 skeleton)

This is a fresh local-first web app skeleton for the new Neon Orbit composition-guidance app.

## What this build includes

- Full-width psychedelic-but-practical UI
- Landing/setup workflow for:
  - scale / raga / mode / pitch world
  - tempo
  - mood
  - section type
  - energy
  - groove / rhythm feel
  - main instrument / sound source
  - gear focus
- Guided section-builder stages
- Prompt engine wired to the audited authority-derived compact idea pool
- Source trace panel
- Browse/search mode
- Controlled inspiration mode
- Local saved snapshots
- Markdown and JSON export

## Data basis

The data bundle was generated from the audited authority archive:

- `Neon_Orbit_Master_All_Books_01_72_AUDITED_COMPLETE.zip`

Included compact app data:

- `data/ideas.compact.json`
- `data/manifest.json`
- `data/source-ledger.json`
- `data/raga-cards.json`
- `data/seed-panels.json`

## Notes

- This is a clean Stage 1 skeleton, not yet the final production build.
- It preserves idea count and source metadata in the compact bundle.
- The prompt engine is intentionally selective and does not dump the entire pool.
- The compact data file is large, so the first load can take a moment.

## How to run locally

Because browsers often block local JSON loading from `file://`, serve the folder over a tiny local web server.

### Option 1 — Python

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### Option 2 — VS Code Live Server

Open the folder and run it with Live Server.

## Suggested next steps

1. Tighten the prompt scoring and stage mapping.
2. Split the compact idea bundle into smarter lazy-load chunks.
3. Add deeper raga cards and gear-specific builders.
4. Add section library, templates and better export formatting.
5. Add richer source traceability and book/domain drill-down.
