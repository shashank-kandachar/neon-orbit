const NOTE_LABELS = ['C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B'];

const NOTE_TO_PC = new Map([
  ['C', 0],
  ['C♯ / D♭', 1],
  ['D', 2],
  ['D♯ / E♭', 3],
  ['E', 4],
  ['F', 5],
  ['F♯ / G♭', 6],
  ['G', 7],
  ['G♯ / A♭', 8],
  ['A', 9],
  ['A♯ / B♭', 10],
  ['B', 11],
]);

const SCALE_LIBRARY = {
  Ionian: {
    intervals: ['1', '2', '3', '4', '5', '6', '7'],
    semitones: [0, 2, 4, 5, 7, 9, 11],
    feel: 'bright, settled, open',
  },
  Dorian: {
    intervals: ['1', '2', '♭3', '4', '5', '6', '♭7'],
    semitones: [0, 2, 3, 5, 7, 9, 10],
    feel: 'minor, hopeful, rolling',
  },
  Phrygian: {
    intervals: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
    semitones: [0, 1, 3, 5, 7, 8, 10],
    feel: 'dark, close, tense',
  },
  Lydian: {
    intervals: ['1', '2', '3', '♯4', '5', '6', '7'],
    semitones: [0, 2, 4, 6, 7, 9, 11],
    feel: 'floating, bright, cosmic',
  },
  Mixolydian: {
    intervals: ['1', '2', '3', '4', '5', '6', '♭7'],
    semitones: [0, 2, 4, 5, 7, 9, 10],
    feel: 'open, earthy, groove-friendly',
  },
  Aeolian: {
    intervals: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
    semitones: [0, 2, 3, 5, 7, 8, 10],
    feel: 'natural minor, shadowed, familiar',
  },
  Locrian: {
    intervals: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'],
    semitones: [0, 1, 3, 5, 6, 8, 10],
    feel: 'unstable, tense, strange',
  },
  'Melodic minor': {
    intervals: ['1', '2', '♭3', '4', '5', '6', '7'],
    semitones: [0, 2, 3, 5, 7, 9, 11],
    feel: 'minor, lifted, sleek',
  },
  'Harmonic minor': {
    intervals: ['1', '2', '♭3', '4', '5', '♭6', '7'],
    semitones: [0, 2, 3, 5, 7, 8, 11],
    feel: 'minor, dramatic, pull-to-home',
  },
  'Dorian ♭2': {
    intervals: ['1', '♭2', '♭3', '4', '5', '6', '♭7'],
    semitones: [0, 1, 3, 5, 7, 9, 10],
    feel: 'minor, smoky, raga-like',
  },
  'Lydian dominant': {
    intervals: ['1', '2', '3', '♯4', '5', '6', '♭7'],
    semitones: [0, 2, 4, 6, 7, 9, 10],
    feel: 'bright, unstable, psychedelic',
  },
  Altered: {
    intervals: ['1', '♭2', '♯2', '3', '♭5', '♯5', '♭7'],
    semitones: [0, 1, 3, 4, 6, 8, 10],
    feel: 'tense, colourful, resolving',
  },
  'Phrygian dominant': {
    intervals: ['1', '♭2', '3', '4', '5', '♭6', '♭7'],
    semitones: [0, 1, 4, 5, 7, 8, 10],
    feel: 'dark, bright-third, dramatic',
  },
  'Double harmonic': {
    intervals: ['1', '♭2', '3', '4', '5', '♭6', '7'],
    semitones: [0, 1, 4, 5, 7, 8, 11],
    feel: 'ornate, tense, ceremonial',
  },
  'Whole tone': {
    intervals: ['1', '2', '3', '♯4', '♯5', '♭7'],
    semitones: [0, 2, 4, 6, 8, 10],
    feel: 'weightless, blurred, dreamlike',
  },
  Octatonic: {
    intervals: ['1', '2', '♭3', '4', '♭5', '♭6', '6', '7'],
    semitones: [0, 2, 3, 5, 6, 8, 9, 11],
    feel: 'symmetrical, tense, patterned',
  },
  'Minor pentatonic': {
    intervals: ['1', '♭3', '4', '5', '♭7'],
    semitones: [0, 3, 5, 7, 10],
    feel: 'direct, guitar-friendly, grounded',
  },
  'Major pentatonic': {
    intervals: ['1', '2', '3', '5', '6'],
    semitones: [0, 2, 4, 7, 9],
    feel: 'open, simple, bright',
  },
};

export function getScaleInfo(profile = {}) {
  const root = profile.keyRoot || 'D';
  const scale = profile.pitchWorld || 'Dorian';
  const formula = SCALE_LIBRARY[scale];
  const rootPc = NOTE_TO_PC.get(root);

  if (!formula || rootPc === undefined || profile.selectedRaga) {
    return null;
  }

  return {
    label: `${root} ${scale}`,
    root,
    scale,
    intervals: formula.intervals,
    notes: formula.semitones.map((offset) => NOTE_LABELS[(rootPc + offset) % 12]),
    feel: formula.feel,
  };
}

export function getPitchContext(profile = {}, ragaCard = null) {
  const root = profile.keyRoot || 'D';
  if (profile.selectedRaga) {
    return {
      type: 'raga',
      label: `${root} ${profile.selectedRaga}`,
      root,
      name: profile.selectedRaga,
      notes: null,
      intervals: null,
      feel: ragaCard?.timeWindow ? `time window: ${ragaCard.timeWindow}` : 'behaviour-led',
      reminder: `Treat ${root} as Sa/home. Use the raga card for ascent, descent, important notes and phrase behaviour before adding extra notes.`,
      features: (ragaCard?.keyFeatures || []).slice(0, 2),
    };
  }

  const scaleInfo = getScaleInfo(profile);
  if (scaleInfo) {
    return {
      type: 'scale',
      ...scaleInfo,
      reminder: `Home is ${scaleInfo.root}. Useful notes: ${scaleInfo.notes.join(', ')}.`,
      features: [],
    };
  }

  return {
    type: 'open',
    label: `${root} ${profile.pitchWorld || 'open pitch world'}`,
    root,
    name: profile.pitchWorld || 'open pitch world',
    notes: null,
    intervals: null,
    feel: 'open',
    reminder: `Keep ${root} as the home note and choose only a few notes until the section has a clear centre.`,
    features: [],
  };
}

export function formatPitchSummary(profile = {}, ragaCard = null) {
  const context = getPitchContext(profile, ragaCard);
  if (context.type === 'scale') {
    return {
      heading: context.label,
      detail: `Intervals: ${context.intervals.join(' - ')}. Notes: ${context.notes.join(', ')}.`,
      tip: `${context.feel}. Start and end small phrases on ${context.root}, then let one note create tension.`,
    };
  }
  if (context.type === 'raga') {
    return {
      heading: context.label,
      detail: context.reminder,
      tip: ragaCard?.note || 'Use the raga as a behaviour card, not just a scale list.',
    };
  }
  return {
    heading: context.label,
    detail: context.reminder,
    tip: 'Start sparse. Add notes only when the section asks for them.',
  };
}
