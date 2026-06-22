import {
  deriveIdeaTags,
  ideaClarityScore,
  ideaIsUsable,
  normaliseIdeaPromptKey,
} from './idea-presenter.js?v=keyfirst3.55';

const INDEX_CACHE = new WeakMap();

const STAGE_RELATED = {
  section_identity: ['section_role', 'arrangement_arc', 'finish_review'],
  pitch_material: ['harmony_drone', 'motif_hook', 'section_identity'],
  tempo_groove: ['rhythmic_foundation', 'bass_pulse', 'transitions'],
  section_role: ['section_identity', 'arrangement_arc', 'transitions'],
  rhythmic_foundation: ['tempo_groove', 'bass_pulse', 'transitions'],
  bass_pulse: ['rhythmic_foundation', 'harmony_drone', 'tempo_groove'],
  harmony_drone: ['pitch_material', 'motif_hook', 'texture_layer'],
  motif_hook: ['pitch_material', 'harmony_drone', 'texture_layer'],
  texture_layer: ['movement_modulation', 'mix_space', 'harmony_drone'],
  movement_modulation: ['texture_layer', 'arrangement_arc', 'live_translation'],
  arrangement_arc: ['section_role', 'transitions', 'finish_review'],
  transitions: ['arrangement_arc', 'live_translation', 'tempo_groove'],
  mix_space: ['texture_layer', 'live_translation', 'finish_review'],
  live_translation: ['mix_space', 'transitions', 'finish_review'],
  finish_review: ['live_translation', 'mix_space', 'arrangement_arc'],
};

const STAGE_TAGS = {
  section_identity: ['intent', 'mood', 'arrangement'],
  pitch_material: ['melody', 'notes', 'scale', 'raga'],
  tempo_groove: ['rhythm', 'groove', 'pulse'],
  section_role: ['arrangement', 'intent', 'journey'],
  rhythmic_foundation: ['rhythm', 'drums', 'groove'],
  bass_pulse: ['bass', 'pulse', 'low end'],
  harmony_drone: ['harmony', 'drone', 'pad'],
  motif_hook: ['melody', 'hook', 'guitar'],
  texture_layer: ['texture', 'field sound', 'effects'],
  movement_modulation: ['movement', 'automation', 'effects'],
  arrangement_arc: ['arrangement', 'journey', 'build'],
  transitions: ['transition', 'arrangement', 'handoff'],
  mix_space: ['mix', 'space', 'clarity'],
  live_translation: ['live', 'performance', 'hands'],
  finish_review: ['finish', 'review', 'save'],
};

const MODE_TAGS = {
  normal: [],
  fresh: [],
  melody: ['melody', 'notes', 'hook', 'guitar'],
  raga: ['raga', 'melody', 'drone', 'notes'],
  groove: ['rhythm', 'groove', 'pulse', 'drums'],
  rhythm: ['rhythm', 'groove', 'drums', 'cycle'],
  bass: ['bass', 'pulse', 'low end'],
  harmony: ['harmony', 'drone', 'pad'],
  texture: ['texture', 'field sound', 'effects', 'sound design'],
  movement: ['movement', 'automation', 'modulation', 'effects'],
  arrangement: ['arrangement', 'journey', 'transition'],
  live: ['live', 'performance', 'hands'],
  finish: ['finish', 'review', 'save'],
  gear: ['guitar', 'Ableton', 'MicroFreak', 'SL-2', 'Ampero', 'field sound'],
  deeper: [],
};

const DOMAIN_TAGS = {
  'pitch-world': ['melody', 'notes', 'scale'],
  'rhythm-groove': ['rhythm', 'groove'],
  bass: ['bass', 'low end'],
  'harmony-drone': ['harmony', 'drone'],
  guitar: ['guitar', 'melody'],
  'electronic-composition': ['arrangement', 'Ableton'],
  'sound-design': ['sound design', 'texture'],
  'sampling-field': ['field sound', 'texture'],
  microfreak: ['MicroFreak', 'synth'],
  sl2: ['SL-2', 'rhythm', 'movement'],
  ampero: ['Ampero', 'guitar', 'effects'],
  'mixing-production': ['mix', 'space'],
  'psychedelic-structure': ['psychedelic', 'arrangement'],
  'creative-process': ['workflow', 'finish'],
  'live-performance': ['live', 'performance'],
};

