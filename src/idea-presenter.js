import { getPitchContext } from './pitch-utils.js?v=keyfirst3.26';

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
  [/\bsource-hidden listening\b/gi, 'a hidden reference sound'],
  [/\bsource file discipline\b/gi, 'one clear working rule'],
  [/\borganised sound\b/gi, 'a clear sound idea'],
  [/\borganized sound\b/gi, 'a clear sound idea'],
  [/\bcircuit noise texture\b/gi, 'noisy synth texture'],
  [/\bfragments becoming mantras\b/gi, 'a short fragment that starts to feel like a mantra'],
  [/\bwithheld drop\b/gi, 'delayed drop'],
  [/\bParallel Harmony\b/g, 'Move the same chord shape in parallel'],
  [/\braga-rock\b/gi, 'raga-inspired'],
  [/\bdonor topic or style component\b/gi, 'borrowed colour'],
  [/\btransducer type, pickup pattern, and frequency response\b/gi, 'how the mic hears the sound and how bright it is'],
  [/\bbeginner-clear engineering logic\b/gi, 'simple engineering logic'],
  [/\bconsumer-level tool\b/gi, 'simple everyday tool'],
  [/\bpassive consumption\b/gi, 'passive listening'],
  [/\bflat dynamics\b/gi, 'lifeless dynamics'],
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

const STAGE_MEANINGS = {
  section_identity: 'This is about deciding what the section should feel like and what job it does in the track.',
  pitch_material: 'This is about choosing a small note world before adding more melody.',
  tempo_groove: 'This is about making the pulse feel good before decorating it.',
  section_role: 'This is about giving the section a clear function in the larger song.',
  rhythmic_foundation: 'This is about building the body of the groove first.',
  bass_pulse: 'This is about making the low end feel stable, intentional and playable.',
  harmony_drone: 'This is about giving the section a home note, chord colour or sustained floor.',
  motif_hook: 'This is about making one small phrase memorable enough to return to.',
  texture_layer: 'This is about adding atmosphere without covering the main musical idea.',
  movement_modulation: 'This is about making one sound evolve slowly instead of adding more parts.',
  arrangement_arc: 'This is about shaping how the section changes over time.',
  transitions: 'This is about making the entrance or exit feel deliberate.',
  mix_space: 'This is about clearing room so the important parts can be heard.',
  live_translation: 'This is about deciding what you can actually perform with hands, pedals, clips or hardware.',
  finish_review: 'This is about saving the useful version and deciding what to keep.',
};

