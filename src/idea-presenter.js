import { getPitchContext } from './pitch-utils.js?v=keyfirst3.55';

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
  [/\bserial technique\b/gi, 'strict note-order rule'],
  [/\bserialism\b/gi, 'strict note-order writing'],
  [/\bnormalised amplitude\b/gi, 'even volume'],
  [/\bnormalized amplitude\b/gi, 'even volume'],
  [/\bamplitude\b/gi, 'volume'],
  [/\bglitch as visible process\b/gi, 'one clear edit or mistake that becomes part of the sound'],
  [/\bsource-hidden listening\b/gi, 'a hidden reference sound'],
  [/\bsource file discipline\b/gi, 'one clear working rule'],
  [/\borganised sound\b/gi, 'a clear sound idea'],
  [/\borganized sound\b/gi, 'a clear sound idea'],
  [/\bcircuit noise texture\b/gi, 'noisy synth texture'],
  [/\bcat[- ]sample sound world\b/gi, 'small sampled sound world'],
  [/\blistening state\b/gi, 'mood you are listening from'],
  [/\bmobile form\b/gi, 'a form that keeps moving'],
  [/\bcent-scale thinking\b/gi, 'tiny tuning differences'],
  [/\bfragments becoming mantras\b/gi, 'a short fragment that starts to feel like a mantra'],
  [/\bshort repeating pattern hypnosis\b/gi, 'a short hypnotic repeating pattern'],
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
  [/\boutside conventional melody\b/gi, 'as colour instead of a normal tune'],
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
  [/\blive drummer lock\b/gi, 'a drummer-like groove that locks in'],
  [/\bvocal or chant layer\b/gi, 'the vocal or chant layer'],
  [/\bnegative practice\b/gi, 'repeating the part badly'],
  [/\bbody message\b/gi, 'feel of the body'],
  [/\bnervous system\b/gi, 'listening body'],
  [/\bliturgical space\b/gi, 'ritual-like space'],
  [/\bposter-like layering\b/gi, 'stacked colourful layers'],
  [/\bimage-to-sound topic mapping\b/gi, 'turning an image idea into sound'],
  [/\bmusical meaning through recognisable signs\b/gi, 'a recognisable musical signal'],
  [/\bdonor topic or style component\b/gi, 'borrowed colour'],
  [/\bsignifier\b/gi, 'recognisable sound clue'],
  [/\bvisual cliché\b/gi, 'obvious visual reference'],
  [/\blistener-state intention\b/gi, 'feeling you want the listener to enter'],
  [/\bintegration device\b/gi, 'way to let the music settle'],
  [/\boverdub ghost\b/gi, 'quiet ghost layer'],
  [/\bcool-down\b/gi, 'energy release'],
  [/\btrack-ending expansion\b/gi, 'ending that opens out'],
  [/\bmemory rather than gimmick\b/gi, 'a memory-like sound, not a trick'],
  [/\baltered states of consciousness\b/gi, 'altered listening states'],
  [/\baudio-visual media\b/gi, 'sound and image work'],
  [/\belectronic system\b/gi, 'Ableton or hardware chain'],
  [/\bprimary focus\b/gi, 'main focus'],
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
    pattern: /\b12-note pattern\b|\btwelve[- ]tone\b|\bserial\b|\batonal\b/i,
    term: 'Strict note-order rule',
    meaning: 'A rule where the note order matters more than normal chord movement. You can use it gently by taking only a few notes from the order.',
    tryThis: 'Choose four notes from the pattern and turn them into a riff before attempting all twelve.',
    steps: (ctx) => [
      ctx.notes ? `Choose four notes from ${ctx.notes} and put them in one fixed order.` : 'Choose four notes and put them in one fixed order.',
      'Repeat that order as a riff, bass figure or synth line.',
      'Change rhythm, octave or tone colour before changing the note order.',
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
    pattern: /\bpitch used as colour\b|\bnormal tune\b|\bpitch as colour\b/i,
    term: 'Pitch as colour',
    meaning: 'The note does not need to behave like a singable melody. It can act like brightness, tension, shimmer or a return point.',
    tryThis: 'Hold or repeat one note and change its sound before writing a new tune.',
    steps: (ctx) => [
      `Choose one note from ${ctx.keyLabel} and repeat or hold it.`,
      'Change the sound with pickup, filter, delay, reverb, drive or envelope.',
      'Add a second note only when the colour needs direction.',
    ],
  },
  {
    pattern: /\binterlock\b|\binterlocking\b|\banswer each other\b/i,
    term: 'Interlocking parts',
    meaning: 'Two simple parts share the rhythm instead of one part doing everything.',
    tryThis: 'Let guitar play the gaps in the synth or drum pattern.',
    steps: () => [
      'Make one short rhythm with empty spaces.',
      'Put a second part only in some of those spaces.',
      'Mute either part to check that the groove still makes sense.',
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
  {
    pattern: /\binner space\b|\bquiet mind\b|\bsurrender\b/i,
    term: 'Inner space',
    meaning: 'A calmer way into the part: listen before reacting, then make one small musical move with attention.',
    tryThis: 'Mute or simplify the section briefly, then bring back only the sound that still feels necessary.',
  },
  {
    pattern: /\bresonance\b/i,
    term: 'Resonance',
    meaning: 'The way a note, room, string, delay or filter keeps vibrating after the first attack.',
    tryThis: 'Let one note ring and shape the tail with pickup choice, delay, reverb, filter or volume.',
    steps: (ctx) => [
      `Play or hold ${ctx.root} and listen to the tail before adding notes.`,
      'Choose one thing to shape the ringing sound: delay, reverb, filter, drive, pickup or volume pedal.',
      'Leave space after the note so the resonance becomes part of the phrase.',
    ],
  },
  {
    pattern: /\bduple time\b|\btriple time\b|\bmeter\b/i,
    term: 'Meter feel',
    meaning: 'The basic counting feel underneath the groove: two/four-based, three-based, or something that leans between them.',
    tryThis: 'Clap or mute-pick the pulse first, then let the drums and bass confirm where the weight lands.',
  },
  {
    pattern: /\bsilence\b|\bnear-silence\b|\babsence\b/i,
    term: 'Charged silence',
    meaning: 'A gap that feels intentional, where the listener leans in instead of feeling that the track has stopped.',
    tryThis: 'Remove a layer for one bar and let delay, room tone or a held note carry the space.',
    steps: (ctx) => [
      `Choose the layer that can disappear without losing ${ctx.keyLabel}.`,
      'Mute or thin it for one bar so the absence feels deliberate.',
      'Bring back only one sound: bass, guitar tail, field sound or a filtered drum.',
    ],
  },
  {
    pattern: /\blive drummer lock\b|\block\b|\bpocket\b/i,
    term: 'Pocket',
    meaning: 'The relaxed but steady place where the rhythm feels held together by a human body.',
    tryThis: 'Move one rhythmic layer slightly late or early, then stop when the groove feels better rather than more precise.',
  },
  {
    pattern: /\bimaginary geography\b|\bgeography\b|\bnarrative\b/i,
    term: 'Imagined place',
    meaning: 'Treat the section like a place the listener can enter: near or far, dry or spacious, crowded or open, still or moving.',
    tryThis: 'Keep the notes simple and use texture, reverb, field sound, panning or filtering to create the sense of place.',
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
  return JARGON_REPLACEMENTS
    .reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text)
    .replace(/\bshort repeating pattern hypnosis\b/gi, 'a short hypnotic repeating pattern')
    .replace(/\breal this track seed\b/gi, 'real section seed')
    .replace(/\bthis track seed\b/gi, 'section seed');
}

function sentenceCase(text) {
  const clean = text.trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function tidyReadableText(text = '') {
  return String(text || '')
    .replace(/\bthe the\b/gi, 'the')
    .replace(/\ba a\b/gi, 'a')
    .replace(/\ban an\b/gi, 'an')
    .replace(/\ba an\b/gi, 'an')
    .replace(/\ban a\b/gi, 'a')
    .replace(/\s+/g, ' ')
    .trim();
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
    /^Design a loop where creative restriction is repeated clearly enough to become identity, but shift register, how crowded it feels or tone colour every four bars\.?/i,
    'Make a short loop with one obvious rule. Keep the rule, but every four bars move it higher or lower, make it thinner or fuller, or change the tone colour.'
  );

  text = text.replace(
    /^Build a part around (.*?) as listening model: decide what the musician is listening for, what the listener should notice, and what the technology is actually changing\.?/i,
    (_match, model) => `Use ${model} as an interaction idea. Decide what each layer listens to, what the listener should notice, and which effect or clip movement changes over time.`
  );

  text = text.replace(
    /^Translate pitch outside conventional melody into a Neon Orbit (.*)$/i,
    (_match, rest) => `Use pitch as colour instead of a normal tune in a ${rest}`
  );

  text = text.replace(
    /^Create a Neon Orbit (.*?) from (.*?)$/i,
    (_match, target, source) => `Make a ${target} from ${source}`
  );

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
    .replace(/\bthe the vocal or chant layer\b/gi, 'the vocal or chant layer')
    .replace(/\bWork on the vocal or chant layer until attention becomes scattered; stop before repeating the part badly starts teaching the wrong feel of the body\.?/gi, 'Work on the vocal or chant layer only while it still feels focused. If it starts getting worse, pause, simplify, and return with a smaller move.')
    .replace(/\bThe musical decision should emerge after the listening body has softened\.?/gi, 'Let the next musical move come from calm listening.')
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
    .replace(/\s+/g, ' ');
  text = tidyReadableText(text);

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
    .replace(/^(.+?) applied to (.+)$/i, '$2, using $1')
    .replace(/\blive drummer lock\b/gi, 'a drummer-like groove that locks in')
    .replace(/\bduple time\b/gi, 'a two- or four-beat feel')
    .replace(/\bjazz improvisation as psychedelic opening\b/gi, 'a loose opening phrase with an inward psychedelic feel')
    .replace(/\bvocal or chant layer\b/gi, 'the vocal or chant layer')
    .replace(/\bthis track\b/gi, 'this part')
    .replace(/\s+/g, ' ')
    .trim();
  const clean = tidyReadableText(text);
  if (!clean) return 'the idea';
  if (clean.length <= 80) return clean;
  return `${clean.slice(0, 78).replace(/\s+\S*$/, '')}...`;
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

function actionStillCryptic(action = '') {
  const text = normalise(action);
  if (!text) return true;
  if (action.length > 300) return true;
  if (/\b(model|frame|discourse|methodology|taxonomy|nonlinear|formalise|conceptual)\b/i.test(action)) return true;
  if (/\bdecide what the musician is listening for\b/i.test(action)) return true;
  if (/\btechnology is actually changing\b/i.test(action)) return true;
  let hits = 0;
  for (const word of JARGON_WORDS) {
    if (text.includes(word)) hits += 1;
  }
  return hits >= 2;
}

function directActionFromStage(idea, stageId, profile, pitchContext, action) {
  const ctx = stepContext(idea, profile, pitchContext, action);
  const material = ctx.material === 'the core idea' ? 'one small musical idea' : ctx.material;
  const noteLine = ctx.notes ? ` Use ${ctx.notes} as the first note pool.` : '';
  const section = ctx.sectionType.toLowerCase();

  if (stageId === 'pitch_material') {
    return `Choose a small note world for the ${section}. Start with ${material}.${noteLine} Make the home note feel settled before adding more notes.`;
  }
  if (stageId === 'tempo_groove' || stageId === 'rhythmic_foundation') {
    return `Make a simple groove from ${material}. Keep the body-feel clear at ${ctx.tempo} BPM before adding detail.`;
  }
  if (stageId === 'bass_pulse') {
    return `Build the low end from ${material}. Start on ${ctx.root}, then use octave, fifth or one passing note only if the groove needs it.`;
  }
  if (stageId === 'harmony_drone') {
    return `Set a harmonic floor with ${material}. Hold ${ctx.root} as home, then add one colour note or chord tone above it.`;
  }
  if (stageId === 'motif_hook') {
    return `Turn ${material} into a small hook. Make a short phrase you can sing or play twice without needing the screen.`;
  }
  if (stageId === 'texture_layer') {
    return `Use ${material} as a texture layer. Keep it below the main idea so it adds air, grit or place without taking over.`;
  }
  if (stageId === 'movement_modulation') {
    return `Make ${material} move over time. Choose one control, pedal or Ableton parameter and change it slowly over 4 or 8 bars.`;
  }
  if (stageId === 'arrangement_arc') {
    return `Shape the ${section} with ${material}. Decide what enters, leaves or changes every 4 or 8 bars.`;
  }
  if (stageId === 'transitions') {
    return `Use ${material} to make the handoff feel intentional. Create one cue that tells the next section to arrive.`;
  }
  if (stageId === 'mix_space') {
    return `Make room for ${material}. Lower, mute or thin one competing layer before adding EQ or more effects.`;
  }
  if (stageId === 'live_translation') {
    return `Make ${material} playable live. Choose what your hands perform, what Ableton triggers, and what stays automated.`;
  }
  if (stageId === 'finish_review') {
    return `Decide whether ${material} is useful enough to keep. Save the playable version and write the next recording move.`;
  }
  return `Use ${material} as one clear move for the ${section}. Make the smallest playable version first.`;
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
  const blob = normalise([
    idea.prompt,
    idea.neonOrbitUse,
    idea.sourceConcept,
    idea.category,
    idea.useCase,
    ...(idea.tags || []),
  ].filter(Boolean).join(' '));
  if (/\bdelay|reverb|filter|drive|distortion|slicer|reverse|effect\b/.test(blob)) addTag(tags, 'effects');
  if (/\bsilence|space|room|air|reverb|wide|stereo\b/.test(blob)) addTag(tags, 'space');
  if (/\brecord|capture|resample|sample|clip|overdub\b/.test(blob)) addTag(tags, 'capture');
  if (/\benergy|lift|drop|build|release|tension|arrival\b/.test(blob)) addTag(tags, 'energy');
  if (/\bsoft|loud|quiet|mute|thin|crowded|dense|sparse\b/.test(blob)) addTag(tags, 'dynamics');
  if (/\bhands|feet|mouth|playable|perform|rehears/i.test(blob)) addTag(tags, 'hands');
  return tags.slice(0, 7);
}

function buildPlainMeaning(idea, stageId, profile, pitchContext, action, concepts) {
  const ctx = stepContext(idea, profile, pitchContext, action);
  const lead = concepts.find((concept) => concept.term !== 'Register' && concept.term !== 'Density' && concept.term !== 'Tone colour');
  if (lead) {
    return tidyReadableText(`${lead.meaning} For this ${ctx.sectionType.toLowerCase()}, use it through ${ctx.material}.`);
  }
  return tidyReadableText(`${STAGE_MEANINGS[stageId] || 'This is a practical composition move.'} Start with ${ctx.material}, make it audible, then add only what helps the section.`);
}

function cleanDirectiveStep(text = '') {
  return sentenceCase(tidyReadableText(applyGlossary(text)
    .replace(/\bUse this as the app.s entry ritual before creative generation begins\.?/gi, '')
    .replace(/\bThe musical decision should emerge after the nervous system has softened\.?/gi, 'Let the next musical move come from calm listening.')
    .replace(/\bMake the result a practical this track\b/gi, 'Make it practical')
    .replace(/\bthe app\b/gi, 'the session')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;:,]+$/, '')));
}

