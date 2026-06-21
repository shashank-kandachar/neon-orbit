#!/usr/bin/env python3
"""Non-destructive redundancy audit for the Neon Orbit compact idea pool."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


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

STRUCTURAL_FIELDS = [
    *TEXT_FIELDS,
    *LIST_FIELDS,
    "bookNumber",
    "qualityScore",
    "extractionConfidence",
    "sourcePhase",
]

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "it",
    "its",
    "make",
    "of",
    "on",
    "or",
    "so",
    "that",
    "the",
    "then",
    "this",
    "to",
    "use",
    "using",
    "with",
    "without",
}


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload) -> None:
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def normalise_text(value) -> str:
    if value is None:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = (
        text.replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )
    return re.sub(r"\s+", " ", text.casefold()).strip()


def punctuation_fold(value) -> str:
    text = normalise_text(value)
    text = re.sub(r"[^\w\s]+", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def list_value(value) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, list):
        return tuple(sorted(normalise_text(item) for item in value if normalise_text(item)))
    if isinstance(value, dict):
        return tuple(sorted(normalise_text(key) for key, enabled in value.items() if enabled))
    item = normalise_text(value)
    return (item,) if item else ()


def structural_signature(idea: dict) -> str:
    parts = []
    for field in STRUCTURAL_FIELDS:
        value = idea.get(field)
        if field in LIST_FIELDS:
            parts.append([field, list(list_value(value))])
        else:
            parts.append([field, normalise_text(value)])
    encoded = json.dumps(parts, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def tokenise(value) -> list[str]:
    text = punctuation_fold(value)
    tokens = re.findall(r"\w+", text, flags=re.UNICODE)
    return [token for token in tokens if len(token) > 1 and token not in STOPWORDS]


def simhash(tokens: list[str]) -> int:
    if not tokens:
        return 0
    if len(tokens) >= 4:
        shingles = [" ".join(tokens[index : index + 3]) for index in range(len(tokens) - 2)]
    else:
        shingles = tokens
    weights = Counter(shingles)
    totals = [0] * 64
    for shingle, weight in weights.items():
        digest = hashlib.blake2b(shingle.encode("utf-8"), digest_size=8).digest()
        number = int.from_bytes(digest, "big")
        for bit in range(64):
            if number & (1 << bit):
                totals[bit] += weight
            else:
                totals[bit] -= weight
    value = 0
    for bit, score in enumerate(totals):
        if score >= 0:
            value |= 1 << bit
    return value


def hamming_distance(left: int, right: int) -> int:
    return bin(left ^ right).count("1")


def jaccard(left: set[str], right: set[str]) -> float:
    if not left and not right:
        return 1.0
    union = left | right
    if not union:
        return 0.0
    return len(left & right) / len(union)


class DisjointSet:
    def __init__(self):
        self.parent = {}

    def find(self, item):
        self.parent.setdefault(item, item)
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, left, right):
        root_left = self.find(left)
        root_right = self.find(right)
        if root_left != root_right:
            self.parent[root_right] = root_left

    def groups(self):
        grouped = defaultdict(list)
        for item in self.parent:
            grouped[self.find(item)].append(item)
        return [sorted(items) for items in grouped.values() if len(items) > 1]


def idea_ref(idea: dict) -> dict:
    return {
        "id": idea.get("id"),
        "bookNumber": idea.get("bookNumber"),
        "sourceBook": idea.get("sourceBook"),
        "sourceAuthor": idea.get("sourceAuthor"),
        "sourceChapterTitle": idea.get("sourceChapterTitle"),
        "sourceConcept": idea.get("sourceConcept"),
        "stageBucket": idea.get("stageBucket"),
        "domainHints": idea.get("domainHints") or [],
        "gearHints": idea.get("gearHints") or [],
        "globalIndex": idea.get("globalIndex"),
    }


def group_payload(group: list[dict], prompt_key: str | None = None) -> dict:
    sources = sorted(
        {
            f"Book {idea.get('bookNumber')} - {idea.get('sourceBook') or 'Unknown source'}"
            for idea in group
        }
    )
    stage_buckets = sorted({idea.get("stageBucket") or "" for idea in group if idea.get("stageBucket")})
    concepts = sorted({idea.get("sourceConcept") or "" for idea in group if idea.get("sourceConcept")})
    return {
        "canonicalIdeaId": group[0].get("id"),
        "count": len(group),
        "prompt": group[0].get("prompt"),
        "normalisedPrompt": prompt_key,
        "sameSourceTrace": len(sources) == 1,
        "sourceCount": len(sources),
        "sources": sources[:12],
        "stageBuckets": stage_buckets,
        "sourceConcepts": concepts[:12],
        "ideas": [idea_ref(idea) for idea in group],
    }


def build_exact_groups(ideas: list[dict], key_fn) -> list[list[dict]]:
    grouped = defaultdict(list)
    for idea in ideas:
        key = key_fn(idea)
        if key:
            grouped[key].append(idea)
    groups = [items for items in grouped.values() if len(items) > 1]
    groups.sort(key=lambda items: (-len(items), normalise_text(items[0].get("prompt"))))
    return groups


def build_near_duplicate_groups(ideas: list[dict], max_bucket_size: int, hamming: int, overlap: float):
    valid = [
        (index, idea)
        for index, idea in enumerate(ideas)
        if normalise_text(idea.get("prompt"))
    ]
    token_sets = {}
    hashes = {}
    buckets = defaultdict(list)
    exact_keys = {}

    for index, idea in valid:
        tokens = tokenise(idea.get("prompt"))
        token_set = set(tokens)
        if len(token_set) < 5:
            continue
        hash_value = simhash(tokens)
        hashes[index] = hash_value
        token_sets[index] = token_set
        exact_keys[index] = normalise_text(idea.get("prompt"))
        for band in range(4):
            band_value = (hash_value >> (band * 16)) & 0xFFFF
            buckets[(band, band_value)].append(index)

    seen_pairs = set()
    dsu = DisjointSet()
    skipped_large_buckets = 0
    checked_pairs = 0
    matched_pairs = 0

    for members in buckets.values():
        members = sorted(set(members))
        if len(members) > max_bucket_size:
            skipped_large_buckets += 1
            continue
        for left_offset, left in enumerate(members):
            for right in members[left_offset + 1 :]:
                pair = (left, right)
                if pair in seen_pairs:
                    continue
                seen_pairs.add(pair)
                checked_pairs += 1
                if exact_keys[left] == exact_keys[right]:
                    continue
                if hamming_distance(hashes[left], hashes[right]) > hamming:
                    continue
                if jaccard(token_sets[left], token_sets[right]) < overlap:
                    continue
                dsu.union(left, right)
                matched_pairs += 1

    groups = []
    for indexes in dsu.groups():
        group = [ideas[index] for index in indexes]
        groups.append(group)
    groups.sort(key=lambda items: (-len(items), normalise_text(items[0].get("prompt"))))
    diagnostics = {
        "candidatePairsChecked": checked_pairs,
        "candidatePairsMatched": matched_pairs,
        "largeBucketsSkipped": skipped_large_buckets,
        "hammingThreshold": hamming,
        "jaccardThreshold": overlap,
        "maxBucketSize": max_bucket_size,
    }
    return groups, diagnostics


def summarise_groups(groups: list[list[dict]]) -> dict:
    return {
        "groups": len(groups),
        "ideasInGroups": sum(len(group) for group in groups),
        "duplicatesBeyondFirst": sum(len(group) - 1 for group in groups),
        "largestGroup": max((len(group) for group in groups), default=0),
        "groupsWithMultipleSourceTraces": sum(
            1
            for group in groups
            if len(
                {
                    (
                        idea.get("bookNumber"),
                        idea.get("sourceBook"),
                        idea.get("sourceAuthor"),
                    )
                    for idea in group
                }
            )
            > 1
        ),
    }


def write_markdown(path: Path, report: dict) -> None:
    summary = report["summary"]
    lines = [
        "# Neon Orbit Idea Redundancy Audit",
        "",
        f"- Generated: {report['generatedAtUtc']}",
        f"- Input: `{report['input']['path']}`",
        f"- Input SHA-256: `{report['input']['sha256']}`",
        f"- Total ideas: {summary['totalIdeas']:,}",
        f"- Unique IDs: {summary['uniqueIds']:,}",
        f"- Empty prompt ideas: {summary['emptyPromptIdeas']:,}",
        f"- Promptable ideas: {summary['promptableIdeas']:,}",
        f"- Exact normalised prompt duplicate groups: {summary['exactPromptDuplicates']['groups']:,}",
        f"- Punctuation-folded prompt duplicate groups: {summary['punctuationFoldedPromptDuplicates']['groups']:,}",
        f"- Exact structural duplicate groups among promptable ideas: {summary['structuralDuplicates']['groups']:,}",
        f"- Source-only structural duplicate groups: {summary['sourceOnlyStructuralDuplicates']['groups']:,}",
        f"- Near-duplicate candidate groups: {summary['nearPromptDuplicates']['groups']:,}",
        "",
        "## Interpretation",
        "",
        "This audit does not delete, rewrite, deduplicate, or flatten the idea pool. Groups marked here are candidates for UI-level grouping or later human review. If source trace differs, preserve every raw idea and expose the sources as alternates rather than collapsing them destructively.",
        "",
        "## Top Exact Prompt Groups",
        "",
    ]

    for group in report["exactPromptGroups"][:12]:
        lines.extend(
            [
                f"### {group['count']} ideas - {group['canonicalIdeaId']}",
                "",
                group.get("prompt") or "",
                "",
                f"- Same source trace: {group['sameSourceTrace']}",
                f"- Sources: {'; '.join(group['sources'])}",
                f"- Stage buckets: {', '.join(group['stageBuckets'])}",
                "",
            ]
        )

    lines.extend(["## Top Near-Duplicate Candidate Groups", ""])
    for group in report["nearPromptGroups"][:12]:
        lines.extend(
            [
                f"### {group['count']} ideas - {group['canonicalIdeaId']}",
                "",
                group.get("prompt") or "",
                "",
                f"- Same source trace: {group['sameSourceTrace']}",
                f"- Sources: {'; '.join(group['sources'])}",
                "",
            ]
        )

    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ideas", default="data/ideas.compact.json", type=Path)
    parser.add_argument("--out-dir", default="reports", type=Path)
    parser.add_argument("--near-limit", default=200, type=int, help="Maximum groups to include in JSON detail per category.")
    parser.add_argument("--max-bucket-size", default=180, type=int)
    parser.add_argument("--hamming", default=6, type=int)
    parser.add_argument("--overlap", default=0.72, type=float)
    args = parser.parse_args()

    ideas_path = args.ideas
    ideas = load_json(ideas_path)
    if not isinstance(ideas, list):
        raise SystemExit("Expected the compact idea file to contain a JSON array.")

    args.out_dir.mkdir(parents=True, exist_ok=True)

    id_groups = defaultdict(list)
    for idea in ideas:
        id_groups[idea.get("id")].append(idea)
    duplicate_id_groups = [items for key, items in id_groups.items() if key and len(items) > 1]
    missing_id_ideas = [idea for idea in ideas if not idea.get("id")]
    empty_prompt_ideas = [idea for idea in ideas if not normalise_text(idea.get("prompt"))]

    promptable_ideas = [idea for idea in ideas if normalise_text(idea.get("prompt"))]
    exact_prompt_groups = build_exact_groups(promptable_ideas, lambda idea: normalise_text(idea.get("prompt")))
    punctuation_groups = build_exact_groups(promptable_ideas, lambda idea: punctuation_fold(idea.get("prompt")))
    structural_groups = build_exact_groups(promptable_ideas, structural_signature)
    source_only_structural_groups = build_exact_groups(empty_prompt_ideas, structural_signature)
    near_groups, near_diagnostics = build_near_duplicate_groups(
        ideas,
        max_bucket_size=args.max_bucket_size,
        hamming=args.hamming,
        overlap=args.overlap,
    )

    missing_field_counts = Counter()
    for idea in ideas:
        for field in TEXT_FIELDS + LIST_FIELDS:
            value = idea.get(field)
            if value in (None, "", []):
                missing_field_counts[field] += 1

    report = {
        "generatedAtUtc": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "input": {
            "path": str(ideas_path),
            "sha256": sha256_file(ideas_path),
        },
        "summary": {
            "totalIdeas": len(ideas),
            "uniqueIds": len({idea.get("id") for idea in ideas if idea.get("id")}),
            "missingIdIdeas": len(missing_id_ideas),
            "duplicateIdGroups": len(duplicate_id_groups),
            "emptyPromptIdeas": len(empty_prompt_ideas),
            "promptableIdeas": len(promptable_ideas),
            "exactPromptDuplicates": summarise_groups(exact_prompt_groups),
            "punctuationFoldedPromptDuplicates": summarise_groups(punctuation_groups),
            "structuralDuplicates": summarise_groups(structural_groups),
            "sourceOnlyStructuralDuplicates": summarise_groups(source_only_structural_groups),
            "nearPromptDuplicates": summarise_groups(near_groups),
        },
        "nearDuplicateDiagnostics": near_diagnostics,
        "missingFieldCounts": dict(sorted(missing_field_counts.items())),
        "emptyPromptIdeas": [idea_ref(idea) for idea in empty_prompt_ideas[: args.near_limit]],
        "duplicateIdGroups": [group_payload(group) for group in duplicate_id_groups[: args.near_limit]],
        "exactPromptGroups": [
            group_payload(group, normalise_text(group[0].get("prompt")))
            for group in exact_prompt_groups[: args.near_limit]
        ],
        "punctuationFoldedPromptGroups": [
            group_payload(group, punctuation_fold(group[0].get("prompt")))
            for group in punctuation_groups[: args.near_limit]
        ],
        "structuralDuplicateGroups": [
            group_payload(group)
            for group in structural_groups[: args.near_limit]
        ],
        "sourceOnlyStructuralDuplicateGroups": [
            group_payload(group)
            for group in source_only_structural_groups[: args.near_limit]
        ],
        "nearPromptGroups": [
            group_payload(group)
            for group in near_groups[: args.near_limit]
        ],
    }

    json_path = args.out_dir / "idea-redundancy-audit.json"
    markdown_path = args.out_dir / "idea-redundancy-audit.md"
    write_json(json_path, report)
    write_markdown(markdown_path, report)

    print(f"Wrote {json_path}")
    print(f"Wrote {markdown_path}")
    print(json.dumps(report["summary"], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