const KEYWORD_TAGS = [
  ['kick', 'rhythm'],
  ['drum', 'drums'],
  ['percussion', 'rhythm'],
  ['groove', 'groove'],
  ['pulse', 'pulse'],
  ['bass', 'bass'],
  ['low end', 'low end'],
  ['riff', 'hook'],
  ['motif', 'hook'],
  ['melody', 'melody'],
  ['phrase', 'melody'],
  ['mode', 'scale'],
  ['scale', 'scale'],
  ['raga', 'raga'],
  ['drone', 'drone'],
  ['pad', 'pad'],
  ['chord', 'harmony'],
  ['harmony', 'harmony'],
  ['field recording', 'field sound'],
  ['texture', 'texture'],
  ['delay', 'effects'],
  ['reverb', 'space'],
  ['filter', 'movement'],
  ['automate', 'automation'],
  ['automation', 'automation'],
  ['modulation', 'movement'],
  ['transition', 'transition'],
  ['build', 'build'],
  ['drop', 'arrangement'],
  ['live', 'live'],
  ['perform', 'performance'],
  ['guitar', 'guitar'],
  ['ableton', 'Ableton'],
  ['microfreak', 'MicroFreak'],
  ['sl-2', 'SL-2'],
  ['slicer', 'SL-2'],
  ['ampero', 'Ampero'],
];

const ENERGY_ALIASES = {
  low: ['low', 'quiet', 'intimate', 'subtle', 'ambient'],
  'low to medium': ['low_to_medium', 'low to medium', 'subtle', 'reflective'],
  medium: ['medium', 'balanced'],
  'medium to high': ['medium_to_high', 'medium to high', 'driving', 'evolving'],
  high: ['high', 'club', 'peak', 'punchy', 'warehouse'],
  evolving: ['evolving', 'variable', 'slow-bloom'],
  wide: ['wide', 'expansive'],
  ritual: ['ritual', 'earthy', 'communal'],
};

const SECTION_ALIASES = {
  intro: ['intro', 'opening', 'beginning'],
  outro: ['outro', 'ending', 'closing'],
  build: ['build', 'rise', 'lift'],
  breakdown: ['breakdown', 'space', 'reduced'],
  transition: ['transition', 'handoff', 'bridge'],
  bridge: ['bridge'],
  'main groove': ['main groove', 'groove design', 'a section'],
  'verse-like section': ['verse-like', 'verse'],
  interlude: ['interlude'],
  'drop / peak': ['drop', 'peak', 'climax'],
  'live jam section': ['live jam', 'jam section', 'rehearsal'],
};

