import csv
import json
import os
from collections import Counter

BASE_MASTER = '/mnt/data/neon_orbit_work/master_extract/Neon_Orbit_25_Book_Idea_Pool_Workspace/00_Master/FINAL_CONSOLIDATION_BOOKS_01_72'
MASTER_JSON = os.path.join(BASE_MASTER, 'neon_orbit_master_ideas_books_01_72_FINAL.json')
LEDGER_CSV = os.path.join(BASE_MASTER, 'source_ledger_books_01_72_FINAL.csv')
RAGA_47 = '/mnt/data/neon_orbit_work/raga_extract/Neon_Orbit_25_Book_Idea_Pool_Workspace/Book_47__Joep_Bor_Ed__The_Raga_Guide_A_Survey_Of_74_Hindustani_Ragas/raga_selector_seed.json'
RAGA_48 = '/mnt/data/neon_orbit_work/raga_extract/Neon_Orbit_25_Book_Idea_Pool_Workspace/Book_48__Walter_Kaufmann__The_Ragas_Of_North_India/raga_selector_seed.json'
APP_EXPORTS = '/mnt/data/neon_orbit_work/app_exports_extract/Neon_Orbit_25_Book_Idea_Pool_Workspace/00_Master/app_exports'
OUT_DIR = '/mnt/data/neon-orbit-app-skeleton/data'

STAGE_BUCKETS = [
    ('section_identity', 'Section identity'),
    ('pitch_material', 'Scale / raga / mode'),
    ('tempo_groove', 'Tempo / groove / meter'),
    ('section_role', 'Role of the section'),
    ('rhythmic_foundation', 'Rhythmic foundation'),
    ('bass_pulse', 'Bass / pulse'),
    ('harmony_drone', 'Harmony / drone / pad'),
    ('motif_hook', 'Guitar / synth motif'),
    ('texture_layer', 'Texture / field / sound design'),
    ('movement_modulation', 'Movement / automation'),
    ('arrangement_arc', 'Arrangement arc'),
    ('transitions', 'Transitions'),
    ('mix_space', 'Mix space'),
    ('live_translation', 'Live-performance feasibility'),
    ('finish_review', 'Finish / review / commit'),
]


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def normalise_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        out = []
        for item in value:
            if item is None:
                continue
            s = str(item).strip()
            if s:
                out.append(s)
        return out
    if isinstance(value, dict):
        return [k for k, v in value.items() if v]
    s = str(value).strip()
    if not s or s.lower() == 'none':
        return []
    return [s]


def text_blob(*parts):
    items = []
    for part in parts:
        if part is None:
            continue
        if isinstance(part, list):
            items.extend([str(x) for x in part])
        elif isinstance(part, dict):
            items.extend([f"{k}:{v}" for k, v in part.items()])
        else:
            items.append(str(part))
    return ' '.join(items).lower()


def has_any(blob, keywords):
    return any(k in blob for k in keywords)


def derive_stage_bucket(idea):
    blob = text_blob(
        idea.get('wizardStage'),
        idea.get('wizardStageDisplay'),
        idea.get('category'),
        idea.get('useCase'),
        idea.get('instrumentFocus'),
        idea.get('prompt'),
        idea.get('neonOrbitUse'),
        idea.get('tags'),
    )

    if has_any(blob, ['finish', 'review', 'commit', 'release', 'finalise', 'finalize', 'system / workflow']):
        return 'finish_review'
    if has_any(blob, ['live performance', 'live set', 'live-set', 'performance', 'band integration', 'stage', 'live jam', 'foh', 'monitor', 'rehearsal']):
        return 'live_translation'
    if has_any(blob, ['mix', 'spatial', 'space / depth', 'depth', 'headroom', 'eq', 'balance', 'stereo', 'mix revision', 'mix bus']):
        return 'mix_space'
    if has_any(blob, ['transition', 'interlude', 'breakdown', 'handoff', 'riser', 'lift into', 'drop into']):
        return 'transitions'
    if has_any(blob, ['structure', 'arrangement', 'section arc', 'intro', 'outro', 'verse-like', 'bridge', 'a section', 'b section', 'drop', 'climax']):
        return 'arrangement_arc'
    if has_any(blob, ['automation', 'modulation', 'movement', 'evolving', 'lfo', 'envelope movement', 'morph', 'filter sweep', 'motion']):
        return 'movement_modulation'
    if has_any(blob, ['field recording', 'field recordings', 'sampling', 'texture', 'atmosphere', 'ambience', 'synthesis', 'sound design', 'noise layer', 'granular', 'timbre', 'microfreak', 'sl-2', 'slicer', 'ampero', 'found sound']):
        return 'texture_layer'
    if has_any(blob, ['guitar', 'melody', 'motif', 'lead', 'riff', 'hook', 'phrase', 'single-note', 'countermelody', 'arpeggio']):
        return 'motif_hook'
    if has_any(blob, ['harmony', 'drone', 'pad', 'voicing', 'chord', 'sustain', 'tonal centre', 'tonic', 'quartal', 'interval colour']):
        return 'harmony_drone'
    if has_any(blob, ['bass', 'low end', 'sub', 'sub-bass', 'bassline']):
        return 'bass_pulse'
    if has_any(blob, ['rhythm', 'groove', 'pulse', 'drum', 'percussion', 'meter', 'polyrhythm', 'beat', 'pattern']):
        return 'rhythmic_foundation'
    if has_any(blob, ['tempo', 'bpm', 'swing', 'shuffle', 'feel', 'meter', 'time signature']):
        return 'tempo_groove'
    if has_any(blob, ['raga', 'mode', 'scale', 'tonality', 'key centre', 'key center', 'pitch', 'thaat', 'pakad', 'aroha', 'avaroha']):
        return 'pitch_material'
    if has_any(blob, ['use case', 'section role', 'purpose', 'function', 'opening statement', 'role of the section']):
        return 'section_role'
    if has_any(blob, ['concept', 'identity', 'seed', 'first idea', 'start', 'intention', 'workflow / setup']):
        return 'section_identity'
    return 'section_identity'


