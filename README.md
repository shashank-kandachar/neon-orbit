# Neon Orbit — Section Wizard

This is the cleaner wizard-style version of the Neon Orbit Composition Guide.

## What changed from the first skeleton

- One focused step at a time instead of a large dashboard.
- Setup is separated from composition.
- Only three prompt choices are shown at each build step.
- Source trace, chosen prompts and search are hidden inside collapsible panels.
- The idea pool loads only when needed.
- The visual style is still psychedelic, but calmer and less cluttered.
- Designed to feel better on iPhone Safari.

## Run locally

From this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## GitHub Pages

Upload the contents of this folder to the root of your `neon-orbit` repo.

Your app URL should be:

```text
https://shashank-kandachar.github.io/neon-orbit/
```

## Data

This build still uses the audited Books 01–72 compact app data in `data/`.