function normalise(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenise(value = '') {
  return normalise(value)
    .replace(/[^a-z0-9#+/ -]+/g, ' ')
    .split(/\s+/)
    .filter((part) => part.length > 3);
}

function hasText(idea) {
  return typeof idea?.prompt === 'string' && idea.prompt.trim().length > 0;
}

function addTag(tags, tag) {
  if (!tag) return;
  const clean = String(tag).trim();
  if (!clean) return;
  if (!tags.some((existing) => normalise(existing) === normalise(clean))) tags.push(clean);
}

function addTags(tags, values = []) {
  values.forEach((value) => addTag(tags, value));
}

function hasAny(text, values = []) {
  return values.some((value) => value && text.includes(normalise(value)));
}

function deriveIndexTags(idea, stageId) {
  const tags = [];
  const blob = idea._blob || normalise([
    idea.prompt,
    idea.neonOrbitUse,
    idea.category,
    idea.useCase,
    ...(idea.tags || []),
    ...(idea.instrumentFocus || []),
    ...(idea.domainHints || []),
    ...(idea.gearHints || []),
  ].filter(Boolean).join(' '));

  addTags(tags, deriveIdeaTags(idea, stageId));
  addTags(tags, STAGE_TAGS[stageId] || []);
  for (const domain of idea.domainHints || []) addTags(tags, DOMAIN_TAGS[domain] || [domain]);
  for (const gear of idea.gearHints || []) {
    if (gear === 'field_recordings') addTag(tags, 'field sound');
    else addTag(tags, gear.replace(/_/g, ' '));
  }
  for (const instrument of idea.instrumentFocus || []) {
    const clean = normalise(instrument);
    if (clean.includes('guitar')) addTag(tags, 'guitar');
    if (clean.includes('ableton')) addTag(tags, 'Ableton');
    if (clean.includes('microfreak')) addTag(tags, 'MicroFreak');
    if (clean.includes('drum') || clean.includes('percussion')) addTag(tags, 'drums');
    if (clean.includes('bass')) addTag(tags, 'bass');
    if (clean.includes('field')) addTag(tags, 'field sound');
    if (clean.includes('synth')) addTag(tags, 'synth');
    if (clean.includes('voice') || clean.includes('vocal')) addTag(tags, 'voice');
  }
  for (const [keyword, tag] of KEYWORD_TAGS) {
    if (blob.includes(keyword)) addTag(tags, tag);
  }
  return tags.slice(0, 14);
}

function addToMapArray(map, key, item) {
  if (!key) return;
  const clean = normalise(key);
  if (!map.has(clean)) map.set(clean, []);
  map.get(clean).push(item);
}

function qualityScore(idea) {
  const quality = Number(idea.qualityScore || 0);
  const confidence = normalise(idea.extractionConfidence);
  let score = Math.round(quality / 12);
  if (confidence.includes('high')) score += 5;
  if (confidence.includes('medium')) score += 2;
  return score;
}

function buildRecord(idea, ordinal) {
  const stageId = idea.stageBucket || 'section_identity';
  const promptKey = idea._promptKey || normaliseIdeaPromptKey(idea);
  const tags = idea._indexTags?.length ? idea._indexTags : deriveIndexTags(idea, stageId);
  const blob = idea._blob || normalise([
    idea.prompt,
    idea.neonOrbitUse,
    idea.category,
    idea.useCase,
    ...(idea.tags || []),
    ...(idea.instrumentFocus || []),
    ...(idea.domainHints || []),
    ...(idea.gearHints || []),
    idea.sourceBook,
    idea.sourceAuthor,
    idea.wizardStage,
    idea.wizardStageDisplay,
  ].filter(Boolean).join(' '));

  return {
    idea,
    id: idea.id,
    key: idea._indexKey || `${idea.id || 'idea'}::${idea.globalIndex || ordinal}`,
    stageId,
    promptKey,
    tags,
    tagSet: new Set(tags.map(normalise)),
    domains: idea.domainHints || [],
    gear: idea.gearHints || [],
    instruments: idea.instrumentFocus || [],
    sourceBook: idea.sourceBook || 'Unknown source',
    bookNumber: idea.bookNumber || '',
    blob,
    clarity: Number.isFinite(Number(idea._clarityScore)) ? Number(idea._clarityScore) : ideaClarityScore(idea),
    quality: qualityScore(idea),
  };
}

export function getIdeaIndex(ideas = []) {
  if (INDEX_CACHE.has(ideas)) return INDEX_CACHE.get(ideas);

  const byStage = new Map();
  const byTag = new Map();
  const byDomain = new Map();
  const byGear = new Map();
  const bySource = new Map();
  const promptGroups = new Map();
  const records = [];

  for (const idea of ideas) {
    if (!hasText(idea) || !ideaIsUsable(idea)) continue;
    const record = buildRecord(idea, records.length + 1);
    if (!record.promptKey) continue;
    records.push(record);
    addToMapArray(byStage, record.stageId, record);
    record.tags.forEach((tag) => addToMapArray(byTag, tag, record));
    record.domains.forEach((domain) => addToMapArray(byDomain, domain, record));
    record.gear.forEach((gear) => addToMapArray(byGear, gear, record));
    addToMapArray(bySource, record.sourceBook, record);
    if (!promptGroups.has(record.promptKey)) promptGroups.set(record.promptKey, []);
    promptGroups.get(record.promptKey).push(record);
  }

  const index = {
    records,
    byStage,
    byTag,
    byDomain,
    byGear,
    bySource,
    promptGroups,
    promptableCount: records.length,
    duplicatePromptGroups: [...promptGroups.values()].filter((group) => group.length > 1).length,
  };
  INDEX_CACHE.set(ideas, index);
  return index;
}

function stageRelated(stageId) {
  return STAGE_RELATED[stageId] || [];
}

function contextTags(profile = {}, stageId = '', mode = 'normal') {
  const tags = [];
  addTags(tags, STAGE_TAGS[stageId] || []);
  addTags(tags, MODE_TAGS[mode] || []);

  if (profile.pitchPath === 'raga' || profile.selectedRaga) {
    addTags(tags, ['raga', 'melody', 'drone']);
  } else if (profile.pitchWorld) {
    addTags(tags, ['scale', 'melody']);
  }

  const groove = normalise(profile.groove);
  if (groove) addTags(tags, ['rhythm', 'groove']);
  if (groove.includes('psytrance')) addTags(tags, ['bass', 'pulse', 'drive']);
  if (groove.includes('indian')) addTags(tags, ['cycle', 'raga', 'rhythm']);
  if (groove.includes('ambient')) addTags(tags, ['texture', 'drone']);
  if (groove.includes('broken')) addTags(tags, ['drums', 'space']);

  const sectionType = normalise(profile.sectionType);
  if (sectionType.includes('build') || sectionType.includes('drop')) addTags(tags, ['arrangement', 'build']);
  if (sectionType.includes('transition')) addTags(tags, ['transition']);
  if (sectionType.includes('live')) addTags(tags, ['live', 'performance']);

  for (const gear of profile.gearFocus || []) {
    if (gear === 'field_recordings') addTag(tags, 'field sound');
    else addTag(tags, gear.replace(/_/g, ' '));
  }

  if (profile.instrument) {
    const instrument = normalise(profile.instrument);
    if (instrument.includes('guitar')) addTag(tags, 'guitar');
    if (instrument.includes('microfreak')) addTag(tags, 'MicroFreak');
    if (instrument.includes('ableton')) addTag(tags, 'Ableton');
    if (instrument.includes('bass')) addTag(tags, 'bass');
    if (instrument.includes('field')) addTag(tags, 'field sound');
    if (instrument.includes('hybrid')) addTags(tags, ['guitar', 'Ableton']);
  }

  return tags;
}

function candidatePool(index, stageId, tags, mode = 'normal') {
  const pool = new Map();
  const addRecords = (records = []) => {
    for (const record of records) pool.set(record.key, record);
  };

  addRecords(index.byStage.get(normalise(stageId)));
  for (const related of stageRelated(stageId)) addRecords(index.byStage.get(normalise(related)));
  for (const tag of tags) addRecords(index.byTag.get(normalise(tag)));

  if (mode === 'gear') {
    addRecords(index.byGear.get('guitar'));
    addRecords(index.byGear.get('ableton'));
    addRecords(index.byGear.get('microfreak'));
    addRecords(index.byGear.get('sl2'));
    addRecords(index.byGear.get('ampero'));
  }

  if (mode === 'deeper' || pool.size < 90) addRecords(index.records);
  return [...pool.values()];
}

function scoreEnergy(record, profile) {
  const selected = normalise(profile.energy);
  const ideaEnergy = normalise(record.idea.energy);
  if (!selected || !ideaEnergy) return 0;
  if (ideaEnergy === selected) return 10;
  return hasAny(ideaEnergy, ENERGY_ALIASES[selected] || [selected]) ? 6 : 0;
}

function scoreSection(record, profile) {
  const sectionType = normalise(profile.sectionType);
  const useCase = normalise(record.idea.useCase);
  if (!sectionType || !useCase) return 0;
  if (useCase.includes(sectionType) || sectionType.includes(useCase)) return 14;
  const aliases = SECTION_ALIASES[sectionType] || [];
  return hasAny(useCase, aliases) ? 8 : 0;
}

function scoreTextMatches(record, profile) {
  const blob = record.blob;
  let score = 0;
  const mood = normalise(profile.mood);
  const groove = normalise(profile.groove);
  const pitch = normalise(profile.pitchWorld);
  const raga = normalise(profile.selectedRaga);
  const notes = normalise(profile.notes);

  if (mood && blob.includes(mood)) score += 7;
  if (groove && (blob.includes(groove) || tokenise(groove).some((token) => blob.includes(token)))) score += 9;
  if (pitch && (blob.includes(pitch) || blob.includes('scale') || blob.includes('mode'))) score += 5;
  if (raga && (blob.includes(raga) || blob.includes('raga'))) score += blob.includes(raga) ? 14 : 7;
  for (const token of tokenise(notes).slice(0, 5)) {
    if (blob.includes(token)) score += 2;
  }
  return score;
}

function scoreDomainsAndGear(record, profile) {
  let score = 0;
  const domainSet = new Set(record.domains);
  const gearSet = new Set(record.gear);
  for (const domain of profile.domainFilters || []) {
    if (domainSet.has(domain)) score += 4;
  }
  for (const gear of profile.gearFocus || []) {
    if (gearSet.has(gear)) score += 7;
  }
  return score;
}

function scoreTags(record, tags, mode) {
  let score = 0;
  for (const tag of tags) {
    if (record.tagSet.has(normalise(tag))) score += 5;
  }
  for (const tag of MODE_TAGS[mode] || []) {
    if (record.tagSet.has(normalise(tag))) score += 6;
  }
  return Math.min(score, 38);
}

function scoreStage(record, stageId) {
  if (record.stageId === stageId) return 42;
  if (stageRelated(stageId).includes(record.stageId)) return 18;
  return 0;
}

function isRagaRecord(record) {
  return record.tagSet.has('raga')
    || record.blob.includes('raga')
    || record.domains.includes('pitch-world')
    || [47, 48, 50].includes(Number(record.bookNumber));
}

function isStrictRagaRecord(record) {
  return record.tagSet.has('raga')
    || record.blob.includes('raga')
    || [47, 48, 50].includes(Number(record.bookNumber));
}

function isGearRecord(record) {
  if (record.gear?.length) return true;
  const gearTags = ['guitar', 'ableton', 'microfreak', 'sl-2', 'ampero', 'field sound', 'synth', 'effects'];
  if (gearTags.some((tag) => record.tagSet.has(tag))) return true;
  return ['guitar', 'ableton', 'microfreak', 'sl-2', 'slicer', 'ampero', 'pedal', 'field recording', 'effect', 'synth'].some((term) => record.blob.includes(term));
}

function scoreRecord(record, profile, stageId, tags, options = {}) {
  const mode = options.mode || 'normal';
  const recentIds = options.recentIds || new Set();
  const feedback = options.feedback || {};
  const recordFeedback = feedback[record.key] || feedback[record.id] || {};
  let score = 0;
  score += scoreStage(record, stageId);
  score += scoreTags(record, tags, mode);
  score += scoreEnergy(record, profile);
  score += scoreSection(record, profile);
  score += scoreTextMatches(record, profile);
  score += scoreDomainsAndGear(record, profile);
  score += record.quality;
  score += record.clarity;

  if ((record.idea.appSlots || []).includes('sectionWizard')) score += 7;
  if ((record.idea.appSlots || []).includes('trackBuilder')) score += 3;
  if (record.idea.prompt.length < 240) score += 5;
  if (record.idea.prompt.length > 520) score -= 8;
  if (mode === 'raga') {
    score += isRagaRecord(record) ? 28 : -22;
  }
  if (mode === 'gear') {
    score += isGearRecord(record) ? 34 : -18;
  }
  if (recordFeedback.pinned) score += 24;
  if (recordFeedback.usedAt) score -= mode === 'normal' ? 8 : 16;
  if (recordFeedback.rejected) score -= 120;
  if (recentIds.has(record.id)) score -= mode === 'normal' ? 12 : 30;
  if (options.inspiration || mode === 'fresh' || mode === 'deeper') score += Math.floor(Math.random() * 32);
  return score;
}

function withIndexMetadata(record, score, mode, tags, index) {
  const group = index.promptGroups.get(record.promptKey) || [];
  const groupedAlternates = group
    .filter((item) => item.key !== record.key)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      bookNumber: item.bookNumber,
      sourceBook: item.sourceBook,
      stageBucket: item.stageId,
    }));
  const sourceAlternates = (record.idea._sourceAlternates?.length ? record.idea._sourceAlternates : groupedAlternates).slice(0, 12);

  return {
    ...record.idea,
    _indexKey: record.key,
    _score: score,
    _indexTags: record.tags,
    _contextTags: tags,
    _contextMode: mode,
    _relatedIdeaCount: Number(record.idea._relatedIdeaCount || group.length),
    _sourceAlternates: sourceAlternates,
  };
}