function directiveStepsFromAction(action = '', ctx) {
  const withoutSourceTail = action
    .replace(/\bUse this as the app.s entry ritual before creative generation begins\.?/gi, '')
    .replace(/\bMake it useful as a .*$/i, '')
    .trim();
  const parts = withoutSourceTail
    .split(/\s*;\s*|\.\s+|\b,\s*then\s+|\bthen\s+/i)
    .map(cleanDirectiveStep)
    .filter((part) => part.length > 18)
    .filter((part, index, list) => list.indexOf(part) === index)
    .slice(0, 3);

  if (parts.length >= 2) {
    return [
      ...parts.slice(0, 3),
      `Stop when the ${ctx.sectionType.toLowerCase()} feels clearer, warmer or more playable.`,
    ].slice(0, 4);
  }
  return [];
}

function buildSteps(idea, stageId, profile, pitchContext, action, concepts) {
  const keyLabel = pitchContext?.label || `${profile.keyRoot || 'D'} ${profile.pitchWorld || ''}`.trim();
  const notes = pitchContext?.notes?.slice(0, 7).join(', ');
  const ctx = stepContext(idea, profile, pitchContext, action);
  const conceptWithSteps = concepts.find((concept) => typeof concept.steps === 'function');
  if (conceptWithSteps) return conceptWithSteps.steps(ctx).slice(0, 4);
  const directiveSteps = directiveStepsFromAction(action, ctx);
  if (directiveSteps.length) return directiveSteps;

  if (stageId === 'section_identity') {
    return [
      `Name the emotional job of this ${ctx.sectionType.toLowerCase()}: warm, tense, ritual, spacious, euphoric or strange.`,
      `Choose one sound or phrase from ${ctx.material} that best carries that feeling.`,
      'Remove anything that does not support that identity yet.',
    ];
  }
  if (stageId === 'section_role') {
    return [
      `Decide where this ${ctx.sectionType.toLowerCase()} sits in the track: arrival, contrast, lift, release or bridge.`,
      `Use ${ctx.material} as the cue that makes the role obvious.`,
      'Write one sentence for what the previous section hands to this one.',
    ];
  }
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
  if (stageId === 'arrangement_arc') {
    return [
      `Choose a length for the ${ctx.sectionType.toLowerCase()}: 8, 16 or 32 bars.`,
      `Use ${ctx.material} as the thing that changes across that length.`,
      'Plan one entrance, one removal and one payoff before adding a new part.',
    ];
  }
  if (stageId === 'transitions') {
    return [
      `Choose the handoff cue: fill, mute, riser, held ${ctx.root}, delay throw or field sound.`,
      `Make ${ctx.material} point to the next section before the cut happens.`,
      'Test the last two bars into the first two bars of the next section.',
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
  if (stageId === 'finish_review') {
    return [
      `Play the ${ctx.sectionType.toLowerCase()} from start to finish without editing.`,
      `Write the keep/redo decision for ${ctx.material}.`,
      'Save the version if the next recording move is obvious.',
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

function stageActionVerb(stageId) {
  return {
    section_identity: 'Name the feeling',
    pitch_material: 'Choose the notes',
    tempo_groove: 'Set the pulse',
    section_role: 'Place the section',
    rhythmic_foundation: 'Build the groove',
    bass_pulse: 'Ground the low end',
    harmony_drone: 'Hold the centre',
    motif_hook: 'Write the hook',
    texture_layer: 'Add the colour',
    movement_modulation: 'Move one sound',
    arrangement_arc: 'Shape the bars',
    transitions: 'Make the handoff',
    mix_space: 'Clear the space',
    live_translation: 'Make it playable',
    finish_review: 'Commit the useful version',
  }[stageId] || 'Try this move';
}

function buildDoNow(stageId, ctx) {
  const section = ctx.sectionType.toLowerCase();
  if (stageId === 'pitch_material') return `Choose three to five notes for the ${section} before writing a longer line.`;
  if (stageId === 'tempo_groove' || stageId === 'rhythmic_foundation') return `Make one loop at ${ctx.tempo} BPM and let the body-feel lead.`;
  if (stageId === 'bass_pulse') return `Start on ${ctx.root}; add octave, fifth or one passing note only if the groove asks for it.`;
  if (stageId === 'harmony_drone') return `Hold ${ctx.root} as the floor and add one colour above it.`;
  if (stageId === 'motif_hook') return `Make a two-bar phrase you can sing, play, or remember after one listen.`;
  if (stageId === 'texture_layer') return 'Add one quiet texture, then mute it once to hear what it was doing.';
  if (stageId === 'movement_modulation') return 'Move one knob, pedal, send or filter over 4 or 8 bars.';
  if (stageId === 'arrangement_arc') return `Plan one entrance, one removal and one payoff for the ${section}.`;
  if (stageId === 'transitions') return 'Test the last two bars into the first two bars of the next section.';
  if (stageId === 'mix_space') return 'Mute or lower one masking layer before reaching for more processing.';
  if (stageId === 'live_translation') return 'Decide what is played by hand, launched in Ableton, and left automated.';
  if (stageId === 'finish_review') return 'Save the useful version and write the next recording move.';
  return `Make the smallest playable version of ${ctx.material}.`;
}

function buildPlayFirst(stageId, ctx) {
  const section = ctx.sectionType.toLowerCase();
  const material = ctx.material === 'the core idea' ? 'one small musical move' : ctx.material;
  const noteCue = ctx.notes ? `Notes: ${ctx.notes}. Home: ${ctx.root}.` : `Home note: ${ctx.root}.`;
  const pulseCue = `${ctx.tempo} BPM · ${ctx.groove}`;
  const common = {
    section_identity: {
      headline: `Make one 8-bar sketch that proves the ${section} mood.`,
      detail: `Use ${material} as the audible clue. Do not add a second idea until the feeling is clear.`,
      check: 'You should be able to name the section in one plain sentence.',
    },
    pitch_material: {
      headline: ctx.notes ? `Write a 2-bar phrase using only ${ctx.notes}.` : `Write a 2-bar phrase with ${ctx.root} as home.`,
      detail: `End on ${ctx.root}, repeat once, then change only the last note or rhythm.`,
      check: `${ctx.root} should feel settled before the phrase becomes clever.`,
    },
    tempo_groove: {
      headline: `Build a 4-bar loop at ${pulseCue}.`,
      detail: `Use ${material} as the thing that repeats, answers, or leaves space in the pulse.`,
      check: 'The groove should make your body move before it has extra detail.',
    },
    section_role: {
      headline: `Choose the job of this ${section}: arrival, contrast, lift, release, bridge or ending.`,
      detail: `Let ${material} announce that job with one obvious sound, rhythm or register change.`,
      check: 'The next section should know what this one is handing over.',
    },
    rhythmic_foundation: {
      headline: `Tap, mute-pick or program the main pulse for 4 bars at ${ctx.tempo} BPM.`,
      detail: `Let ${material} answer the pulse without filling every gap.`,
      check: 'Mute the extras; the rhythm should still feel held together.',
    },
    bass_pulse: {
      headline: `Start the bass on ${ctx.root}, then try octave and fifth before passing notes.`,
      detail: `Keep ${material} simple enough that kick, bass and guitar can all breathe.`,
      check: 'The low end should feel trustworthy at low volume.',
    },
    harmony_drone: {
      headline: `Hold ${ctx.root} as a drone or pedal tone for 8 bars.`,
      detail: ctx.notes ? `Add one colour note from ${ctx.notes}, then wait before adding a chord.` : `Add one colour note above it, then wait before adding a chord.`,
      check: 'The harmony should centre the section without covering the hook.',
    },
    motif_hook: {
      headline: ctx.notes ? `Make a 2-bar hook from ${ctx.notes}.` : `Make a 2-bar hook around ${ctx.root}.`,
      detail: `Use ${material} as the first shape. Repeat it once before changing it.`,
      check: 'You should remember the phrase after hearing it twice.',
    },
    texture_layer: {
      headline: 'Add one quiet colour layer for 8 bars.',
      detail: `Turn ${material} into air, grit, shimmer, room tone or a delay tail under the main idea.`,
      check: 'Mute it once; the gap should make the section feel different.',
    },
    movement_modulation: {
      headline: 'Record one slow movement over 4 or 8 bars.',
      detail: `Move one filter, delay send, drive, pan, pedal or synth control on ${material}.`,
      check: 'The sound should breathe without feeling busier.',
    },
    arrangement_arc: {
      headline: `Map the ${section} as 8, 16 or 32 bars.`,
      detail: `Use ${material} for one entrance, one removal and one payoff.`,
      check: 'The loop should feel like it travels somewhere.',
    },
    transitions: {
      headline: 'Write the last 2 bars into the first 2 bars of the next section.',
      detail: `Use ${material} as the handoff cue: fill, mute, held note, delay throw or field sound.`,
      check: 'The next section should feel invited, not pasted on.',
    },
    mix_space: {
      headline: 'Mute or lower one layer that hides the main idea.',
      detail: `Make room for ${material} before adding EQ, reverb or more effects.`,
      check: 'At low volume, pulse, low end and hook should still be easy to follow.',
    },
    live_translation: {
      headline: 'Choose one playable gesture and one reliable automated part.',
      detail: `Decide whether hands, feet, Ableton clips or hardware controls shape ${material}.`,
      check: 'You should be able to perform the move twice without panic or screen-hunting.',
    },
    finish_review: {
      headline: `Play the ${section} through once and save the useful version.`,
      detail: `Write the next recording, rehearsal or arrangement move for ${material}.`,
      check: 'Stop when the next action is obvious.',
    },
  };
  return {
    label: 'Play first',
    noteCue,
    ...(common[stageId] || {
      headline: `Make the smallest playable version of ${material}.`,
      detail: `Use it inside ${ctx.keyLabel} at ${pulseCue}, then change only one thing.`,
      check: `Keep it if the ${section} becomes clearer or more alive.`,
    }),
  };
}

function buildUseCue(stageId, ctx, tags = []) {
  if (ctx.notes && ['pitch_material', 'bass_pulse', 'harmony_drone', 'motif_hook'].includes(stageId)) {
    if (stageId === 'bass_pulse') return `${ctx.root}, octave and fifth first; borrow from ${ctx.notes} only after the pulse is clear.`;
    return `${ctx.notes}. Treat ${ctx.root} as home.`;
  }
  if (tags.includes('guitar')) return 'Guitar: choose one neck area, one articulation, and one gap for Ableton to answer.';
  if (tags.includes('Ableton')) return 'Ableton: capture one clean clip, duplicate it, then change only density or automation.';
  if (tags.includes('MicroFreak')) return 'MicroFreak: choose one oscillator and one matrix move before adding effects.';
  if (tags.includes('SL-2')) return 'SL-2: sync the pattern, pick one chop or stereo motion, and leave room for kick/bass.';
  if (tags.includes('Ampero')) return 'Ampero: save one preset move and check gain before adding more space.';
  if (tags.includes('field sound')) return 'Field sound: loop the cleanest moment quietly and decide whether it is rhythm, air or transition glue.';
  if (stageId === 'tempo_groove' || stageId === 'rhythmic_foundation') return `${ctx.groove} at ${ctx.tempo} BPM; keep one anchor simple.`;
  if (stageId === 'texture_layer' || stageId === 'mix_space') return 'Use volume, filtering and space before adding another layer.';
  return `Use ${ctx.material} as the practical starting point.`;
}

function buildListenFor(stageId, ctx, tags = []) {
  if (stageId === 'pitch_material') return `${ctx.root} should feel like home before the phrase becomes clever.`;
  if (stageId === 'tempo_groove' || stageId === 'rhythmic_foundation') return 'The groove should make you nod before it becomes detailed.';
  if (stageId === 'bass_pulse') return 'The low end should feel trustworthy and leave room for guitar.';
  if (stageId === 'harmony_drone') return 'The held sound should centre the part without covering the hook.';
  if (stageId === 'motif_hook') return 'The phrase should be memorable after two repeats.';
  if (stageId === 'texture_layer') return 'The texture should add life when unmuted and leave a useful gap when muted.';
  if (stageId === 'movement_modulation') return 'The sound should breathe without feeling busier.';
  if (stageId === 'arrangement_arc') return 'The section should travel somewhere without needing many new parts.';
  if (stageId === 'transitions') return 'The next section should feel invited, not pasted on.';
  if (stageId === 'mix_space') return 'At low volume, the pulse, low end and hook should still be easy to follow.';
  if (stageId === 'live_translation') return 'The live move should be obvious, repeatable and not steal your hands from guitar.';
  if (stageId === 'finish_review') return 'The next action should be clear enough that you can stop tweaking.';
  if (tags.includes('space')) return 'The space should feel like a place, not just a large reverb.';
  return `The ${ctx.sectionType.toLowerCase()} should feel clearer, warmer or more alive.`;
}

function buildWhyHere(stageId, ctx) {
  const section = ctx.sectionType.toLowerCase();
  if (stageId === 'section_identity') return `This gives the ${section} a reason to exist before you add parts.`;
  if (stageId === 'pitch_material') return `The note world decides what the ${section} can safely return to.`;
  if (stageId === 'tempo_groove') return `The pulse tells every later part where to sit.`;
  if (stageId === 'section_role') return `The track map needs to know what this ${section} is doing.`;
  if (stageId === 'rhythmic_foundation') return 'A stable rhythmic floor makes later colour feel intentional.';
  if (stageId === 'bass_pulse') return 'The low end carries the physical promise of the section.';
  if (stageId === 'harmony_drone') return `The drone or harmony keeps ${ctx.root} present while other sounds move.`;
  if (stageId === 'motif_hook') return 'A small hook gives the listener something to recognise through the texture.';
  if (stageId === 'texture_layer') return 'Colour matters now only if it supports the main idea.';
  if (stageId === 'movement_modulation') return 'One moving control can create evolution without clutter.';
  if (stageId === 'arrangement_arc') return 'This turns a loop into a section with direction.';
  if (stageId === 'transitions') return 'A deliberate cue keeps the track from feeling like separate loops.';
  if (stageId === 'mix_space') return 'Space decisions now prevent later parts from fighting each other.';
  if (stageId === 'live_translation') return 'Live choices now keep the idea performable, not just printable.';
  if (stageId === 'finish_review') return 'Finishing means choosing the useful version, not perfecting everything.';
  return `It supports the current ${section} decision.`;
}

export function buildIdeaPresentation(idea, profile, stageId, context = {}) {
  const pitchContext = getPitchContext(profile, context.ragaCard || null);
  let action = simplifyPrompt(idea.prompt || '');
  if (actionStillCryptic(action)) {
    action = directActionFromStage(idea, stageId, profile, pitchContext, action);
  }
  const tags = [];
  for (const tag of [...deriveIdeaTags(idea, stageId), ...(idea._indexTags || [])]) addTag(tags, tag);
  const pitchTip = buildPitchTip(stageId, pitchContext);
  const concepts = [...buildConceptNotes(idea, action), ...fallbackConcepts(idea, stageId)]
    .filter((concept, index, list) => list.findIndex((item) => item.term === concept.term) === index)
    .slice(0, 4);
  const plainMeaning = buildPlainMeaning(idea, stageId, profile, pitchContext, action, concepts);
  const ctx = stepContext(idea, profile, pitchContext, action);
  const cueTags = tags.slice(0, 7);
  if (pitchContext?.type === 'raga') addTag(cueTags, 'raga');
  if (pitchContext?.type === 'scale') addTag(cueTags, 'scale');

  return {
    title: STAGE_TITLES[stageId] || 'Try this',
    action,
    plainMeaning,
    playFirst: buildPlayFirst(stageId, ctx),
    doNow: buildDoNow(stageId, ctx),
    useCue: buildUseCue(stageId, ctx, cueTags),
    listenFor: buildListenFor(stageId, ctx, cueTags),
    whyHere: buildWhyHere(stageId, ctx),
    actionVerb: stageActionVerb(stageId),
    concepts: concepts.map(({ term, meaning, tryThis }) => ({ term, meaning, tryThis })),
    tags: cueTags,
    steps: buildSteps(idea, stageId, profile, pitchContext, action, concepts),
    pitchTip,
    sourceLine: idea.sourceBook ? `Book ${idea.bookNumber} - ${idea.sourceBook}` : 'Source trace available',
  };
}
