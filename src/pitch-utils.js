const NOTE_LABELS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_LABELS_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_PC = new Map([
  ['C', 0],
  ['B#', 0],
  ['C♯ / D♭', 1],
  ['C#', 1],
  ['C♯', 1],
  ['Db', 1],
  ['D♭', 1],
  ['D', 2],
  ['D♯ / E♭', 3],
  ['D#', 3],
  ['D♯', 3],
  ['Eb', 3],
  ['E♭', 3],
  ['E', 4],
  ['Fb', 4],
  ['F', 5],
  ['E#', 5],
  ['F♯ / G♭', 6],
  ['F#', 6],
  ['F♯', 6],
  ['Gb', 6],
  ['G♭', 6],
  ['G', 7],
  ['G♯ / A♭', 8],
  ['G#', 8],
  ['G♯', 8],
  ['Ab', 8],
  ['A♭', 8],
  ['A', 9],
  ['A♯ / B♭', 10],
  ['A#', 10],
  ['A♯', 10],
  ['Bb', 10],
  ['B♭', 10],
  ['B', 11],
  ['Cb', 11],
]);

const INTERVAL_TO_SEMITONE = {
  '1': 0,
  '♭2': 1,
  '2': 2,
  '♯2': 3,
  '♭3': 3,
  '3': 4,
  '4': 5,
  '♯4': 6,
  '♭5': 6,
  '5': 7,
  '♯5': 8,
  '♭6': 8,
  '6': 9,
  '♭7': 10,
  '7': 11,
};

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

const RAGA_REFERENCE_LIBRARY = {
  'Ahir bhairav': {
    intervals: ['1', '♭2', '3', '4', '5', '6', '♭7'],
    note: 'Common reference: Bhairav-like flat Re with a softer flat Ni colour.',
  },
  Asavari: {
    intervals: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
    note: 'Common reference: natural Re with flat Ga, Dha and Ni.',
  },
  Bageshri: {
    intervals: ['1', '2', '♭3', '4', '5', '6', '♭7'],
    note: 'Common reference: flat Ga and flat Ni, with Pa often treated carefully.',
  },
  Bhairav: {
    intervals: ['1', '♭2', '3', '4', '5', '♭6', '7'],
    note: 'Common reference: flat Re and flat Dha give the serious morning colour.',
  },
  Bhairavi: {
    intervals: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
    note: 'Common reference: the full minor-colour set with flat Re, Ga, Dha and Ni.',
    timeWindow: 'Morning; often used as a closing raga.',
  },
  Bhupali: {
    intervals: ['1', '2', '3', '5', '6'],
    note: 'Common reference: a clear five-note major colour with no Ma or Ni.',
  },
  Durga: {
    intervals: ['1', '2', '4', '5', '6'],
    note: 'Common reference: a five-note colour with no Ga or Ni.',
  },
  Hansadhvani: {
    intervals: ['1', '2', '3', '5', '7'],
    note: 'Common reference: a bright five-note colour with a strong leading tone.',
  },
  Hindol: {
    intervals: ['1', '♭3', '♯4', '♭6', '7'],
    note: 'Common reference: a spare five-note colour with no Re or Pa.',
  },
  Kafi: {
    intervals: ['1', '2', '♭3', '4', '5', '6', '♭7'],
    note: 'Common reference: Dorian-like, with flat Ga and flat Ni.',
  },
  Khamaj: {
    intervals: ['1', '2', '3', '4', '5', '6', '♭7'],
    note: 'Common reference: major colour with flat Ni often important in descent.',
  },
  Kirvani: {
    intervals: ['1', '2', '♭3', '4', '5', '♭6', '7'],
    note: 'Common reference: harmonic-minor colour.',
  },
  Malkauns: {
    intervals: ['1', '♭3', '4', '♭6', '♭7'],
    note: 'Common reference: a deep five-note colour with no Re or Pa.',
  },
  Marva: {
    intervals: ['1', '♭2', '3', '♯4', '6', '7'],
    note: 'Common reference: no Pa; flat Re and sharp Ma create the tension.',
  },
  'Miyan ki todi': {
    intervals: ['1', '♭2', '♭3', '♯4', '5', '♭6', '7'],
    note: 'Common reference: flat Re, flat Ga, sharp Ma and flat Dha.',
  },
  Puriya: {
    intervals: ['1', '♭2', '3', '♯4', '6', '7'],
    note: 'Common reference: no Pa; flat Re and sharp Ma shape the colour.',
  },
  Purvi: {
    intervals: ['1', '♭2', '3', '♯4', '5', '♭6', '7'],
    note: 'Common reference: flat Re, sharp Ma and flat Dha.',
  },
  Yaman: {
    intervals: ['1', '2', '3', '♯4', '5', '6', '7'],
    note: 'Common reference: major colour with sharp Ma.',
  },
};

function noteLabelsFor(spelling = 'sharps') {
  return spelling === 'flats' ? NOTE_LABELS_FLAT : NOTE_LABELS_SHARP;
}

function inferSpelling(root = '', preferred = '') {
  if (preferred === 'flats' || preferred === 'sharps') return preferred;
  if (String(root).includes('b') || String(root).includes('♭')) return 'flats';
  return 'sharps';
}

export function normaliseKeyRoot(root = 'D', spelling = 'sharps') {
  const pc = NOTE_TO_PC.get(root);
  if (pc === undefined) return root;
  return noteLabelsFor(spelling)[pc];
}