const CONCEPT_GLOSSARY = [
  {
    pattern: /\bcreative restriction\b|\brestriction\b|\bconstraint\b/i,
    term: 'Creative restriction',
    meaning: 'A simple rule that gives the part identity, like using only three notes, one rhythm, one pedal tone or one sound source.',
    tryThis: 'Choose one rule and make it obvious enough that the listener can recognise it.',
    steps: (ctx) => [
      ctx.notes ? `Choose one rule: use only ${ctx.notes}, one rhythm, or one sound.` : 'Choose one rule: three notes, one rhythm, one chord shape or one sound.',
      `Repeat ${ctx.material} until the rule feels like the identity of the part.`,
      'Every four bars, change register, crowdedness or tone colour while keeping the rule intact.',
    ],
  },
  {
    pattern: /\bgamelan\b|\blistening model\b/i,
    term: 'Gamelan as listening model',
    meaning: 'Use gamelan as an interaction idea, not as a costume: parts listen, interlock and answer each other.',
    tryThis: 'Make guitar, synth and Ableton parts respond to each other instead of all playing lead at once.',
    steps: () => [
      'Choose what each layer listens to: guitar answers drums, synth answers guitar, or Ableton answers both.',
      'Make one short interlocking pattern instead of one busy lead line.',
      'Use technology to change the relationship: delay, panning, filtering or clip timing.',
    ],
  },
  {
    pattern: /\bregister\b/i,
    term: 'Register',
    meaning: 'How high or low the same idea is played.',
    tryThis: 'Move the phrase up or down an octave before changing the notes.',
  },
  {
    pattern: /\bdensity\b|\bcrowded\b|\bcrowdedness\b/i,
    term: 'Density',
    meaning: 'How full or crowded the music feels.',
    tryThis: 'Remove notes, layers or delay repeats until the main idea is easy to hear.',
  },
  {
    pattern: /\btone colour\b|\btimbre\b|\bbrightness\b/i,
    term: 'Tone colour',
    meaning: 'The character of the sound: bright, dark, nasal, soft, noisy, clean or distorted.',
    tryThis: 'Change pickup, filter, drive, envelope, reverb or delay colour before writing a new part.',
  },
  {
    pattern: /\braga\b|\bsa\b|\bpakad\b|\bchalan\b|\baroha\b|\bavaroha\b/i,
    term: 'Raga behaviour',
    meaning: 'A raga is a way of moving, returning and emphasising notes, not just a scale list.',
    tryThis: 'Treat the tonic as Sa/home, use a drone, and make short phrases return home before adding more notes.',
    steps: (ctx) => [
      `Hold ${ctx.root} as Sa/home with bass, drone, pad or guitar harmonics.`,
      ctx.notes ? `Write one phrase using only ${ctx.notes}.` : 'Write one small phrase and make it return to Sa.',
      'Repeat the phrase, then change the ending note or direction rather than adding a new scale.',
    ],
  },
  {
    pattern: /\bdrone\b|\bpedal tone\b/i,
    term: 'Drone',
    meaning: 'A held home note that makes the melody feel centred.',
    tryThis: 'Hold the tonic under the part, then let the melody move away and return.',
    steps: (ctx) => [
      `Hold ${ctx.root} quietly underneath the part.`,
      'Put one moving note or guitar phrase above it.',
      'Only add a chord if the drone still feels like home.',
    ],
  },
  {
    pattern: /\bostinato\b|\brepeating pattern\b|\bloop\b|\bmantra\b/i,
    term: 'Repeating cell',
    meaning: 'A short pattern that becomes hypnotic because it returns again and again.',
    tryThis: 'Make the pattern small enough to repeat without becoming tiring.',
    steps: (ctx) => [
      `Make a one- or two-bar pattern at ${ctx.tempo} BPM.`,
      'Repeat it four times without changing the notes.',
      'On the fourth repeat, change only the accent, last note or sound colour.',
    ],
  },
  {
    pattern: /\bfield recording\b|\broom noise\b|\beveryday sound\b/i,
    term: 'Field sound',
    meaning: 'A real-world recording used as atmosphere, rhythm, texture or glue.',
    tryThis: 'Use it quietly first, then decide whether it should become rhythm, air or a transition.',
    steps: () => [
      'Choose one field sound and loop the cleanest few seconds.',
      'High-pass or lower it until it supports the groove instead of masking it.',
      'Mute it once in the section so you can feel what it was adding.',
    ],
  },
  {
    pattern: /\bautomation\b|\bmodulation\b|\bmacro\b|\bfilter\b/i,
    term: 'Movement over time',
    meaning: 'One control changes slowly so the sound breathes without adding a new part.',
    tryThis: 'Move one knob, macro, pedal or effect parameter over 4 or 8 bars.',
    steps: () => [
      'Choose one control: filter, delay send, reverb size, drive, pan or wavetable shape.',
      'Record one slow movement over 4 or 8 bars.',
      'Keep it if the part moves without feeling busier.',
    ],
  },
  {
    pattern: /\bpolyrhythm\b|\bcycle\b|\bcyclic\b/i,
    term: 'Cycle against cycle',
    meaning: 'Two repeating lengths run together, creating motion when their accents meet in different places.',
    tryThis: 'Keep one pulse simple and let only one layer cycle across it.',
    steps: (ctx) => [
      `Keep the main pulse clear at ${ctx.tempo} BPM.`,
      'Make one secondary pattern with a different length or accent cycle.',
      'Mark the return point clearly so the groove feels intentional.',
    ],
  },
  {
    pattern: /\bparallel harmony\b|\bparallel\b|\bmove the same chord shape\b/i,
    term: 'Parallel movement',
    meaning: 'Move the same chord shape or interval shape around instead of changing chord type each time.',
    tryThis: 'Slide one voicing through the chosen notes and listen for the colour.',
    steps: (ctx) => [
      ctx.notes ? `Pick two or three notes from ${ctx.notes} as a shape.` : 'Pick a small chord shape or interval shape.',
      'Move that same shape to a new position without redesigning it.',
      'Keep the move that makes the hook clearer or stranger in a useful way.',
    ],
  },
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
  const clipped = selected
    .slice(0, 237)
    .replace(/\s+\S*$/, '')
    .replace(/\bthen$/i, '')
    .trim();
  return `${clipped}...`;
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
    .replace(/\bcurrent this track track\b/gi, 'this track')
    .replace(/\bthis track track\b/gi, 'this track')
    .replace(/\bcurrent this track\b/gi, 'this track')
    .replace(/\bthe this track\b/gi, 'this track')
    .replace(/\ba intro\b/gi, 'an intro')
    .replace(/\ba outro\b/gi, 'an outro')
    .replace(/\ba interlude\b/gi, 'an interlude')
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

function cleanMaterial(value = '') {
  const text = applyGlossary(String(value || ''))
    .replace(/[_-]+/g, ' ')
    .replace(/\bthis track\b/gi, 'this part')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 'the idea';
  if (text.length <= 80) return text;
  return `${text.slice(0, 78).replace(/\s+\S*$/, '')}...`;
}

function extractMaterial(idea = {}, action = '') {
  const sourceConcept = cleanMaterial(idea.sourceConcept || '');
  if (sourceConcept && sourceConcept !== 'the idea') return sourceConcept;
  const text = `${action || ''} ${idea.prompt || ''}`;
  const patterns = [
    /\baround ([^.;:]+)/i,
    /\busing ([^.;:]+)/i,
    /\buse ([^.;:]+)/i,
    /\bwith ([^.;:]+)/i,
    /\btake the ([^.;:]+)/i,
    /\bbased on ([^.;:]+)/i,
    /\bfrom ([^.;:]+)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanMaterial(match[1]);
  }
  return 'the core idea';
}

function stepContext(idea, profile, pitchContext, action) {
  const notes = pitchContext?.notes?.slice(0, 7).join(', ') || '';
  return {
    material: extractMaterial(idea, action),
    root: pitchContext?.root || profile.keyRoot || 'D',
    notes,
    keyLabel: pitchContext?.label || `${profile.keyRoot || 'D'} ${profile.pitchWorld || ''}`.trim(),
    tempo: profile.tempo || 110,
    groove: profile.groove || 'a simple pulse',
    sectionType: profile.sectionType || 'section',
  };
}

function buildConceptNotes(idea = {}, action = '') {
  const text = `${idea.prompt || ''} ${idea.neonOrbitUse || ''} ${action}`.toLowerCase();
  const concepts = [];
  for (const entry of CONCEPT_GLOSSARY) {
    if (entry.pattern.test(text)) {
      concepts.push({
        term: entry.term,
        meaning: entry.meaning,
        tryThis: entry.tryThis,
        steps: entry.steps,
      });
    }
  }
  return concepts.slice(0, 4);
}

function fallbackConcepts(idea = {}, stageId = '') {
  const concepts = [];
  const tags = deriveIdeaTags(idea, stageId);
  if (tags.includes('melody')) {
    concepts.push({
      term: 'Melodic cell',
      meaning: 'A small group of notes that can become a phrase, hook or riff.',
      tryThis: 'Choose two to five notes before writing a longer line.',
    });
  }
  if (tags.includes('rhythm')) {
    concepts.push({
      term: 'Groove decision',
      meaning: 'The one rhythmic choice that makes the body understand the part.',
      tryThis: 'Decide where the weight is before adding percussion detail.',
    });
  }
  if (tags.includes('texture') || tags.includes('sound design')) {
    concepts.push({
      term: 'Texture',
      meaning: 'The layer that gives air, grit, shimmer or place without needing to be the main hook.',
      tryThis: 'Keep it quieter than the part you want the listener to follow.',
    });
  }
  return concepts.slice(0, 2);
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

function buildPlainMeaning(idea, stageId, profile, pitchContext, action, concepts) {
  const ctx = stepContext(idea, profile, pitchContext, action);
  const lead = concepts.find((concept) => concept.term !== 'Register' && concept.term !== 'Density' && concept.term !== 'Tone colour');
  if (lead) {
    return `${lead.meaning} For this ${ctx.sectionType.toLowerCase()}, use it through ${ctx.material}.`;
  }
  return `${STAGE_MEANINGS[stageId] || 'This is a practical composition move.'} Start with ${ctx.material}, make it audible, then add only what helps the section.`;
}

function buildSteps(idea, stageId, profile, pitchContext, action, concepts) {
  const keyLabel = pitchContext?.label || `${profile.keyRoot || 'D'} ${profile.pitchWorld || ''}`.trim();
  const notes = pitchContext?.notes?.slice(0, 7).join(', ');
  const ctx = stepContext(idea, profile, pitchContext, action);
  const conceptWithSteps = concepts.find((concept) => typeof concept.steps === 'function');
  if (conceptWithSteps) return conceptWithSteps.steps(ctx).slice(0, 4);

  if (stageId === 'pitch_material' || stageId === 'motif_hook') {
    return [
      notes ? `Use only these notes first: ${notes}.` : `Keep ${keyLabel} as the centre and choose three notes before adding more.`,
      'Make a 2-bar phrase you can sing or play on guitar.',
      'Repeat it once, then change one note or rhythm at the end.',
    ];
  }
  if (stageId === 'bass_pulse') {
    return [
      `Start the bass on ${ctx.root} and keep ${ctx.material} simple.`,
      'Use the fifth or octave before adding passing notes.',
      `Leave a pocket for ${ctx.groove.toLowerCase()} and the low part of the guitar.`,
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
      `Use ${ctx.material} as the thing that repeats or answers the pulse.`,
    ];
  }
  if (stageId === 'texture_layer') {
    return [
      `Turn ${ctx.material} into one texture: field sound, noise, shimmer, delay tail or voice.`,
      'Keep it quieter than the main groove.',
      'Bring it in for contrast, then remove it once to feel the gap.',
    ];
  }
  if (stageId === 'movement_modulation') {
    return [
      `Choose one control that changes ${ctx.material}: filter, delay, drive, pan or envelope.`,
      'Record or draw that movement over 4 or 8 bars.',
      'Stop before the part starts sounding busy.',
    ];
  }
  if (stageId === 'mix_space') {
    return [
      `Mute the layer most likely to hide ${ctx.material}.`,
      'Keep the kick, bass and main hook out of each other’s way.',
      'Lower texture before you add EQ.',
    ];
  }
  if (stageId === 'live_translation') {
    return [
      `Decide how your hands trigger or shape ${ctx.material} live.`,
      'Leave one thing automated and one thing playable.',
      'Make the change obvious enough for the audience to feel.',
    ];
  }
  return [
    `Make the smallest playable version of ${ctx.material}.`,
    'Choose one audible change that proves the idea is working.',
    `Keep it only if it makes the ${ctx.sectionType.toLowerCase()} clearer or more alive.`,
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
  const tags = [];
  for (const tag of [...deriveIdeaTags(idea, stageId), ...(idea._indexTags || [])]) addTag(tags, tag);
  const pitchTip = buildPitchTip(stageId, pitchContext);
  const concepts = [...buildConceptNotes(idea, action), ...fallbackConcepts(idea, stageId)]
    .filter((concept, index, list) => list.findIndex((item) => item.term === concept.term) === index)
    .slice(0, 4);
  const plainMeaning = buildPlainMeaning(idea, stageId, profile, pitchContext, action, concepts);

  return {
    title: STAGE_TITLES[stageId] || 'Try this',
    action,
    plainMeaning,
    concepts: concepts.map(({ term, meaning, tryThis }) => ({ term, meaning, tryThis })),
    tags: tags.slice(0, 7),
    steps: buildSteps(idea, stageId, profile, pitchContext, action, concepts),
    pitchTip,
    sourceLine: idea.sourceBook ? `Book ${idea.bookNumber} - ${idea.sourceBook}` : 'Source trace available',
  };
}
