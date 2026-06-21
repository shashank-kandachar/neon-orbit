# AGENTS.md — Neon Orbit app guidance for Codex

## Role

You are helping build the Neon Orbit Composition Guide, a local-first web app for composing psychedelic live-electronic music.

## Non-negotiables

- Preserve the audited 72-book knowledge data.
- Preserve idea/source/book/domain metadata.
- Preserve source traceability.
- Do not delete or flatten the idea pool.
- Do not convert this into a generic songwriting app.
- Use UK English in UI copy.
- Keep the workflow clean and step-by-step.
- Keep GitHub Pages compatibility.

## UX direction

The app should feel like a calm creative guide, not a dashboard.

For each composition step:

- show only a small number of useful prompts
- keep details hidden until requested
- make source trace available but not visually loud
- keep gear and raga guidance practical

## Key selection behaviour

The pitch screen must be key-first:

1. choose note/tonic/root
2. choose scale/mode/raga
3. show the combined key world

Examples:

- D Dorian
- A Bhairavi
- C♯ / D♭ Lydian dominant

## Data notes

`data/ideas.compact.json` is large. Do not remove it. If performance work is needed, propose chunking or indexing in a separate change while preserving every idea and metadata field.

## Testing

At minimum:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Check:

- app loads
- key-first pitch screen works
- idea pool loads
- prompts appear
- source trace works
- save works
- Markdown/JSON export works
- mobile layout is usable
