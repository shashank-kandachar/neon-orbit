import { getPitchContext } from './pitch-utils.js?v=keyfirst3.10';

const STAGE_TITLES = {
  section_identity: 'Shape the feeling',
  pitch_material: 'Choose the note world',
  tempo_groove: 'Find the pulse',
  section_role: 'Give this section a job',
  rhythmic_foundation: 'Build the groove',
  bass_pulse: 'Ground the low end',
  harmony_drone: 'Set the harmonic floor',
  motif_hook: 'Make a small hook',
  texture_layer: 'Add colour and air',
  movement_modulation: 'Make it move',
  arrangement_arc: 'Shape the journey',
  transitions: 'Make the handoff work',
  mix_space: 'Clear some space',
  live_translation: 'Make it playable',
  finish_review: 'Capture the useful version',
};

const DOMAIN_TAGS = {
  'pitch-world': 'melody',
  'rhythm-groove': 'rhythm',
  bass: 'bass',
  'harmony-drone': 'harmony',
  guitar: 'guitar',
  'electronic-composition': 'arrangement',
  'sound-design': 'sound design',
  'sampling-field': 'field sound',
  microfreak: 'MicroFreak',
  sl2: 'SL-2',
  ampero: 'Ampero',
  'mixing-production': 'mix',
  'psychedelic-structure': 'psychedelic',
  'creative-process': 'workflow',
  'live-performance': 'live',
};

const STAGE_TAGS = {
  section_identity: ['intent'],
  pitch_material: ['melody', 'notes'],
  tempo_groove: ['rhythm', 'feel'],
  section_role: ['arrangement'],
  rhythmic_foundation: ['rhythm', 'drums'],
  bass_pulse: ['bass', 'pulse'],
  harmony_drone: ['harmony', 'drone'],
  motif_hook: ['melody', 'hook'],
  texture_layer: ['texture', 'effects'],
  movement_modulation: ['movement', 'automation'],
  arrangement_arc: ['arrangement'],
  transitions: ['transition'],
  mix_space: ['mix', 'space'],
  live_translation: ['live'],
  finish_review: ['finish'],
};

const JARGON_REPLACEMENTS = [
  [/\btwelve[- ]tone row\b/gi, 'a 12-note pattern'],
  [/\bnormalised amplitude\b/gi, 'even volume'],
  [/\bnormalized amplitude\b/gi, 'even volume'],
  [/\bamplitude\b/gi, 'volume'],
  [/\bglitch as visible process\b/gi, 'one clear edit or mistake that becomes part of the sound'],
  [/\bsource file discipline\b/gi, 'one clear working rule'],
  [/\bapp engine\b/gi, 'composition helper'],
  [/\bspectrum\b/gi, 'brightness'],
  [/\bdensity\b/gi, 'how crowded it feels'],
  [/\bobject-like\b/gi, 'solid and recognisable'],
  [/\bsituated in a place\b/gi, 'connected to a place'],
  [/\breproduction metaphor\b/gi, 'the feeling of playback or recording'],
  [/\blistening situation\b/gi, 'place the listener is imagining'],
  [/\bcomposition constraint\b/gi, 'simple composition rule'],
  [/\bpitch outside conventional melody\b/gi, 'pitch used as colour instead of a normal tune'],
  [/\btranslate pitch outside conventional melody\b/gi, 'use pitch as colour instead of a normal tune'],
  [/\blimited pitch cell\b/gi, 'a tiny group of notes'],
  [/\bpitch cell\b/gi, 'small note group'],
  [/\bparallel organum\b/gi, 'a second line moving beside the main note'],
  [/\bparameter\b/gi, 'control'],
  [/\bparameters\b/gi, 'controls'],
  [/\bgranular processing\b/gi, 'tiny chopped fragments'],
  [/\bgranular\b/gi, 'tiny chopped fragments'],
  [/\bpolyrhythm\b/gi, 'two pulses at once'],
  [/\bostinato\b/gi, 'short repeating pattern'],
  [/\bresample\b/gi, 'record the sound back into Ableton'],
  [/\bresampling\b/gi, 'recording the sound back into Ableton'],
  [/\bautomation\b/gi, 'movement over time'],
  [/\bmodulation\b/gi, 'slow sound movement'],
  [/\btimbre\b/gi, 'tone colour'],
  [/\btetrachord\b/gi, 'four-note area'],
  [/\bmotivic\b/gi, 'small-hook'],
  [/\bchalan\b/gi, 'typical raga movement'],
  [/\bpakad\b/gi, 'signature raga phrase'],
  [/\baroha\b/gi, 'ascent'],
  [/\bavaroha\b/gi, 'descent'],
];

