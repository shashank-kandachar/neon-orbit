import { ideaClarityScore } from './idea-presenter.js?v=keyfirst3.23';
import { searchIdeaIndex, selectContextualIdeas } from './idea-index.js?v=keyfirst3.23';

const ENERGY_ALIASES = {
  'low': ['low', 'quiet', 'intimate', 'subtle', 'ambient'],
  'low to medium': ['low_to_medium', 'low to medium', 'subtle', 'reflective'],
  'medium': ['medium', 'balanced'],
  'medium to high': ['medium_to_high', 'medium to high', 'driving', 'evolving'],
  'high': ['high', 'club', 'peak', 'punchy', 'warehouse'],
  'evolving': ['evolving', 'variable', 'slow-bloom'],
  'wide': ['wide', 'expansive'],
  'ritual': ['ritual', 'earthy', 'communal'],
};

const STAGE_RELATED = {
  section_identity: ['section_role', 'arrangement_arc'],
  pitch_material: ['harmony_drone', 'motif_hook'],
  tempo_groove: ['rhythmic_foundation', 'bass_pulse'],
  section_role: ['arrangement_arc', 'transitions'],
  rhythmic_foundation: ['tempo_groove', 'bass_pulse', 'transitions'],
  bass_pulse: ['rhythmic_foundation', 'harmony_drone'],
  harmony_drone: ['pitch_material', 'motif_hook', 'texture_layer'],
  motif_hook: ['pitch_material', 'harmony_drone', 'texture_layer'],
  texture_layer: ['movement_modulation', 'mix_space'],
  movement_modulation: ['texture_layer', 'arrangement_arc'],
  arrangement_arc: ['section_role', 'transitions', 'finish_review'],
  transitions: ['arrangement_arc', 'live_translation'],
  mix_space: ['live_translation', 'finish_review'],
  live_translation: ['mix_space', 'finish_review'],
  finish_review: ['live_translation', 'mix_space'],
};

function normalise(value) {
  return (value || '').toString().trim().toLowerCase();
}

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

function energyScore(ideaEnergy, selectedEnergy) {
  const normSelected = normalise(selectedEnergy);
  const normIdea = normalise(ideaEnergy);
  if (!normSelected || !normIdea) return 0;
  if (normIdea === normSelected) return 10;
  const aliases = ENERGY_ALIASES[normSelected] || [normSelected];
  return aliases.some((alias) => normIdea.includes(alias)) ? 6 : 0;
}

function useCaseScore(idea, profile) {
  const useCase = normalise(idea.useCase);
  const sectionType = normalise(profile.sectionType);
  if (!useCase || !sectionType) return 0;
  if (useCase.includes(sectionType) || sectionType.includes(useCase)) return 14;
  const quickMap = {
    intro: ['intro', 'opening'],
    outro: ['outro', 'ending'],
    build: ['build', 'rise'],
    breakdown: ['breakdown', 'space'],
    transition: ['transition', 'handoff'],
    bridge: ['bridge'],
    'main groove': ['main groove', 'groove design', 'a section'],
    'verse-like section': ['verse-like', 'verse'],
    interlude: ['interlude'],
    'drop / peak': ['drop', 'peak', 'climax'],
    'live jam section': ['live jam', 'jam section'],
  };
  for (const [key, aliases] of Object.entries(quickMap)) {
    if (sectionType.includes(key) && includesAny(useCase, aliases)) return 9;
  }
  return 0;
}

