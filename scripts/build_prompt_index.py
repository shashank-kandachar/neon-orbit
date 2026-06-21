#!/usr/bin/env python3
"""Build the derived, non-destructive prompt index for the app."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


STAGE_ORDER = [
    "section_identity",
    "pitch_material",
    "tempo_groove",
    "section_role",
    "rhythmic_foundation",
    "bass_pulse",
    "harmony_drone",
    "motif_hook",
    "texture_layer",
    "movement_modulation",
    "arrangement_arc",
    "transitions",
    "mix_space",
    "live_translation",
    "finish_review",
]

TEXT_FIELDS = [
    "prompt",
    "neonOrbitUse",
    "category",
    "useCase",
    "wizardStage",
    "wizardStageDisplay",
    "stageBucket",
    "energy",
    "sourceBook",
    "sourceAuthor",
    "sourceChapterTitle",
    "sourceConcept",
]

LIST_FIELDS = [
    "instrumentFocus",
    "tags",
    "appSlots",
    "gearHints",
    "domainHints",
]

KEEP_FIELDS = [
    "id",
    "bookNumber",
    "sourceAuthor",
    "sourceBook",
    "sourceChapterTitle",
    "sourceConcept",
    "stageBucket",
    "instrumentFocus",
    "energy",
    "useCase",
    "prompt",
    "neonOrbitUse",
    "appSlots",
    "qualityScore",
    "extractionConfidence",
    "globalIndex",
    "sourcePhase",
    "gearHints",
    "domainHints",
]

DOMAIN_TAGS = {
    "pitch-world": ["melody", "notes", "scale"],
    "rhythm-groove": ["rhythm", "groove"],
    "bass": ["bass", "low end"],
    "harmony-drone": ["harmony", "drone"],
    "guitar": ["guitar", "melody"],
    "electronic-composition": ["arrangement", "Ableton"],
    "sound-design": ["sound design", "texture"],
    "sampling-field": ["field sound", "texture"],
    "microfreak": ["MicroFreak", "synth"],
    "sl2": ["SL-2", "rhythm", "movement"],
    "ampero": ["Ampero", "guitar", "effects"],
    "mixing-production": ["mix", "space"],
    "psychedelic-structure": ["psychedelic", "arrangement"],
    "creative-process": ["workflow", "finish"],
    "live-performance": ["live", "performance"],
}

STAGE_TAGS = {
    "section_identity": ["intent", "mood", "arrangement"],
    "pitch_material": ["melody", "notes", "scale", "raga"],
    "tempo_groove": ["rhythm", "groove", "pulse"],
    "section_role": ["arrangement", "intent", "journey"],
    "rhythmic_foundation": ["rhythm", "drums", "groove"],
    "bass_pulse": ["bass", "pulse", "low end"],
    "harmony_drone": ["harmony", "drone", "pad"],
    "motif_hook": ["melody", "hook", "guitar"],
    "texture_layer": ["texture", "field sound", "effects"],
    "movement_modulation": ["movement", "automation", "effects"],
    "arrangement_arc": ["arrangement", "journey", "build"],
    "transitions": ["transition", "arrangement", "handoff"],
    "mix_space": ["mix", "space", "clarity"],
    "live_translation": ["live", "performance", "hands"],
    "finish_review": ["finish", "review", "save"],
}

KEYWORD_TAGS = [
    ("kick", "rhythm"),
    ("drum", "drums"),
    ("percussion", "rhythm"),
    ("groove", "groove"),
    ("pulse", "pulse"),
    ("bass", "bass"),
    ("low end", "low end"),
    ("riff", "hook"),
    ("motif", "hook"),
    ("melody", "melody"),
    ("phrase", "melody"),
    ("mode", "scale"),
    ("scale", "scale"),
    ("raga", "raga"),
    ("drone", "drone"),
    ("pad", "pad"),
    ("chord", "harmony"),
    ("harmony", "harmony"),
    ("field recording", "field sound"),
    ("texture", "texture"),
    ("delay", "effects"),
    ("reverb", "space"),
    ("filter", "movement"),
    ("automate", "automation"),
    ("automation", "automation"),
    ("modulation", "movement"),
    ("transition", "transition"),
    ("build", "build"),
    ("drop", "arrangement"),
    ("live", "live"),
    ("perform", "performance"),
    ("guitar", "guitar"),
    ("ableton", "Ableton"),
    ("microfreak", "MicroFreak"),
    ("sl-2", "SL-2"),
    ("slicer", "SL-2"),
    ("ampero", "Ampero"),
]

JARGON_WORDS = {
    "amplitude",
    "atonal",
    "chalan",
    "combinatorial",
    "granular",
    "hexachord",
    "modulation matrix",
    "normalised",
    "normalized",
    "organum",
    "parameter",
    "serial",
    "spectral",
    "tetrachord",
    "twelve-tone",
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")


def normalise(value="") -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    text = (
        text.replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )
    return re.sub(r"\s+", " ", text).strip().casefold()


def prompt_key(idea: dict) -> str:
    text = normalise(idea.get("prompt"))
    text = re.sub(r"[^\w\s]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def list_value(value) -> list:
    if isinstance(value, list):
        return value
    return []


def build_blob(idea: dict) -> str:
    parts = []
    for field in TEXT_FIELDS:
        value = idea.get(field)
        if value:
            parts.append(str(value))
    for field in LIST_FIELDS:
        parts.extend(str(item) for item in list_value(idea.get(field)) if item)
    return normalise(" ".join(parts))


def clarity_score(idea: dict) -> int:
    prompt = idea.get("prompt") or ""
    if not prompt.strip():
        return -100
    text = normalise(prompt)
    penalty = 0
    for word in JARGON_WORDS:
        if word in text:
            penalty += 4
    if text.startswith("using ") and " as the source" in text:
        penalty += 4
    if len(prompt) > 340:
        penalty += 8
    if len(prompt) > 520:
        penalty += 12
    score = 12 - penalty
    blob = build_blob(idea)
    if "guitar" in blob:
        score += 3
    if "ableton" in blob:
        score += 2
    if any(word in blob for word in ["drum", "groove", "rhythm"]):
        score += 2
    if any(word in blob for word in ["bass", "drone", "melody"]):
        score += 2
    if len(prompt) < 260:
        score += 3
    return max(-40, min(20, score))


def is_usable(idea: dict) -> bool:
    prompt = idea.get("prompt") or ""
    if not prompt.strip():
        return False
    if normalise(prompt) == "null":
        return False
    if len(prompt) < 24:
        return False
    return clarity_score(idea) > -28


def add_tag(tags: list[str], tag: str) -> None:
    clean = str(tag or "").strip()
    if clean and clean.casefold() not in {item.casefold() for item in tags}:
        tags.append(clean)


def derive_tags(idea: dict, blob: str) -> list[str]:
    tags: list[str] = []
    stage = idea.get("stageBucket") or ""
    for tag in STAGE_TAGS.get(stage, []):
        add_tag(tags, tag)
    for domain in list_value(idea.get("domainHints")):
        for tag in DOMAIN_TAGS.get(domain, [domain]):
            add_tag(tags, tag)
    for gear in list_value(idea.get("gearHints")):
        add_tag(tags, "field sound" if gear == "field_recordings" else gear.replace("_", " "))
    for instrument in list_value(idea.get("instrumentFocus")):
        clean = normalise(instrument)
        if "guitar" in clean:
            add_tag(tags, "guitar")
        if "ableton" in clean:
            add_tag(tags, "Ableton")
        if "microfreak" in clean:
            add_tag(tags, "MicroFreak")
        if "drum" in clean or "percussion" in clean:
            add_tag(tags, "drums")
        if "bass" in clean:
            add_tag(tags, "bass")
        if "field" in clean:
            add_tag(tags, "field sound")
        if "synth" in clean:
            add_tag(tags, "synth")
        if "voice" in clean or "vocal" in clean:
            add_tag(tags, "voice")
    for keyword, tag in KEYWORD_TAGS:
        if keyword in blob:
            add_tag(tags, tag)
    return tags[:14]


def source_ref(idea: dict) -> dict:
    return {
        "id": idea.get("id"),
        "_indexKey": f"{idea.get('id') or 'idea'}::{idea.get('globalIndex') or ''}",
        "bookNumber": idea.get("bookNumber"),
        "sourceBook": idea.get("sourceBook"),
        "sourceAuthor": idea.get("sourceAuthor"),
        "sourceChapterTitle": idea.get("sourceChapterTitle"),
        "sourceConcept": idea.get("sourceConcept"),
        "stageBucket": idea.get("stageBucket"),
        "globalIndex": idea.get("globalIndex"),
        "domainHints": idea.get("domainHints") or [],
        "gearHints": idea.get("gearHints") or [],
    }


def compact_record(idea: dict) -> dict:
    record = {field: idea.get(field) for field in KEEP_FIELDS if idea.get(field) not in (None, [], "")}
    blob = build_blob(idea)
    record["_promptKey"] = prompt_key(idea)
    record["_indexKey"] = f"{idea.get('id') or 'idea'}::{idea.get('globalIndex') or ''}"
    record["_indexTags"] = derive_tags(idea, blob)
    record["_clarityScore"] = clarity_score(idea)
    return record


def representative_score(record: dict) -> tuple:
    app_slots = set(record.get("appSlots") or [])
    return (
        1 if "sectionWizard" in app_slots else 0,
        1 if "trackBuilder" in app_slots else 0,
        int(record.get("_clarityScore") or 0),
        int(record.get("qualityScore") or 0),
        -len(record.get("prompt") or ""),
    )


def build_prompt_index(input_path: Path, output_path: Path, chunk_dir: Path | None = None) -> dict:
    ideas = load_json(input_path)
    prompt_groups: dict[str, list[dict]] = defaultdict(list)
    empty_prompt_count = 0
    unusable_count = 0

    for idea in ideas:
        if not (idea.get("prompt") or "").strip():
            empty_prompt_count += 1
            continue
        if not is_usable(idea):
            unusable_count += 1
            continue
        key = prompt_key(idea)
        if not key:
            unusable_count += 1
            continue
        prompt_groups[key].append(idea)

    stage_buckets: dict[str, list[dict]] = {stage: [] for stage in STAGE_ORDER}
    duplicate_groups = 0
    alternate_count = 0

    for group in prompt_groups.values():
        records = [compact_record(idea) for idea in group]
        records.sort(key=representative_score, reverse=True)
        chosen = records[0]
        alternates = [source_ref(idea) for idea in group if source_ref(idea)["_indexKey"] != chosen["_indexKey"]]
        if alternates:
            duplicate_groups += 1
            alternate_count += len(alternates)
            chosen["_relatedIdeaCount"] = len(group)
            chosen["_sourceAlternates"] = alternates[:12]
        stage = chosen.get("stageBucket") or "section_identity"
        stage_buckets.setdefault(stage, []).append(chosen)

    for records in stage_buckets.values():
        records.sort(key=representative_score, reverse=True)

    payload = {
        "meta": {
            "generatedAtUtc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "sourceFile": input_path.name,
            "rawIdeaCount": len(ideas),
            "emptyPromptCount": empty_prompt_count,
            "unusablePromptCount": unusable_count,
            "promptableGroupCount": sum(len(records) for records in stage_buckets.values()),
            "exactPromptDuplicateGroups": duplicate_groups,
            "sourceAlternatesPreserved": alternate_count,
            "note": "Derived prompt index only. The audited compact idea file remains the source of truth.",
        },
        "stageBuckets": stage_buckets,
    }
    write_json(output_path, payload)
    if chunk_dir:
        write_prompt_chunks(payload, chunk_dir)
    return payload


def write_prompt_chunks(payload: dict, chunk_dir: Path) -> None:
    stage_dir = chunk_dir / "stages"
    meta = payload["meta"]
    stage_manifest = {}

    for stage in STAGE_ORDER:
        records = payload["stageBuckets"].get(stage, [])
        stage_path = stage_dir / f"{stage}.json"
        stage_payload = {
            "meta": {
                "generatedAtUtc": meta["generatedAtUtc"],
                "sourceFile": meta["sourceFile"],
                "stage": stage,
                "recordCount": len(records),
                "note": "Derived stage prompt chunk. The audited compact idea file remains the source of truth.",
            },
            "ideas": records,
        }
        write_json(stage_path, stage_payload)
        stage_manifest[stage] = {
            "path": f"stages/{stage}.json",
            "recordCount": len(records),
        }

    manifest = {
        "meta": {
            "generatedAtUtc": meta["generatedAtUtc"],
            "sourceFile": meta["sourceFile"],
            "rawIdeaCount": meta["rawIdeaCount"],
            "emptyPromptCount": meta["emptyPromptCount"],
            "unusablePromptCount": meta["unusablePromptCount"],
            "promptableGroupCount": meta["promptableGroupCount"],
            "exactPromptDuplicateGroups": meta["exactPromptDuplicateGroups"],
            "sourceAlternatesPreserved": meta["sourceAlternatesPreserved"],
            "stageCount": len(STAGE_ORDER),
            "note": "Chunk manifest for lazy local-first loading. The audited compact idea file remains the source of truth.",
        },
        "stages": stage_manifest,
    }
    write_json(chunk_dir / "manifest.json", manifest)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", default="data/ideas.compact.json")
    parser.add_argument("--output", default="data/prompt-index.json")
    parser.add_argument("--chunk-dir", default="data/prompt-index")
    args = parser.parse_args()

    payload = build_prompt_index(Path(args.input), Path(args.output), Path(args.chunk_dir))
    meta = payload["meta"]
    print(
        f"Wrote {args.output}: {meta['promptableGroupCount']} prompt groups, "
        f"{meta['sourceAlternatesPreserved']} source alternates preserved."
    )
    print(f"Wrote stage chunks to {args.chunk_dir}.")


if __name__ == "__main__":
    main()