export function selectContextualIdeas(ideas, profile, stageId, plan = {}, options = {}) {
  const index = getIdeaIndex(ideas);
  const mode = options.mode || (options.inspiration ? 'fresh' : 'normal');
  const tags = contextTags(profile, stageId, mode);
  const selectedIds = new Set(Object.values(plan).filter(Boolean).map((entry) => entry.id));
  const recentIds = new Set(options.recentIds || []);
  const feedback = options.feedback || {};
  const rawCandidates = candidatePool(index, stageId, tags, mode);
  const scopedCandidates = mode === 'raga'
    ? (() => {
      const selectedRaga = normalise(profile.selectedRaga);
      const selectedRagaRecords = selectedRaga
        ? rawCandidates.filter((record) => record.blob.includes(selectedRaga) || [47, 48, 50].includes(Number(record.bookNumber)))
        : [];
      if (selectedRagaRecords.length >= 3) return selectedRagaRecords;
      const strictRagaRecords = rawCandidates.filter(isStrictRagaRecord);
      if (strictRagaRecords.length >= 3) return strictRagaRecords;
      const ragaRecords = rawCandidates.filter(isRagaRecord);
      return ragaRecords.length >= 3 ? ragaRecords : rawCandidates;
    })()
    : rawCandidates;
  const candidates = scopedCandidates
    .filter((record) => !selectedIds.has(record.id))
    .filter((record) => !(feedback[record.key] || feedback[record.id] || {}).rejected)
    .map((record) => ({
      record,
      score: scoreRecord(record, profile, stageId, tags, { ...options, mode, recentIds }),
    }))
    .filter((item) => item.score >= (mode === 'deeper' || options.inspiration ? 18 : 25))
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const promptUsage = new Set();
  const sourceUsage = new Map();
  const fallback = [];

  for (const item of candidates) {
    const { record } = item;
    if (!record.promptKey || promptUsage.has(record.promptKey)) continue;

    const sourceCount = sourceUsage.get(record.sourceBook) || 0;
    const wouldCrowdSource = sourceCount >= (picked.length < 3 ? 1 : 2);
    if (wouldCrowdSource) {
      fallback.push(item);
      continue;
    }

    picked.push(withIndexMetadata(record, item.score, mode, tags, index));
    promptUsage.add(record.promptKey);
    sourceUsage.set(record.sourceBook, sourceCount + 1);
    if (picked.length >= 6) break;
  }

  for (const item of fallback) {
    if (picked.length >= 6) break;
    const { record } = item;
    if (!record.promptKey || promptUsage.has(record.promptKey)) continue;
    picked.push(withIndexMetadata(record, item.score, mode, tags, index));
    promptUsage.add(record.promptKey);
  }

  if (picked.length) return picked;

  return index.records
    .filter((record) => !selectedIds.has(record.id))
    .slice(0, 6)
    .map((record) => withIndexMetadata(record, record.clarity + record.quality, mode, tags, index));
}