def derive_gear_hints(idea):
    blob = text_blob(
        idea.get('instrumentFocus'),
        idea.get('tags'),
        idea.get('prompt'),
        idea.get('neonOrbitUse'),
    )
    hints = []
    mapping = {
        'guitar': ['guitar', 'guitar harmonics', 'pedalboard'],
        'ableton': ['ableton', 'session view', 'arrangement view', 'drum rack', 'clip', 'max for live'],
        'microfreak': ['microfreak'],
        'sl2': ['sl-2', 'slicer', 'boss sl-2'],
        'ampero': ['ampero', 'hotone'],
        'field_recordings': ['field recording', 'field recordings', 'found sound', 'voice memo'],
    }
    for label, keys in mapping.items():
        if has_any(blob, keys):
            hints.append(label)
    return hints


def derive_domain_hints(idea):
    blob = text_blob(
        idea.get('category'),
        idea.get('useCase'),
        idea.get('instrumentFocus'),
        idea.get('tags'),
        idea.get('prompt'),
        idea.get('neonOrbitUse'),
        idea.get('sourceBookFullTitle'),
    )
    domains = []
    mapping = {
        'pitch-world': ['raga', 'mode', 'scale', 'tonality', 'thaat', 'pakad', 'pitch'],
        'rhythm-groove': ['rhythm', 'groove', 'pulse', 'drum', 'percussion', 'meter'],
        'bass': ['bass', 'sub', 'low end'],
        'harmony-drone': ['harmony', 'drone', 'pad', 'voicing', 'chord'],
        'guitar': ['guitar', 'fretboard', 'voicing'],
        'electronic-composition': ['ableton arrangement', 'arrangement', 'electronic', 'clip', 'scene'],
        'sound-design': ['synthesis', 'sound design', 'timbre', 'oscillator', 'filter', 'granular'],
        'sampling-field': ['field recording', 'sampling', 'found sound', 'soundscape'],
        'microfreak': ['microfreak'],
        'sl2': ['sl-2', 'slicer'],
        'ampero': ['ampero', 'hotone'],
        'mixing-production': ['mix', 'eq', 'compression', 'space', 'mastering'],
        'psychedelic-structure': ['psychedelic', 'trance', 'ambient', 'listener experience', 'altered-state'],
        'creative-process': ['workflow', 'routine', 'finishing', 'resistance', 'practice'],
        'live-performance': ['live performance', 'live set', 'band', 'stage', 'rehearsal'],
    }
    for label, keys in mapping.items():
        if has_any(blob, keys):
            domains.append(label)
    if not domains:
        domains.append('general')
    return domains


def compact_idea(idea):
    tags = normalise_list(idea.get('tags'))
    app_slots = normalise_list(idea.get('appSlots'))
    instrument_focus = normalise_list(idea.get('instrumentFocus'))
    stage_bucket = derive_stage_bucket(idea)
    out = {
        'id': idea.get('id'),
        'bookNumber': idea.get('bookNumber'),
        'sourceAuthor': idea.get('sourceAuthorFull'),
        'sourceBook': idea.get('sourceBookFullTitle'),
        'sourceDisplay': idea.get('sourceDisplay'),
        'sourceChapterTitle': idea.get('sourceChapterTitle'),
        'sourceConcept': idea.get('sourceConcept'),
        'category': idea.get('category'),
        'wizardStage': idea.get('wizardStage'),
        'wizardStageDisplay': idea.get('wizardStageDisplay'),
        'stageBucket': stage_bucket,
        'instrumentFocus': instrument_focus,
        'energy': idea.get('energy'),
        'useCase': idea.get('useCase'),
        'prompt': idea.get('prompt'),
        'neonOrbitUse': idea.get('neonOrbitUse'),
        'tags': tags,
        'appSlots': app_slots,
        'qualityScore': idea.get('qualityScore'),
        'extractionConfidence': idea.get('extractionConfidence'),
        'globalIndex': idea.get('_final_idea_index_global'),
        'sourcePhase': idea.get('_final_source_phase'),
        'gearHints': derive_gear_hints(idea),
        'domainHints': derive_domain_hints(idea),
    }
    return out