export function getKeyRootOptions(spelling = 'sharps') {
  return [...noteLabelsFor(spelling)];
}

function notesFromIntervals(root, intervals = [], spelling = 'sharps') {
  const rootPc = NOTE_TO_PC.get(root);
  if (rootPc === undefined) return [];
  const labels = noteLabelsFor(spelling);
  return intervals
    .map((interval) => INTERVAL_TO_SEMITONE[interval])
    .filter((value) => value !== undefined)
    .map((offset) => labels[(rootPc + offset) % 12]);
}

function pitchPath(profile = {}) {
  return profile.pitchPath || (profile.selectedRaga ? 'raga' : 'scale');
}

function cleanRagaLine(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length > 140) return '';
  const musicalChars = (text.match(/[SRGMPDNSrgmpdns]/g) || []).length;
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  if (musicalChars < 4 || musicalChars / Math.max(letters, 1) < 0.45) return '';
  return text
    .replace(/S/g, 'Sa ')
    .replace(/R/g, 'Re ')
    .replace(/G/g, 'Ga ')
    .replace(/M/g, 'Ma ')
    .replace(/P/g, 'Pa ')
    .replace(/D/g, 'Dha ')
    .replace(/N/g, 'Ni ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getScaleInfo(profile = {}) {
  const spelling = inferSpelling(profile.keyRoot, profile.noteSpelling);
  const root = normaliseKeyRoot(profile.keyRoot || 'D', spelling);
  const scale = profile.pitchWorld || 'Dorian';
  const formula = SCALE_LIBRARY[scale];

  if (!formula || pitchPath(profile) === 'raga') {
    return null;
  }

  return {
    label: `${root} ${scale}`,
    root,
    scale,
    intervals: formula.intervals,
    notes: notesFromIntervals(root, formula.intervals, spelling),
    feel: formula.feel,
  };
}

export function getRagaInfo(profile = {}, ragaCard = null) {
  const spelling = inferSpelling(profile.keyRoot, profile.noteSpelling);
  const root = normaliseKeyRoot(profile.keyRoot || 'D', spelling);
  const name = profile.selectedRaga || '';
  const reference = RAGA_REFERENCE_LIBRARY[name] || null;
  const intervals = reference?.intervals || null;
  const notes = intervals ? notesFromIntervals(root, intervals, spelling) : null;
  const sourceAscentDescent = cleanRagaLine(ragaCard?.ascentDescent);
  const sourceOutline = cleanRagaLine(ragaCard?.melodicOutline);

  if (!name) {
    return {
      label: `${root} raga`,
      root,
      name: '',
      intervals: null,
      notes: null,
      timeWindow: '',
      sourceAscentDescent: '',
      sourceOutline: '',
      referenceNote: '',
      reminder: `Choose a raga, then treat ${root} as Sa/home.`,
      features: [],
    };
  }

  return {
    label: `${root} ${name}`,
    root,
    name,
    intervals,
    notes,
    timeWindow: reference?.timeWindow || ragaCard?.timeWindow || '',
    sourceAscentDescent,
    sourceOutline,
    referenceNote: reference?.note || '',
    reminder: `Treat ${root} as Sa/home. Use the raga card for ascent, descent, important notes and phrase behaviour before adding extra notes.`,
    features: (ragaCard?.keyFeatures || []).slice(0, 3),
  };
}

export function getSargamReference(root = 'D', spelling = 'sharps') {
  const intervals = ['1', '2', '3', '4', '5', '6', '7'];
  const names = ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni'];
  const notes = notesFromIntervals(root, intervals, spelling);
  return names.map((name, index) => ({
    name,
    interval: intervals[index],
    note: notes[index],
  }));
}

export function getPitchContext(profile = {}, ragaCard = null) {
  const spelling = inferSpelling(profile.keyRoot, profile.noteSpelling);
  const root = normaliseKeyRoot(profile.keyRoot || 'D', spelling);
  if (pitchPath(profile) === 'raga') {
    const ragaInfo = getRagaInfo(profile, ragaCard);
    return {
      type: 'raga',
      label: ragaInfo.label,
      root,
      name: ragaInfo.name,
      notes: ragaInfo.notes,
      intervals: ragaInfo.intervals,
      feel: ragaInfo.timeWindow ? `time window: ${ragaInfo.timeWindow}` : 'behaviour-led',
      reminder: ragaInfo.reminder,
      features: ragaInfo.features,
      ragaInfo,
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
    const ragaInfo = context.ragaInfo || getRagaInfo(profile, ragaCard);
    const pitchLine = ragaInfo.intervals && ragaInfo.notes
      ? `Common pitch reference: ${ragaInfo.intervals.join(' - ')}. Notes from ${ragaInfo.root} as Sa: ${ragaInfo.notes.join(', ')}.`
      : `Sargam reference from ${ragaInfo.root}: ${getSargamReference(ragaInfo.root, profile.noteSpelling).map((item) => `${item.name}=${item.note}`).join(', ')}. The source card decides which forms are used.`;
    return {
      heading: context.label,
      detail: pitchLine,
      tip: ragaInfo.referenceNote || ragaCard?.note || 'Use the raga as a behaviour card, not just a scale list.',
    };
  }
  return {
    heading: context.label,
    detail: context.reminder,
    tip: 'Start sparse. Add notes only when the section asks for them.',
  };
}