export function searchIdeaIndex(ideas, query, filters = {}) {
  const index = getIdeaIndex(ideas);
  const q = normalise(query);
  const terms = tokenise(query);
  const stage = filters.stage ? normalise(filters.stage) : '';
  const domain = filters.domain ? normalise(filters.domain) : '';
  const gear = filters.gear ? normalise(filters.gear) : '';
  const tag = filters.tag ? normalise(filters.tag) : '';

  const scoped = stage && index.byStage.has(stage) ? index.byStage.get(stage) : index.records;
  const results = scoped
    .filter((record) => {
      if (domain && !record.domains.map(normalise).includes(domain)) return false;
      if (gear && !record.gear.map(normalise).includes(gear)) return false;
      if (tag && !record.tagSet.has(tag)) return false;
      if (!q) return true;
      if (record.blob.includes(q)) return true;
      return terms.every((term) => record.blob.includes(term) || record.tagSet.has(term));
    })
    .map((record) => {
      let score = record.clarity + record.quality;
      if (stage && record.stageId === filters.stage) score += 20;
      if (q && record.blob.includes(q)) score += 30;
      for (const term of terms) {
        if (record.tagSet.has(term)) score += 10;
        if (record.blob.includes(term)) score += 4;
      }
      return { record, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked = [];
  const seenPrompts = new Set();
  for (const item of results) {
    if (seenPrompts.has(item.record.promptKey)) continue;
    picked.push(withIndexMetadata(item.record, item.score, 'search', item.record.tags, index));
    seenPrompts.add(item.record.promptKey);
    if (picked.length >= 50) break;
  }
  return picked;
}