function choiceKeywordScore(blob, profile) {
  let score = 0;
  const mood = normalise(profile.mood);
  const groove = normalise(profile.groove);
  const instrument = normalise(profile.instrument);
  const pitchWorld = normalise(profile.pitchWorld);
  if (mood && blob.includes(mood)) score += 8;
  if (groove && (blob.includes(groove) || groove.split(' ').some((part) => part.length > 4 && blob.includes(part)))) score += 8;
  if (instrument && (blob.includes(instrument) || instrument.split(' ').some((part) => part.length > 4 && blob.includes(part)))) score += 9;
  if (pitchWorld && (blob.includes(pitchWorld) || pitchWorld.includes('raga') && blob.includes('raga') || pitchWorld.includes('mode') && blob.includes('mode') || pitchWorld.includes('scale') && blob.includes('scale'))) score += 7;
  if (profile.selectedRaga) {
    const raga = normalise(profile.selectedRaga);
    if (blob.includes(raga)) score += 12;
    else if (blob.includes('raga')) score += 4;
  }
  return score;
}

function domainScore(idea, profile) {
  const filters = profile.domainFilters || [];
  if (!filters.length) return 0;
  const ideaDomains = idea.domainHints || [];
  return ideaDomains.reduce((sum, domain) => sum + (filters.includes(domain) ? 5 : 0), 0);
}

function gearScore(idea, profile) {
  const gearFocus = profile.gearFocus || [];
  if (!gearFocus.length) return 0;
  const hints = idea.gearHints || [];
  return hints.reduce((sum, gear) => sum + (gearFocus.includes(gear) ? 7 : 0), 0);
}

function instrumentScore(idea, profile) {
  const target = normalise(profile.instrument);
  if (!target) return 0;
  return (idea.instrumentFocus || []).reduce((sum, item) => {
    const norm = normalise(item);
    if (norm === target) return sum + 10;
    if (target.split(' ').some((part) => part.length > 4 && norm.includes(part))) return sum + 5;
    return sum;
  }, 0);
}

function stageScore(idea, stageId) {
  if (idea.stageBucket === stageId) return 38;
  return (STAGE_RELATED[stageId] || []).includes(idea.stageBucket) ? 18 : 0;
}

function appSlotScore(idea) {
  let score = 0;
  if ((idea.appSlots || []).includes('sectionWizard')) score += 5;
  if ((idea.appSlots || []).includes('trackBuilder')) score += 3;
  if ((idea.appSlots || []).includes('mixCheck')) score += 2;
  return score;
}

function qualityScore(idea) {
  const q = Number(idea.qualityScore || 0);
  const c = Number(idea.extractionConfidence || 0);
  return Math.round(q / 15) + Math.round(c / 20);
}

export function scoreIdea(idea, profile, stageId, { inspiration = false } = {}) {
  const blob = idea._blob || '';
  let score = 0;
  score += stageScore(idea, stageId);
  score += energyScore(idea.energy, profile.energy);
  score += useCaseScore(idea, profile);
  score += choiceKeywordScore(blob, profile);
  score += domainScore(idea, profile);
  score += gearScore(idea, profile);
  score += instrumentScore(idea, profile);
  score += appSlotScore(idea);
  score += qualityScore(idea);
  score += ideaClarityScore(idea);
  if (!inspiration && (blob.includes('psychedelic') || blob.includes('ambient') || blob.includes('trance') || blob.includes('drone'))) score += 2;
  if (inspiration) score += Math.floor(Math.random() * 34);
  return score;
}

export function generateStagePrompts(ideas, profile, stageId, plan = {}, options = {}) {
  return selectContextualIdeas(ideas, profile, stageId, plan, options);
}

export function searchIdeas(ideas, query, filters = {}) {
  return searchIdeaIndex(ideas, query, filters);
}

export function buildSectionSummary(profile, plan) {
  const scaleLabel = profile.selectedRaga || profile.pitchWorld || 'Pitch world';
  const keyLabel = `${profile.keyRoot || ''} ${scaleLabel}`.trim();
  return {
    title: `${profile.sectionType || 'Section'} — ${profile.mood || 'Mood'} / ${keyLabel}`,
    subtitle: `${profile.tempo || 0} BPM · ${profile.groove || 'Groove'} · ${profile.instrument || 'Instrument'}`,
    completedStages: Object.keys(plan).length,
    selectedPrompts: Object.values(plan).map((item) => item.friendly?.action || item.prompt),
  };
}