const JARGON_WORDS = [
  'amplitude',
  'atonal',
  'chalan',
  'combinatorial',
  'granular',
  'hexachord',
  'modulation matrix',
  'normalised',
  'normalized',
  'organum',
  'parameter',
  'serial',
  'spectral',
  'tetrachord',
  'twelve-tone',
];

function normalise(value = '') {
  return String(value)
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normaliseIdeaPromptKey(idea) {
  return normalise(idea?.prompt || '').replace(/[^\w\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripSourcePreamble(text) {
  return text
    .replace(/^Using .*? as the source,\s*/i, '')
    .replace(/^Using .*? especially .*?,\s*/i, '')
    .replace(/^Create a mixing or arrangement check from .*?:\s*/i, '')
    .replace(/^Derive a live-electronic rehearsal cue from .*?:\s*/i, '')
    .replace(/^Create a Neon Orbit section where\s+/i, '')
    .replace(/^Transform a Neon Orbit section where\s+/i, '')
    .replace(/\bMake the result a practical Neon Orbit\b/gi, 'Make it useful as a')
    .replace(/\bNeon Orbit\b/g, 'this track');
}

function applyGlossary(text) {
  return JARGON_REPLACEMENTS.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

function sentenceCase(text) {
  const clean = text.trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function keepShort(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const selected = sentences.slice(0, 2).join(' ');
  if (selected.length <= 240) return selected;
  return `${selected.slice(0, 237).trim()}...`;
}

function simplifyPrompt(rawPrompt = '') {
  let text = stripSourcePreamble(rawPrompt);

  text = text.replace(
    /^(Write|Make|Develop) a part for (.*?) that uses (.*?) as a constraint, then make one deliberate exception near the end of the section\./i,
    (_match, verb, part, constraint) => `${verb} a simple ${part} part from ${constraint}. Near the end, break the pattern once so the ear wakes up.`
  );

  text = text.replace(
    /^(.*?) controls the first decision, then let (.*?) create the psychedelia\./i,
    (_match, first, second) => `Start with ${first}. Keep the first decision simple, then let ${second} create the psychedelic feeling.`
  );

  text = text.replace(
    /^Turn (.*?) into (.*?):/i,
    (_match, source, result) => `Use ${source} to make ${result}:`
  );

  text = applyGlossary(text);
  text = text
    .replace(/Write a rule for composition helper based on (.*?):/i, (_match, rule) => `Use ${rule}:`)
    .replace(/Let one clear edit or mistake that becomes part of the sound guide/i, 'Let one clear edit or mistake become part of the sound and guide')
    .replace(/it may change only one of pitch, rhythm, brightness, how crowded it feels or space each phrase/gi, 'change only one thing each phrase: notes, rhythm, brightness, crowdedness or space')
    .replace(/\bgovern\b/gi, 'guide')
    .replace(/\baccording to that frame\b/gi, 'to match that imagined place')
    .replace(/\bsection\b/gi, 'part')
    .replace(/\bthis track exercise\b/gi, 'short exercise')
    .replace(/\bshort this track exercise\b/gi, 'short exercise')
    .replace(/\butilise\b/gi, 'use')
    .replace(/\bprioritise\b/gi, 'focus on')
    .replace(/\bprioritize\b/gi, 'focus on')
    .replace(/\s+/g, ' ')
    .trim();

  return sentenceCase(keepShort(text));
}

function clarityPenalty(prompt = '') {
  const text = normalise(prompt);
  let penalty = 0;
  for (const word of JARGON_WORDS) {
    if (text.includes(word)) penalty += 4;
  }
  if (/^using .*? as the source/.test(text)) penalty += 4;
  if (text.length > 340) penalty += 8;
  if (text.length > 520) penalty += 12;
  if (text.includes(' — ') && text.includes(' as the source')) penalty += 3;
  return penalty;
}

export function ideaClarityScore(idea) {
  const prompt = idea?.prompt || '';
  if (!prompt.trim()) return -100;
  let score = 12 - clarityPenalty(prompt);
  const blob = normalise([
    prompt,
    idea.neonOrbitUse,
    ...(idea.instrumentFocus || []),
    ...(idea.domainHints || []),
    ...(idea.gearHints || []),
  ].filter(Boolean).join(' '));

  if (blob.includes('guitar')) score += 3;
  if (blob.includes('ableton')) score += 2;
  if (blob.includes('drum') || blob.includes('groove') || blob.includes('rhythm')) score += 2;
  if (blob.includes('bass') || blob.includes('drone') || blob.includes('melody')) score += 2;
  if (prompt.length < 260) score += 3;
  return Math.max(-40, Math.min(20, score));
}

export function ideaIsUsable(idea) {
  const prompt = idea?.prompt || '';
  if (!prompt.trim()) return false;
  if (normalise(prompt) === 'null') return false;
  if (prompt.length < 24) return false;
  return ideaClarityScore(idea) > -28;
}

function addTag(tags, tag) {
  if (tag && !tags.includes(tag)) tags.push(tag);
}

export function deriveIdeaTags(idea = {}, stageId = '') {
  const tags = [];
  for (const tag of STAGE_TAGS[stageId] || []) addTag(tags, tag);
  for (const domain of idea.domainHints || []) addTag(tags, DOMAIN_TAGS[domain] || domain);
  for (const gear of idea.gearHints || []) addTag(tags, gear.replace('_', ' '));
  for (const instrument of idea.instrumentFocus || []) {
    const clean = normalise(instrument);
    if (clean.includes('guitar')) addTag(tags, 'guitar');
    if (clean.includes('drum') || clean.includes('percussion')) addTag(tags, 'drums');
    if (clean.includes('bass')) addTag(tags, 'bass');
    if (clean.includes('field')) addTag(tags, 'field sound');
    if (clean.includes('synth')) addTag(tags, 'synth');
    if (clean.includes('voice') || clean.includes('vocal')) addTag(tags, 'voice');
  }
  return tags.slice(0, 7);
}

function buildSteps(stageId, profile, pitchContext) {
  const keyLabel = pitchContext?.label || `${profile.keyRoot || 'D'} ${profile.pitchWorld || ''}`.trim();
  const notes = pitchContext?.notes?.slice(0, 7).join(', ');

  if (stageId === 'pitch_material' || stageId === 'motif_hook') {
    return [
      notes ? `Use only these notes first: ${notes}.` : `Keep ${keyLabel} as the centre and choose three notes before adding more.`,
      'Make a 2-bar phrase you can sing or play on guitar.',
      'Repeat it once, then change one note or rhythm at the end.',
    ];
  }
  if (stageId === 'bass_pulse') {
    return [
      `Start the bass on ${profile.keyRoot || 'D'} and let it feel like home.`,
      'Use the fifth or octave before adding passing notes.',
      'Leave space for the kick and the low part of the guitar.',
    ];
  }
  if (stageId === 'harmony_drone') {
    return [
      `Hold ${profile.keyRoot || 'D'} as a drone or pedal tone.`,
      'Add one colour note above it, then listen before adding a chord.',
      'Keep the pad or guitar sustain quiet enough to leave room.',
    ];
  }
  if (stageId === 'rhythmic_foundation' || stageId === 'tempo_groove') {
    return [
      `Make one loop at ${profile.tempo || 110} BPM.`,
      `Let it lean towards ${profile.groove || 'a simple pulse'}.`,
      'Mute everything else and check whether your body wants to move.',
    ];
  }
  if (stageId === 'texture_layer') {
    return [
      'Pick one texture: field sound, noise, shimmer, delay tail or voice.',
      'Keep it quieter than the main groove.',
      'Bring it in for contrast, then remove it once to feel the gap.',
    ];
  }
  if (stageId === 'movement_modulation') {
    return [
      'Choose one control to move slowly.',
      'Record or draw that movement over 4 or 8 bars.',
      'Stop before the part starts sounding busy.',
    ];
  }
  if (stageId === 'mix_space') {
    return [
      'Mute one layer and check if the part gets stronger.',
      'Keep the kick, bass and main hook out of each other’s way.',
      'Lower texture before you add EQ.',
    ];
  }
  if (stageId === 'live_translation') {
    return [
      'Decide what your hands actually do live.',
      'Leave one thing automated and one thing playable.',
      'Make the change obvious enough for the audience to feel.',
    ];
  }
  return [
    'Try the idea for 4 or 8 bars.',
    'Change only one thing at a time.',
    'Keep it only if the part becomes clearer, warmer or more alive.',
  ];
}

function buildPitchTip(stageId, pitchContext) {
  if (!pitchContext) return '';
  const pitchStages = ['pitch_material', 'bass_pulse', 'harmony_drone', 'motif_hook'];
  if (!pitchStages.includes(stageId)) return '';
  if (pitchContext.type === 'scale' && pitchContext.notes) {
    return `${pitchContext.label}: ${pitchContext.intervals.join(' - ')}. Notes: ${pitchContext.notes.join(', ')}.`;
  }
  return pitchContext.reminder;
}

export function buildIdeaPresentation(idea, profile, stageId, context = {}) {
  const pitchContext = getPitchContext(profile, context.ragaCard || null);
  const action = simplifyPrompt(idea.prompt || '');
  const tags = deriveIdeaTags(idea, stageId);
  const pitchTip = buildPitchTip(stageId, pitchContext);

  return {
    title: STAGE_TITLES[stageId] || 'Try this',
    action,
    tags,
    steps: buildSteps(stageId, profile, pitchContext),
    pitchTip,
    sourceLine: idea.sourceBook ? `Book ${idea.bookNumber} - ${idea.sourceBook}` : 'Source trace available',
  };
}