def read_ledger():
    rows = []
    with open(LEDGER_CSV, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            row['book_number'] = int(row['book_number'])
            row['actual_atomic_idea_count'] = int(row['actual_atomic_idea_count'])
            rows.append(row)
    return rows


def build_seed_panels():
    data = {}
    for name in [
        'microfreak_app_prompt_domains.json',
        'sl2_app_prompt_domains.json',
        'ampero_signal_chain_engine_seed.json',
        'neon_orbit_scale_selector_ui_seed.json',
        'scale_formula_atlas_seed.json',
        'exotic_scale_colour_seed.json',
    ]:
        path = os.path.join(APP_EXPORTS, name)
        if os.path.exists(path):
            key = name.replace('.json', '')
            data[key] = load_json(path)
    return data


def build_raga_cards():
    r47 = load_json(RAGA_47)
    r48 = load_json(RAGA_48)
    cards = []
    by_name = {}
    for card in r47.get('raga_cards', []):
        entry = {
            'name': card.get('raga_name'),
            'timeWindow': card.get('time_or_performance_window_ocr'),
            'ascentDescent': card.get('ascent_descent_ocr_excerpt'),
            'melodicOutline': card.get('melodic_outline_ocr_excerpt'),
            'summary': card.get('paraphrased_source_summary'),
            'keyFeatures': card.get('paraphrased_key_features', []),
            'note': card.get('app_note'),
            'source': 'Book 47 — The Raga Guide',
        }
        by_name[entry['name'].lower()] = entry
        cards.append(entry)
    for family in r48.get('thaat_family_map', []):
        pass
    return {
        'overview': {
            'designRule': r47.get('design_rule'),
            'firstScreenCopy': r47.get('first_screen_copy'),
            'filters': r47.get('suggested_filters', []),
            'guardrails': r48.get('guardrails', []),
            'families': r48.get('thaat_family_map', []),
        },
        'cards': cards,
    }


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    master = load_json(MASTER_JSON)
    ideas = master['ideas']
    compact = [compact_idea(i) for i in ideas]
    stage_counts = Counter(i['stageBucket'] for i in compact)
    domain_counts = Counter()
    gear_counts = Counter()
    for idea in compact:
        domain_counts.update(idea['domainHints'])
        gear_counts.update(idea['gearHints'])

    ledger = read_ledger()
    raga_data = build_raga_cards()
    seed_panels = build_seed_panels()

    manifest = {
        'appName': 'Neon Orbit Composition Guide',
        'version': 'stage1-skeleton',
        'authorityArchive': 'Neon_Orbit_Master_All_Books_01_72_AUDITED_COMPLETE.zip',
        'ideaCount': len(compact),
        'bookCount': master.get('processedBookCount', len(ledger)),
        'bookRange': master.get('bookRange'),
        'auditStatus': master.get('auditStatus'),
        'generatedAtUtc': master.get('createdAtUtc'),
        'stageBuckets': [{'id': sid, 'label': label, 'count': stage_counts.get(sid, 0)} for sid, label in STAGE_BUCKETS],
        'domainCounts': domain_counts.most_common(),
        'gearCounts': gear_counts.most_common(),
        'books': [
            {
                'bookNumber': row['book_number'],
                'title': row['source_title_or_display'],
                'author': row['source_author_or_credit'],
                'ideaCount': row['actual_atomic_idea_count'],
                'phase': row['final_phase'],
            }
            for row in ledger
        ],
        'seedPanelsAvailable': list(seed_panels.keys()),
        'ragaCount': len(raga_data['cards']),
    }

    outputs = {
        'manifest.json': manifest,
        'ideas.compact.json': compact,
        'source-ledger.json': ledger,
        'raga-cards.json': raga_data,
        'seed-panels.json': seed_panels,
    }
    for fname, obj in outputs.items():
        with open(os.path.join(OUT_DIR, fname), 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    print('Wrote files to', OUT_DIR)
    for fname in outputs:
        size = os.path.getsize(os.path.join(OUT_DIR, fname)) / (1024 * 1024)
        print(f'{fname}: {size:.2f} MB')


if __name__ == '__main__':
    main()
