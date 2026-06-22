import { STAGES, APP_OPTIONS, DEFAULT_PROFILE } from './config.js?v=keyfirst3.55';
import { loadBootstrapData, loadIdeas, loadIdeasForStages } from './data-loader.js?v=keyfirst3.55';
import { generateStagePrompts, searchIdeas, buildSectionSummary } from './engine.js?v=keyfirst3.55';
import { buildIdeaPresentation } from './idea-presenter.js?v=keyfirst3.55';
import { formatPitchSummary, getKeyRootOptions, getPitchContext, normaliseKeyRoot } from './pitch-utils.js?v=keyfirst3.55';
import { loadState, saveState, loadSavedPlans, savePlanSnapshot, loadIdeaFeedback, saveIdeaFeedback } from './storage.js?v=keyfirst3.55';
import { exportPlanJson, exportPlanMarkdown } from './export-utils.js?v=keyfirst3.55';

const SETUP_SCREENS = [
  { id: 'song', type: 'song', label: 'Song', blurb: 'Start fresh or reopen a saved section.' },
  { id: 'setup', type: 'setup', label: 'Setup', blurb: 'Choose the key world, pulse and section intent in one place.' },
];

const BUILD_PHASES = [
  {
    id: 'direction',
    type: 'build',
    label: 'Direction',
    blurb: 'Shape the section job, pitch use and rhythmic intention.',
    stageIds: ['section_identity', 'pitch_material', 'tempo_groove', 'section_role'],
  },
  {
    id: 'foundation',
    type: 'build',
    label: 'Foundation',
    blurb: 'Build the rhythm, bass and harmonic ground.',
    stageIds: ['rhythmic_foundation', 'bass_pulse', 'harmony_drone'],
  },
  {
    id: 'colour',
    type: 'build',
    label: 'Hooks + colour',
    blurb: 'Find a motif, add texture and make the sound move.',
    stageIds: ['motif_hook', 'texture_layer', 'movement_modulation'],
  },
  {
    id: 'arrange',
    type: 'build',
    label: 'Arrange + perform',
    blurb: 'Shape transitions, space, live translation and finish notes.',
    stageIds: ['arrangement_arc', 'transitions', 'mix_space', 'live_translation', 'finish_review'],
  },
];

const SCREENS = [...SETUP_SCREENS, ...BUILD_PHASES];
const STAGE_BY_ID = Object.fromEntries(STAGES.map((stage) => [stage.id, stage]));

const ARRANGEMENT_TEMPLATE = [
  {
    id: 'intro',
    label: 'Intro',
    purpose: 'Invite the listener into the sound world before the main body arrives.',
    cue: 'Open with the first colour, pulse fragment or drone.',
    entryCue: 'Start sparse: one place, one texture, one pitch centre.',
    exitCue: 'Let one recognisable sound lead into the main groove.',
    energy: 'Low to medium',
    accepts: ['intro'],
  },
  {
    id: 'main_groove',
    label: 'Main groove',
    purpose: 'State the body of the track clearly enough that later changes make sense.',
    cue: 'Lock the pulse, low end and main hook.',
    entryCue: 'Bring the groove in with a clear downbeat or repeated cell.',
    exitCue: 'Remove or thin one layer so the next section has somewhere to go.',
    energy: 'Medium',
    accepts: ['main groove', 'verse-like section', 'live jam section'],
  },
  {
    id: 'breakdown',
    label: 'Breakdown',
    purpose: 'Create space, contrast or a lower-energy window without losing the track identity.',
    cue: 'Strip back to drone, field sound, texture or a small motif.',
    entryCue: 'Let the groove fall away gradually or disappear for one decisive bar.',
    exitCue: 'Leave a rhythmic clue that points back to motion.',
    energy: 'Low to medium',
    accepts: ['breakdown', 'interlude'],
  },
  {
    id: 'build',
    label: 'Build',
    purpose: 'Increase pressure while keeping the listener oriented.',
    cue: 'Add motion, density or register lift in measured steps.',
    entryCue: 'Begin with the same pulse, then start one obvious rise.',
    exitCue: 'Hold back one element so the peak still feels earned.',
    energy: 'Medium to high',
    accepts: ['build', 'transition', 'bridge'],
  },
  {
    id: 'peak',
    label: 'Drop / peak',
    purpose: 'Let the strongest, most physical version of the idea arrive.',
    cue: 'Make the hook, bass and rhythm agree.',
    entryCue: 'Arrive from silence, a fill, a held note or a clear rhythmic pickup.',
    exitCue: 'Choose whether the energy releases suddenly or dissolves slowly.',
    energy: 'High',
    accepts: ['drop / peak'],
  },
  {
    id: 'outro',
    label: 'Outro',
    purpose: 'Release the energy and leave a memory of the track.',
    cue: 'Return to a reduced version, tail, drone or field trace.',
    entryCue: 'Keep only the sound that still carries the identity.',
    exitCue: 'Let the final gesture fade, ring or stop with intention.',
    energy: 'Low',
    accepts: ['outro'],
  },
];

const NEXT_SLOT_ORDER = ['main_groove', 'intro', 'breakdown', 'build', 'peak', 'outro'];

const SECTION_STATUSES = [
  { id: 'sketch', label: 'Sketch', cue: 'Worth exploring, not ready to arrange tightly yet.' },
  { id: 'usable', label: 'Usable', cue: 'Musical enough to place in the track map.' },
  { id: 'recorded', label: 'Recorded', cue: 'Audio or MIDI has been captured.' },
  { id: 'arranged', label: 'Arranged', cue: 'The section has a clear entrance, exit and length.' },
  { id: 'mixed', label: 'Mixed', cue: 'Level, space and tone are working well enough for export.' },
];

const GEAR_DOMAIN_HINTS = {
  guitar: ['guitar', 'live-performance'],
  ableton: ['electronic-composition', 'mixing-production', 'live-performance'],
  microfreak: ['microfreak', 'sound-design', 'electronic-composition'],
  sl2: ['sl2', 'rhythm-groove', 'sound-design'],
  ampero: ['ampero', 'guitar', 'mixing-production'],
  field_recordings: ['sampling-field', 'sound-design', 'psychedelic-structure'],
};

const GEAR_WORKFLOWS = {
  guitar: {
    id: 'guitar',
    label: 'Guitar',
    role: 'Playable source for riffs, drones, swells, harmonics and noisy gestures.',
    setup: [
      'Choose the job: riff, drone, texture, response line or live gesture.',
      'Pick one neck area before writing more notes.',
      'Capture a clean DI when the part matters, even if you also print pedals.',
    ],
    stages: {
      pitch_material: {
        focus: 'Fretboard map',
        steps: [
          'Map {notes} into one comfortable neck area.',
          'Keep {root} easy to return to with a drone string, bass note or repeated harmonic.',
          'Move the phrase to a second octave only after the first position feels natural.',
        ],
      },
      motif_hook: {
        focus: 'Hook under the fingers',
        steps: [
          'Make a two-bar phrase you can play without looking at the screen.',
          'Choose pick attack, muting or slide before adding more notes.',
          'Leave a gap for Ableton, synth or field sound to answer.',
        ],
      },
      texture_layer: {
        focus: 'Texture without clutter',
        steps: [
          'Use volume swells, harmonics, muted scrapes or eBow-like sustain as the texture.',
          'High-pass or lower the layer until the hook and low end stay clear.',
          'Record one dry safety pass if the pedal sound is hard to recreate.',
        ],
      },
      live_translation: {
        focus: 'Hands-on performance',
        steps: [
          'Choose one action your hands can repeat reliably: mute, swell, slide, tremolo or harmonic.',
          'Let Ableton handle the part that would steal your hands from guitar.',
          'Rehearse the entrance and exit twice before changing the sound.',
        ],
      },
    },
  },
  ableton: {
    id: 'ableton',
    label: 'Ableton',
    role: 'Clip capture, arrangement sketch, resampling, automation and live scene control.',
    setup: [
      'Decide whether this section lives first in Session View or Arrangement View.',
      'Set a clip length before recording so loops do not drift by accident.',
      'Name the scene by role: intro, groove, breakdown, build, peak or outro.',
    ],
    stages: {
      rhythmic_foundation: {
        focus: 'Clip length and groove',
        steps: [
          'Set a 1, 2, 4 or 8-bar capture length at {tempo} BPM.',
          'Record the simplest pulse first, then add groove detail in a duplicate clip.',
          'Keep one empty clip slot ready for resampling happy accidents.',
        ],
      },
      arrangement_arc: {
        focus: 'Scene to timeline',
        steps: [
          'Make one scene for the current {section}.',
          'Duplicate it before changing density, mute states or automation.',
          'Record a rough pass into Arrangement View once the section has an entrance and exit.',
        ],
      },
      movement_modulation: {
        focus: 'Automation capture',
        steps: [
          'Choose one macro, send, filter or device control to move.',
          'Record the movement over 4 or 8 bars instead of drawing many small edits.',
          'Keep the first take if the motion feels alive, then trim only the obvious mistakes.',
        ],
      },
      live_translation: {
        focus: 'Live reliability',
        steps: [
          'Choose what is launched as a clip and what is played by hand.',
          'Map only one or two controls for the section.',
          'Leave one scene that can loop safely if the live moment needs time.',
        ],
      },
    },
  },
  microfreak: {
    id: 'microfreak',
    label: 'MicroFreak',
    role: 'Character synth voice for unstable hooks, drones, arps and animated textures.',
    setup: [
      'Choose oscillator type before effects: wavetable, Karplus, harmonic, noise or granular-style source.',
      'Pick one matrix movement that the section can hear.',
      'Decide whether the arp/sequencer leads the rhythm or follows Ableton.',
    ],
    stages: {
      motif_hook: {
        focus: 'Synth phrase',
        steps: [
          'Write a small phrase from {notes} before changing oscillator type.',
          'Use pressure or cycling envelope as the expressive move.',
          'Record MIDI and audio so the sound can be edited or committed later.',
        ],
      },
      harmony_drone: {
        focus: 'Drone colour',
        steps: [
          'Hold {root} as the centre and let the oscillator provide the colour.',
          'Move one matrix amount slowly rather than opening every modulation path.',
          'Keep the drone quiet enough for guitar or bass to remain physical.',
        ],
      },
      movement_modulation: {
        focus: 'Matrix movement',
        steps: [
          'Choose one source and one destination in the matrix.',
          'Move it over 4 or 8 bars while Ableton records audio.',
          'Stop when the sound breathes without becoming a different patch.',
        ],
      },
      live_translation: {
        focus: 'Capture safely',
        steps: [
          'Decide whether MicroFreak is played live, sequenced, or sampled into Ableton.',
          'Save the patch name in the section notes before moving on.',
          'Record a fallback audio loop if the patch is unstable.',
        ],
      },
    },
  },
  sl2: {
    id: 'sl2',
    label: 'Boss SL-2',
    role: 'Sliced motion, tremolo-gate rhythm, stereo movement and transition energy.',
    setup: [
      'Choose tempo sync first so the pattern sits with the groove.',
      'Pick pattern type: pulse, chop, swing, rise, stereo motion or hard gate.',
      'Decide chain placement: before delay for rhythmic repeats, after delay for chopped space.',
    ],
    stages: {
      rhythmic_foundation: {
        focus: 'Pattern against pulse',
        steps: [
          'Sync the SL-2 to {tempo} BPM or tap it until it locks with the main groove.',
          'Choose one pattern that leaves space for kick and bass.',
          'Record 8 bars and mute it once to check whether the groove still breathes.',
        ],
      },
      movement_modulation: {
        focus: 'Stereo motion',
        steps: [
          'Use the SL-2 for one clear movement: side-to-side, chop, rise or pulse.',
          'Keep depth lower if the hook disappears.',
          'Automate or perform only one extra effect around it.',
        ],
      },
      transitions: {
        focus: 'Handoff chop',
        steps: [
          'Bring the slicer in during the last 1 or 2 bars before the next section.',
          'Increase depth or pattern intensity, then cut or release into the arrival.',
          'Record the transition as audio so the timing stays intentional.',
        ],
      },
      live_translation: {
        focus: 'Pedal move',
        steps: [
          'Choose whether SL-2 is always on for this section or only a transition move.',
          'Place the footswitch moment where your hands are not changing guitar parts.',
          'Keep a non-sliced fallback sound ready.',
        ],
      },
    },
  },
  ampero: {
    id: 'ampero',
    label: 'Ampero',
    role: 'Guitar chain, gain staging, expression control, routing and live preset recall.',
    setup: [
      'Set the chain order before sound hunting: drive, modulation, delay, reverb, utility.',
      'Check gain into Ableton so the loudest gesture does not clip.',
      'Choose one expression or MIDI move that matters for the section.',
    ],
    stages: {
      texture_layer: {
        focus: 'Chain as texture',
        steps: [
          'Build the sound from one chain idea: shimmer, tape delay, reverse, tremolo, drive or space.',
          'Lower wet mix until the guitar still feels playable.',
          'Save the preset before changing the next block.',
        ],
      },
      movement_modulation: {
        focus: 'Expression move',
        steps: [
          'Assign one expression move: delay mix, reverb size, drive, filter or volume.',
          'Perform it over 4 or 8 bars and record the result.',
          'Keep the heel/toe extremes musical so it works live.',
        ],
      },
      mix_space: {
        focus: 'Gain and space',
        steps: [
          'Check the preset at the loudest part of the section.',
          'Reduce low end before adding more reverb or delay.',
          'Leave room for bass and kick before widening the guitar.',
        ],
      },
      live_translation: {
        focus: 'Preset recall',
        steps: [
          'Name the preset after the section role, not just the sound.',
          'Write down the switch or expression move used in the section.',
          'Avoid a preset change at the same moment as a difficult guitar entrance.',
        ],
      },
    },
  },
  field_recordings: {
    id: 'field_recordings',
    label: 'Field recordings',
    role: 'Place, texture, rhythm, memory and transition glue from real-world sound.',
    setup: [
      'Choose the role: air, rhythm, place, noise bed, transition or emotional memory.',
      'Clean only what hides the music: rumble, harsh hiss or one distracting hit.',
      'Keep the original file name or source note for traceability.',
    ],
    stages: {
      texture_layer: {
        focus: 'Place without masking',
        steps: [
          'Loop the cleanest few seconds and lower it until the groove still leads.',
          'High-pass if it fights bass or kick.',
          'Mute it once in the section to check what it was adding.',
        ],
      },
      rhythmic_foundation: {
        focus: 'Everyday rhythm',
        steps: [
          'Find one repeated sound inside the recording.',
          'Slice or gate it lightly so it answers the main pulse.',
          'Keep the human timing unless it breaks the groove.',
        ],
      },
      transitions: {
        focus: 'Scene change',
        steps: [
          'Use the field sound to cover or reveal the next section.',
          'Fade, filter or reverse it over the last bar before the handoff.',
          'Let the listener feel a place change, not just an effect.',
        ],
      },
      mix_space: {
        focus: 'Noise floor control',
        steps: [
          'Remove low rumble before lowering the whole recording.',
          'Keep only the frequency area that gives place or texture.',
          'Check the section at low volume to make sure the source does not blur the hook.',
        ],
      },
    },
  },
};

const GROOVE_GUIDANCE = {
  'Straight 4/4': 'Put the kick or main pulse in the body first. Let guitar and synth answer around it instead of filling every gap.',
  'Triplet / swung': 'Let the groove lean forward. Keep one part straight so the swing feels intentional rather than loose.',
  'Off-beat pulse': 'Place the hook or slice between the main beats. Use the downbeat as a return point, not the whole story.',
  'Hypnotic ostinato': 'Choose a short repeating cell and change tone, filter or accent slowly over time.',
  Polyrhythmic: 'Keep one layer simple and let another cycle across it. Count the return point before adding more parts.',
  'Broken beat': 'Leave air around the backbeat. Let ghost notes, field sounds or muted guitar make the rhythm breathe.',
  'Downtempo roll': 'Keep the low end relaxed and warm. Use small syncopations so the section moves without rushing.',
  'Psytrance drive': 'Lock the bass and kick relationship first. Add movement above it, not clutter inside it.',
  'Ambient free pulse': 'Use repeated swells, delays or gestures as the pulse. Let tempo be felt rather than counted.',
  'Indian cyclic feel': 'Choose a cycle length and mark the return clearly. Let melodic phrases lean towards that return.',
};

const MODE_LABELS = {
  normal: 'Best fit',
  fresh: 'Fresh source',
  melody: 'More melody',
  raga: 'More raga behaviour',
  groove: 'More groove',
  rhythm: 'More rhythm',
  bass: 'More bass',
  harmony: 'More drone',
  texture: 'More texture',
  movement: 'More movement',
  arrangement: 'More arrangement',
  live: 'More live',
  finish: 'More finish',
  gear: 'More gear',
  deeper: 'Dig deeper',
};

const STAGE_REFRESH_MODES = {
  section_identity: ['arrangement', 'fresh', 'deeper'],
  pitch_material: ['melody', 'raga', 'fresh'],
  tempo_groove: ['groove', 'rhythm', 'fresh'],
  section_role: ['arrangement', 'live', 'fresh'],
  rhythmic_foundation: ['groove', 'rhythm', 'fresh'],
  bass_pulse: ['bass', 'groove', 'fresh'],
  harmony_drone: ['harmony', 'melody', 'fresh'],
  motif_hook: ['melody', 'gear', 'fresh'],
  texture_layer: ['texture', 'gear', 'fresh'],
  movement_modulation: ['movement', 'gear', 'fresh'],
  arrangement_arc: ['arrangement', 'live', 'fresh'],
  transitions: ['arrangement', 'live', 'fresh'],
  mix_space: ['texture', 'gear', 'fresh'],
  live_translation: ['live', 'gear', 'fresh'],
  finish_review: ['finish', 'arrangement', 'fresh'],
};

const STAGE_LOAD_NEIGHBOURS = {
  section_identity: ['section_role'],
  pitch_material: ['harmony_drone', 'motif_hook'],
  tempo_groove: ['rhythmic_foundation', 'bass_pulse'],
  section_role: ['section_identity', 'arrangement_arc'],
  rhythmic_foundation: ['tempo_groove', 'bass_pulse'],
  bass_pulse: ['rhythmic_foundation', 'harmony_drone'],
  harmony_drone: ['pitch_material', 'motif_hook'],
  motif_hook: ['pitch_material', 'harmony_drone'],
  texture_layer: ['movement_modulation', 'mix_space'],
  movement_modulation: ['texture_layer', 'arrangement_arc'],
  arrangement_arc: ['section_role', 'transitions'],
  transitions: ['arrangement_arc', 'live_translation'],
  mix_space: ['texture_layer', 'live_translation'],
  live_translation: ['transitions', 'mix_space'],
  finish_review: ['live_translation', 'mix_space'],
};

const STAGE_GUIDANCE = {
  section_identity: {
    decide: 'Name the emotional job before writing more material.',
    listen: 'The section should have one clear promise: warmth, tension, release, ritual, lift or stillness.',
  },
  pitch_material: {
    decide: 'Choose the few notes that will carry the section.',
    listen: 'The home note should feel obvious before the line becomes clever.',
  },
  tempo_groove: {
    decide: 'Set the body-feel of the pulse.',
    listen: 'The groove should make you nod before the arrangement gets busy.',
  },
  section_role: {
    decide: 'Give this section a practical job in the track.',
    listen: 'It should clearly introduce, deepen, lift, release, transition or close the journey.',
  },
  rhythmic_foundation: {
    decide: 'Build the rhythmic floor first.',
    listen: 'Kick, percussion, muted guitar or field sound should agree on where the weight lives.',
  },
  bass_pulse: {
    decide: 'Make the low end simple enough to trust.',
    listen: 'The bass should hold the body while leaving room for guitar and texture.',
  },
  harmony_drone: {
    decide: 'Set the home, drone or chord colour.',
    listen: 'The sustained layer should centre the section without covering the hook.',
  },
  motif_hook: {
    decide: 'Find one small phrase worth repeating.',
    listen: 'You should be able to sing, play or remember it after hearing it twice.',
  },
  texture_layer: {
    decide: 'Add air, grit, place or shimmer.',
    listen: 'The texture should make the section more alive without stealing the front of the mix.',
  },
  movement_modulation: {
    decide: 'Move one sound over time.',
    listen: 'A single filter, delay, pan, drive or pedal movement should create evolution.',
  },
  arrangement_arc: {
    decide: 'Shape what changes across the bars.',
    listen: 'The section should travel somewhere without needing too many new parts.',
  },
  transitions: {
    decide: 'Make the entrance or exit feel intentional.',
    listen: 'The next section should arrive because of a musical cue, not because the loop stopped.',
  },
  mix_space: {
    decide: 'Clear space for the important parts.',
    listen: 'The main pulse, low end and hook should be easy to follow at low volume.',
  },
  live_translation: {
    decide: 'Choose what is played, triggered, automated or left alone live.',
    listen: 'The section should have one obvious performance gesture and one reliable anchor.',
  },
  finish_review: {
    decide: 'Keep the useful version and stop polishing the wrong thing.',
    listen: 'The saved plan should tell you exactly what to record, rehearse or arrange next.',
  },
};

const state = {
  bootstrap: null,
  ideas: null,
  ideasPromise: null,
  ideasPromiseKey: '',
  ideasLoading: false,
  loadedStageIds: new Set(),
  allIdeasLoaded: false,
  song: null,
  currentSectionId: null,
  profile: { ...DEFAULT_PROFILE },
  plan: {},
  phaseFocus: {},
  screenIndex: 0,
  prompts: [],
  promptMode: 'normal',
  recentIdeaIds: [],
  ideaFeedback: {},
  searchResults: [],
  traceIdea: null,
  lastSelectedRaga: '',
  utilityPanel: 'section',
};

const $ = (id) => document.getElementById(id);
const els = {
  statusCard: $('statusCard'),
  stepStrip: $('stepStrip'),
  screenKicker: $('screenKicker'),
  screenTitle: $('screenTitle'),
  screenBlurb: $('screenBlurb'),
  progressPill: $('progressPill'),
  wizardBody: $('wizardBody'),
  backBtn: $('backBtn'),
  nextBtn: $('nextBtn'),
  inspireBtn: $('inspireBtn'),
  loadIdeasBtn: $('loadIdeasBtn'),
  saveBtn: $('saveBtn'),
  exportMdBtn: $('exportMdBtn'),
  exportJsonBtn: $('exportJsonBtn'),
  utilityPanel: $('utilityPanel'),
  utilityPanelTitle: $('utilityPanelTitle'),
  panelCloseBtn: $('panelCloseBtn'),
  sectionSummary: $('sectionSummary'),
  trackPanel: $('trackPanel'),
  planSummary: $('planSummary'),
  tracePanel: $('tracePanel'),
  searchInput: $('searchInput'),
  searchBtn: $('searchBtn'),
  contextIdeasBtn: $('contextIdeasBtn'),
  randomSearchBtn: $('randomSearchBtn'),
  searchResults: $('searchResults'),
  toast: $('toast'),
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function ideaRef(idea = {}) {
  return idea._indexKey || idea.id || '';
}

function feedbackForIdea(idea = {}) {
  return state.ideaFeedback[ideaRef(idea)] || state.ideaFeedback[idea.id] || {};
}

function updateIdeaFeedback(ideaOrRef, patch = {}) {
  const ref = typeof ideaOrRef === 'string' ? ideaOrRef : ideaRef(ideaOrRef);
  if (!ref) return;
  const previous = state.ideaFeedback[ref] || {};
  const next = { ...previous, ...patch, updatedAt: new Date().toISOString() };
  if (patch.rejected) next.pinned = false;
  if (patch.pinned) next.rejected = false;
  state.ideaFeedback = { ...state.ideaFeedback, [ref]: next };
  saveIdeaFeedback(state.ideaFeedback);
}

function markIdeaUsed(idea) {
  const current = feedbackForIdea(idea);
  updateIdeaFeedback(idea, {
    usedCount: Number(current.usedCount || 0) + 1,
    usedAt: new Date().toISOString(),
  });
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.add('hidden'), 2300);
}

function currentScreen() {
  return SCREENS[state.screenIndex] || SCREENS[0];
}

function defaultArrangement() {
  return ARRANGEMENT_TEMPLATE.map((slot) => ({ ...slot, sectionId: '' }));
}

function arrangementSlotById(slotId) {
  return ARRANGEMENT_TEMPLATE.find((slot) => slot.id === slotId) || null;
}

function validSectionStatus(status = '') {
  return SECTION_STATUSES.some((item) => item.id === status) ? status : 'sketch';
}

function statusLabel(status = '') {
  return SECTION_STATUSES.find((item) => item.id === status)?.label || 'Sketch';
}

function statusCue(status = '') {
  return SECTION_STATUSES.find((item) => item.id === status)?.cue || SECTION_STATUSES[0].cue;
}

function statusOptions(selected = 'sketch') {
  return SECTION_STATUSES.map((status) => `
    <option value="${escapeHtml(status.id)}" ${status.id === selected ? 'selected' : ''}>${escapeHtml(status.label)}</option>
  `).join('');
}

function inferSectionStatus(section = {}) {
  if (section.compositionStatus) return validSectionStatus(section.compositionStatus);
  const completed = Object.keys(section.plan || state.plan || {}).length;
  if (completed >= STAGES.length) return 'arranged';
  if (completed >= 8) return 'usable';
  return 'sketch';
}

function normaliseSectionSummary(section = {}) {
  return {
    ...section,
    compositionStatus: inferSectionStatus(section),
    variationOf: section.variationOf || '',
    arrangementNote: section.arrangementNote || '',
  };
}

function normaliseSong(song = null) {
  const base = song || {};
  const existingSlots = new Map((base.arrangement || []).map((slot) => [slot.id, slot]));
  const sections = Array.isArray(base.sections) ? base.sections.map(normaliseSectionSummary) : [];
  return {
    id: base.id || `song_${Date.now()}`,
    title: base.title || 'New Song',
    sections,
    arrangement: ARRANGEMENT_TEMPLATE.map((slot) => ({
      ...slot,
      sectionId: existingSlots.get(slot.id)?.sectionId || '',
    })),
    updatedAt: base.updatedAt || new Date().toISOString(),
  };
}

function createDraftSong() {
  return normaliseSong({
    id: `song_${Date.now()}`,
    title: 'New Song',
    sections: [],
    updatedAt: new Date().toISOString(),
  });
}

function saveAppState() {
  saveState({
    song: state.song,
    currentSectionId: state.currentSectionId,
    profile: state.profile,
    plan: state.plan,
    phaseFocus: state.phaseFocus,
    screenIndex: state.screenIndex,
    traceIdea: state.traceIdea,
    lastSelectedRaga: state.lastSelectedRaga,
  });
}

function hydrateState() {
  state.ideaFeedback = loadIdeaFeedback();
  const stored = loadState();
  if (!stored) {
    state.song = createDraftSong();
    return;
  }
  state.song = normaliseSong(stored.song || createDraftSong());
  state.currentSectionId = stored.currentSectionId || null;
  state.profile = { ...DEFAULT_PROFILE, ...(stored.profile || {}) };
  state.profile.gearFocus = Array.isArray(state.profile.gearFocus) ? state.profile.gearFocus : [...DEFAULT_PROFILE.gearFocus];
  state.profile.domainFilters = Array.isArray(state.profile.domainFilters) ? state.profile.domainFilters : [...DEFAULT_PROFILE.domainFilters];
  state.profile.instrument = state.profile.instrument || DEFAULT_PROFILE.instrument;
  state.profile.noteSpelling = state.profile.noteSpelling || 'sharps';
  state.profile.keyRoot = state.profile.keyRoot || DEFAULT_PROFILE.keyRoot;
  state.profile.pitchPath = state.profile.pitchPath || (state.profile.selectedRaga ? 'raga' : 'scale');
  if (!['scale', 'raga'].includes(state.profile.pitchPath)) state.profile.pitchPath = 'scale';
  state.lastSelectedRaga = stored.lastSelectedRaga || state.profile.selectedRaga || '';
  if (state.profile.pitchPath === 'scale') {
    rememberRagaChoice();
    state.profile.selectedRaga = '';
    normaliseScalePitchWorld();
  }
  syncProfileDomains();
  state.plan = stored.plan || {};
  state.phaseFocus = stored.phaseFocus || {};
  state.screenIndex = 0;
  state.traceIdea = stored.traceIdea || null;
}

function optionList(values, selected = '', emptyLabel = '') {
  const items = [];
  if (emptyLabel) items.push(`<option value="">${escapeHtml(emptyLabel)}</option>`);
  values.forEach((value) => {
    items.push(`<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`);
  });
  return items.join('');
}

function renderNoteSpellingControl() {
  const spelling = state.profile.noteSpelling || DEFAULT_PROFILE.noteSpelling || 'sharps';
  return `
    <div class="segmented-control note-spelling-control" role="radiogroup" aria-label="Choose note spelling">
      ${[
        ['sharps', 'Sharps', 'C# F# G#'],
        ['flats', 'Flats', 'Db Gb Ab'],
      ].map(([value, label, hint]) => `
        <button type="button" class="${spelling === value ? 'is-selected' : ''}" data-note-spelling="${value}" aria-pressed="${spelling === value}">
          <span>${label}</span>
          <em>${hint}</em>
        </button>
      `).join('')}
    </div>
  `;
}

function isDone(screen) {
  if (screen.id === 'song') return Boolean(state.song);
  if (screen.id === 'setup') {
    if (activePitchPath() === 'raga') return Boolean(state.profile.keyRoot && state.profile.selectedRaga);
    return Boolean(state.profile.keyRoot && state.profile.pitchWorld && state.profile.tempo && state.profile.groove && state.profile.mood && state.profile.sectionType);
  }
  if (screen.type === 'build') return (screen.stageIds || []).some((stageId) => Boolean(state.plan[stageId]));
  return false;
}

function selectedBuildCount() {
  return Object.keys(state.plan).length;
}

function activeStageId(screen = currentScreen()) {
  if (!screen?.stageIds?.length) return screen?.id;
  const selected = state.phaseFocus[screen.id];
  return screen.stageIds.includes(selected) ? selected : screen.stageIds[0];
}

function activeStage(screen = currentScreen()) {
  return STAGE_BY_ID[activeStageId(screen)] || STAGES[0];
}

function phaseCompletion(screen) {
  const stageIds = screen.stageIds || [];
  if (!stageIds.length) return '';
  const done = stageIds.filter((stageId) => state.plan[stageId]).length;
  return `${done} / ${stageIds.length}`;
}

function promptModeLabel(mode = 'normal') {
  return MODE_LABELS[mode] || MODE_LABELS.normal;
}

function anotherModeLabel(mode = 'fresh') {
  if (mode === 'normal') return 'Another fit';
  const label = promptModeLabel(mode);
  return label.startsWith('More ') ? label.replace('More ', 'Another ') : label;
}

function stageRefreshModes(stageId) {
  const rawModes = STAGE_REFRESH_MODES[stageId] || ['fresh', 'deeper'];
  const modes = ['normal', ...rawModes.map((mode) => {
    if (mode === 'raga' && activePitchPath() !== 'raga') return 'melody';
    return mode;
  })];
  return modes.filter((mode, index, list) => list.indexOf(mode) === index).slice(0, 4);
}

function uniqueList(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function stageContextIds(stageId, mode = 'normal') {
  const neighbours = STAGE_LOAD_NEIGHBOURS[stageId] || [];
  const gearStages = mode === 'gear'
    ? ['motif_hook', 'texture_layer', 'movement_modulation', 'rhythmic_foundation', 'transitions', 'mix_space', 'live_translation']
    : [];
  const ids = mode === 'deeper'
    ? [stageId, ...neighbours, ...(currentScreen().stageIds || [])]
    : [stageId, ...neighbours, ...gearStages];
  return uniqueList(ids);
}

function renderContextActions(stageId) {
  return `
    <div class="context-actions" aria-label="Idea refresh options">
      ${stageRefreshModes(stageId).map((mode) => `
        <button type="button" class="btn small ${state.promptMode === mode ? 'is-active' : ''}" data-refresh="${mode === 'normal' ? 'normal' : 'context'}" data-refresh-mode="${escapeHtml(mode)}">
          ${escapeHtml(promptModeLabel(mode))}
        </button>
      `).join('')}
    </div>
  `;
}

function renderStageGuide(screen, stageId) {
  const guidance = STAGE_GUIDANCE[stageId] || {
    decide: 'Make one practical composition decision for this focus.',
    listen: 'Keep the move that makes the section easier to hear, play or arrange.',
  };
  const stage = STAGE_BY_ID[stageId] || activeStage(screen);
  const pitchContext = getPitchContext(state.profile, selectedRagaCard());
  const noteLine = pitchContext?.notes?.length
    ? pitchContext.notes.slice(0, 7).join(', ')
    : `${state.profile.keyRoot || 'D'} as home`;
  return `
    <section class="stage-guide">
      <div class="stage-guide-main">
        <span class="mini-label">Now composing</span>
        <h3>${escapeHtml(stage.label.replace(/^\d+\.\s*/, ''))}</h3>
        <p>${escapeHtml(guidance.decide)}</p>
      </div>
      <div class="stage-guide-context">
        <span>${escapeHtml(currentKeyLabel())}</span>
        <strong>${escapeHtml(noteLine)}</strong>
        <p>${escapeHtml(`${state.profile.tempo} BPM · ${state.profile.groove} · ${state.profile.sectionType}`)}</p>
      </div>
      <div class="stage-guide-listen">
        <span>Listen for</span>
        <p>${escapeHtml(guidance.listen)}</p>
      </div>
      <div class="stage-guide-actions">
        <button type="button" class="btn small" data-open-panel="search">Ideas</button>
        <button type="button" class="btn small" data-open-panel="track">Track</button>
      </div>
    </section>
  `;
}

function renderComposerNudge(stageId) {
  const guidance = STAGE_GUIDANCE[stageId] || {
    decide: 'Make one practical composition decision for this focus.',
    listen: 'Keep the move that makes the section easier to hear, play or arrange.',
  };
  const pitchContext = getPitchContext(state.profile, selectedRagaCard());
  const noteLine = pitchContext?.notes?.length
    ? pitchContext.notes.slice(0, 7).join(', ')
    : `${state.profile.keyRoot || 'D'} as home`;
  const modes = stageRefreshModes(stageId).filter((mode) => mode !== 'normal').slice(0, 3);
  return `
    <section class="composer-nudge">
      <div>
        <span class="mini-label">Composition companion</span>
        <strong>${escapeHtml(guidance.decide)}</strong>
        <p>${escapeHtml(`${currentKeyLabel()} · ${noteLine} · ${guidance.listen}`)}</p>
      </div>
      <div class="composer-actions" aria-label="Generate another contextual idea">
        <button type="button" class="btn primary small" data-refresh="normal" data-refresh-mode="normal">Best fit</button>
        ${modes.map((mode) => `
          <button type="button" class="btn small ${state.promptMode === mode ? 'is-active' : ''}" data-refresh="context" data-refresh-mode="${escapeHtml(mode)}">
            ${escapeHtml(promptModeLabel(mode))}
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function renderIdeaCompanion(presentation) {
  return `
    <aside class="idea-companion">
      <div class="companion-cue-grid">
        <div>
          <span>Use</span>
          <strong>${escapeHtml(presentation.useCue || 'Use the current key, groove and tool choice.')}</strong>
        </div>
        <div>
          <span>Listen</span>
          <strong>${escapeHtml(presentation.listenFor || 'Keep it only if the part becomes clearer.')}</strong>
        </div>
      </div>
      ${presentation.whyHere ? `
        <div class="why-here">
          <span>Why now</span>
          <p>${escapeHtml(presentation.whyHere)}</p>
        </div>
      ` : ''}
      <div class="companion-block">
        <span class="mini-label">What this means</span>
        <p>${escapeHtml(presentation.plainMeaning || 'Try the idea in the current section and keep only what makes the music clearer.')}</p>
      </div>
      ${presentation.concepts?.length ? `
        <div class="concept-list">
          ${presentation.concepts.map((concept) => `
            <div class="concept-item">
              <strong>${escapeHtml(concept.term)}</strong>
              <p>${escapeHtml(concept.meaning)}</p>
              ${concept.tryThis ? `<em>${escapeHtml(concept.tryThis)}</em>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${presentation.pitchTip ? `<div class="prompt-tip">${escapeHtml(presentation.pitchTip)}</div>` : ''}
    </aside>
  `;
}

function renderPlayFirst(presentation) {
  const cue = presentation.playFirst;
  if (!cue) return '';
  return `
    <div class="play-first">
      <span>${escapeHtml(cue.label || 'Play first')}</span>
      <strong>${escapeHtml(cue.headline || presentation.doNow || 'Make the smallest playable version first.')}</strong>
      ${cue.detail ? `<p>${escapeHtml(cue.detail)}</p>` : ''}
      <div class="play-first-footer">
        ${cue.noteCue ? `<em>${escapeHtml(cue.noteCue)}</em>` : ''}
        ${cue.check ? `<em>${escapeHtml(cue.check)}</em>` : ''}
      </div>
    </div>
  `;
}

function enrichedPlan() {
  return Object.fromEntries(Object.entries(state.plan).map(([stageId, idea]) => [
    stageId,
    idea?.friendly ? idea : {
      ...idea,
      friendly: ideaPresentation(idea, stageId),
    },
  ]));
}

function payload() {
  const plan = enrichedPlan();
  const id = state.currentSectionId || `section_${Date.now()}`;
  const createdAt = state.currentSectionId
    ? (savedSections().find((section) => section.id === state.currentSectionId)?.createdAt || new Date().toISOString())
    : new Date().toISOString();
  return {
    id,
    createdAt,
    updatedAt: new Date().toISOString(),
    song: state.song,
    profile: state.profile,
    gearWorkflows: gearWorkflowExport(),
    trackIntelligence: buildTrackIntelligence(),
    summary: buildSectionSummary(state.profile, plan),
    plan,
  };
}

function selectedRagaCard() {
  if (activePitchPath() !== 'raga' || !state.profile.selectedRaga) return null;
  return state.bootstrap?.ragaData?.cards?.find((card) => card.name === state.profile.selectedRaga) || null;
}

function ideaPresentation(idea, stageId = currentScreen().id) {
  return idea.friendly || buildIdeaPresentation(idea, state.profile, stageId, { ragaCard: selectedRagaCard() });
}

function refreshExportLinks() {
  try {
    exportPlanMarkdown(payload(), STAGES, els.exportMdBtn);
    exportPlanJson(payload(), els.exportJsonBtn);
  } catch (error) {
    console.error(error);
    toast('Export will be ready after the section reloads.');
  }
}

function activePitchPath() {
  return state.profile.pitchPath || (state.profile.selectedRaga ? 'raga' : 'scale');
}

function currentKeyLabel() {
  const root = state.profile.keyRoot ? normaliseKeyRoot(state.profile.keyRoot, state.profile.noteSpelling) : '—';
  if (activePitchPath() === 'raga') {
    return `${root} ${state.profile.selectedRaga || 'raga'}`.trim();
  }
  return `${root} ${state.profile.pitchWorld || 'open pitch world'}`.trim();
}

function cleanedRagaFeatures(card, limit = 2) {
  const sourceHistoryPattern = /\b(portrayed|plate|ragamala|painting|paintings|Damodara|Ahobala|Faqirullah|Bhatkhande|composition follows|song text)\b/i;
  return (card?.keyFeatures || [])
    .map((feature) => String(feature || '')
      .replace(/\s*\|\s*/g, ' ')
      .replace(/"\s+in\b/gi, ' In')
      .replaceAll('"', '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((feature) => feature.length > 24 && (feature.match(/[=<>_]/g) || []).length < 8)
    .filter((feature) => !sourceHistoryPattern.test(feature))
    .map((feature) => {
      if (feature.length <= 180) return feature;
      return `${feature.slice(0, 180).replace(/\s+\S*$/, '')}...`;
    })
    .slice(0, limit);
}

function normaliseScalePitchWorld() {
  if (state.profile.pitchWorld === 'Raga-driven') state.profile.pitchWorld = DEFAULT_PROFILE.pitchWorld;
}

function rememberRagaChoice(value = state.profile.selectedRaga) {
  if (value) state.lastSelectedRaga = value;
}

function setPitchPath(path = 'scale') {
  const nextPath = path === 'raga' ? 'raga' : 'scale';
  if (nextPath === 'scale') {
    rememberRagaChoice();
    state.profile.selectedRaga = '';
    normaliseScalePitchWorld();
  } else {
    state.profile.selectedRaga = state.profile.selectedRaga || state.lastSelectedRaga || '';
    rememberRagaChoice();
  }
  state.profile.pitchPath = nextPath;
}

function setNoteSpelling(spelling = 'sharps') {
  state.profile.noteSpelling = spelling === 'flats' ? 'flats' : 'sharps';
  state.profile.keyRoot = normaliseKeyRoot(state.profile.keyRoot || DEFAULT_PROFILE.keyRoot, state.profile.noteSpelling);
}

function cleanTimeWindow(value = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return 'Open';
  if (/\bcan$/i.test(text)) return 'Open or closing-section friendly';
  if (text.length <= 90) return text;
  return `${text.slice(0, 90).replace(/\s+\S*$/, '')}...`;
}

function grooveGuidance() {
  return GROOVE_GUIDANCE[state.profile.groove] || 'Choose one clear pulse and let the arrangement grow around it.';
}

function tempoGuidance() {
  const tempo = Number(state.profile.tempo || 0);
  if (tempo < 80) return 'A slow tempo leaves space for texture, reverse delays and long guitar phrases.';
  if (tempo < 116) return 'A mid-tempo pulse is good for hypnotic live-electronic sections with room for guitar.';
  if (tempo < 140) return 'This range can drive a section without becoming frantic. Keep the low end disciplined.';
  return 'Fast tempos need simple anchors. Keep the bass/kick logic obvious before adding motion.';
}

function inferredGearFromInstrument(instrument = '') {
  const value = String(instrument || '').toLowerCase();
  const gear = [];
  if (value.includes('guitar')) gear.push('guitar', 'ampero');
  if (value.includes('microfreak')) gear.push('microfreak');
  if (value.includes('ableton') || value.includes('drum rack')) gear.push('ableton');
  if (value.includes('field')) gear.push('field_recordings');
  if (value.includes('bass synth') || value.includes('pad') || value.includes('drone synth')) gear.push('ableton', 'microfreak');
  if (value.includes('hybrid')) gear.push('guitar', 'ableton');
  return uniqueList(gear.filter((id) => GEAR_WORKFLOWS[id]));
}

function activeGearIds() {
  return uniqueList([
    ...(state.profile.gearFocus || []),
    ...inferredGearFromInstrument(state.profile.instrument),
  ]).filter((id) => GEAR_WORKFLOWS[id]);
}

function gearLabel(id) {
  return GEAR_WORKFLOWS[id]?.label || id.replaceAll('_', ' ');
}

function activeGearLabels(limit = 4) {
  const labels = activeGearIds().map(gearLabel);
  if (labels.length <= limit) return labels;
  return [...labels.slice(0, limit), `${labels.length - limit} more`];
}

function gearContext(stageId = activeStageId()) {
  const pitchContext = getPitchContext(state.profile, selectedRagaCard());
  return {
    stage: STAGE_BY_ID[stageId]?.label?.replace(/^\d+\.\s*/, '') || stageId.replaceAll('_', ' '),
    keyLabel: currentKeyLabel(),
    root: pitchContext?.root || state.profile.keyRoot || 'D',
    notes: pitchContext?.notes?.length ? pitchContext.notes.slice(0, 7).join(', ') : `${state.profile.keyRoot || 'D'} as home`,
    tempo: state.profile.tempo || 110,
    groove: state.profile.groove || 'the current groove',
    section: state.profile.sectionType || 'section',
  };
}

function interpolateGearText(text = '', context = gearContext()) {
  return String(text || '').replace(/\{(\w+)\}/g, (_match, key) => context[key] || '');
}

function gearAdviceForStage(workflow, stageId) {
  return workflow?.stages?.[stageId] || workflow?.stages?.default || {
    focus: workflow?.label || 'Tool move',
    steps: workflow?.setup || [],
  };
}

function syncProfileDomains() {
  const domains = new Set(['pitch-world', 'rhythm-groove', 'sound-design', 'psychedelic-structure']);
  activeGearIds().forEach((gearId) => {
    (GEAR_DOMAIN_HINTS[gearId] || []).forEach((domain) => domains.add(domain));
  });
  if (String(state.profile.sectionType || '').toLowerCase().includes('live')) domains.add('live-performance');
  if (activePitchPath() === 'raga') domains.add('pitch-world');
  state.profile.domainFilters = [...domains];
}

function renderGearTile(gear) {
  const selected = new Set(state.profile.gearFocus || []);
  const isOn = selected.has(gear.id);
  return `
    <label class="gear-tile ${isOn ? 'is-on' : ''}">
      <input data-profile="gearFocus" type="checkbox" value="${escapeHtml(gear.id)}" ${isOn ? 'checked' : ''}>
      <span>${escapeHtml(gear.label)}</span>
      <em>${escapeHtml(GEAR_WORKFLOWS[gear.id]?.role || 'Practical tool for this section.')}</em>
    </label>
  `;
}

function renderGearSetupCard(gearId) {
  const workflow = GEAR_WORKFLOWS[gearId];
  if (!workflow) return '';
  const context = gearContext('section_identity');
  return `
    <article class="gear-card">
      <span>${escapeHtml(workflow.label)}</span>
      <strong>${escapeHtml(workflow.role)}</strong>
      <ul>
        ${(workflow.setup || []).slice(0, 3).map((step) => `<li>${escapeHtml(interpolateGearText(step, context))}</li>`).join('')}
      </ul>
    </article>
  `;
}

function renderGearSetupPanel() {
  const activeIds = activeGearIds();
  const activeLine = activeGearLabels(3).join(', ') || 'Choose tools';
  const previewCards = activeIds.length
    ? activeIds.slice(0, 3).map(renderGearSetupCard).join('')
    : `<div class="gear-card muted-box"><strong>Choose one practical tool.</strong><p>The app will show capture, routing and live-play cues when they matter.</p></div>`;
  return `
    <section class="setup-panel setup-gear-panel">
      <div class="setup-section-head">
        <span class="mini-label">Tools + capture</span>
        <h3>${escapeHtml(activeLine)}</h3>
      </div>

      <label class="select-field"><span>Main playable source</span>
        <select data-profile="instrument">${optionList(APP_OPTIONS.instruments, state.profile.instrument)}</select>
      </label>

      <div class="gear-tile-grid" aria-label="Practical gear choices">
        ${APP_OPTIONS.gear.map(renderGearTile).join('')}
      </div>

      <details class="gear-details" ${activeIds.length <= 2 ? 'open' : ''}>
        <summary>Practical setup notes</summary>
        <div class="gear-preview-list">${previewCards}</div>
      </details>
    </section>
  `;
}

function renderGearWorkflow(stageId) {
  const ids = activeGearIds();
  if (!ids.length) return '';
  const context = gearContext(stageId);
  const cards = ids.slice(0, 4).map((gearId) => {
    const workflow = GEAR_WORKFLOWS[gearId];
    const advice = gearAdviceForStage(workflow, stageId);
    const steps = (advice.steps || workflow.setup || []).slice(0, 3);
    return `
      <article class="gear-workflow-card">
        <span>${escapeHtml(workflow.label)}</span>
        <strong>${escapeHtml(advice.focus || workflow.role)}</strong>
        <ol>
          ${steps.map((step) => `<li>${escapeHtml(interpolateGearText(step, context))}</li>`).join('')}
        </ol>
      </article>
    `;
  }).join('');
  return `
    <section class="gear-workflow-strip">
      <div class="gear-workflow-head">
        <div>
          <span class="mini-label">Practical tools</span>
          <strong>${escapeHtml(context.stage)}</strong>
        </div>
        <button type="button" class="btn small" data-refresh="context" data-refresh-mode="gear">Gear ideas</button>
      </div>
      <div class="gear-workflow-grid">${cards}</div>
    </section>
  `;
}

function gearWorkflowExport() {
  const context = gearContext(activeStageId());
  return activeGearIds().map((gearId) => {
    const workflow = GEAR_WORKFLOWS[gearId];
    return {
      id: gearId,
      label: workflow.label,
      role: workflow.role,
      setup: (workflow.setup || []).map((step) => interpolateGearText(step, context)),
    };
  });
}

function savedSections() {
  return loadSavedPlans();
}

function sectionLabel(section = {}) {
  const profile = section.profile || {};
  const key = `${profile.keyRoot || ''} ${profile.selectedRaga || profile.pitchWorld || ''}`.trim();
  return [profile.sectionType || section.title || 'Section', key, profile.groove].filter(Boolean).join(' · ');
}

function currentSavedSection() {
  if (!state.currentSectionId) return null;
  return arrangementSections().find((section) => section.id === state.currentSectionId) || null;
}

function profileSetupComplete(profile = state.profile) {
  const path = profile.pitchPath || (profile.selectedRaga ? 'raga' : 'scale');
  const hasPitch = path === 'raga'
    ? Boolean(profile.keyRoot && profile.selectedRaga)
    : Boolean(profile.keyRoot && profile.pitchWorld);
  return Boolean(hasPitch && profile.tempo && profile.groove && profile.sectionType);
}

function nextSectionScreenId(plan = state.plan, profile = state.profile) {
  if (!profileSetupComplete(profile)) return 'setup';
  const nextBuild = BUILD_PHASES.find((screen) => (screen.stageIds || []).some((stageId) => !plan?.[stageId]));
  return nextBuild?.id || BUILD_PHASES[BUILD_PHASES.length - 1].id;
}

function screenIndexById(screenId = '') {
  const index = SCREENS.findIndex((screen) => screen.id === screenId);
  return index >= 0 ? index : 0;
}

function sectionProgressText(plan = {}) {
  const count = Object.keys(plan || {}).length;
  return `${count} / ${STAGES.length} ideas chosen`;
}

function resumeSectionCandidate() {
  const saved = currentSavedSection();
  if (saved) return saved;
  if (!selectedBuildCount()) return null;
  return {
    id: '',
    title: state.profile.sectionType || 'Draft section',
    profile: state.profile,
    plan: state.plan,
    compositionStatus: inferSectionStatus({ plan: state.plan }),
    updatedAt: new Date().toISOString(),
  };
}

function arrangementSections() {
  const map = new Map();
  for (const section of savedSections()) map.set(section.id, section);
  for (const section of state.song?.sections || []) {
    map.set(section.id, { ...(map.get(section.id) || {}), ...section });
  }
  return [...map.values()];
}

function sectionForArrangement(sectionId) {
  return arrangementSections().find((section) => section.id === sectionId) || null;
}

function arrangedSlotSections(song = state.song) {
  const normalisedSong = normaliseSong(song || createDraftSong());
  const arrangement = new Map(normalisedSong.arrangement.map((slot) => [slot.id, slot.sectionId]));
  return ARRANGEMENT_TEMPLATE.map((slot) => ({
    slot,
    section: sectionForArrangement(arrangement.get(slot.id)),
  }));
}

function arrangementProgress(song = state.song) {
  const entries = arrangedSlotSections(song);
  const filled = entries.filter((entry) => entry.section).length;
  const arranged = entries.filter((entry) => ['arranged', 'mixed'].includes(validSectionStatus(entry.section?.compositionStatus))).length;
  return { filled, arranged, total: ARRANGEMENT_TEMPLATE.length };
}

function transitionAdvice(entry, nextEntry) {
  const slot = entry?.slot;
  const nextSlot = nextEntry?.slot;
  const section = entry?.section;
  const nextSection = nextEntry?.section;
  if (!slot || !nextSlot) return slot?.exitCue || '';
  if (!section && !nextSection) return `Sketch how ${slot.label.toLowerCase()} should hand off to ${nextSlot.label.toLowerCase()}.`;
  if (!section) return `Prepare this slot so ${nextSection?.profile?.sectionType || nextSlot.label} has a clear reason to arrive.`;
  if (!nextSection) return slot.exitCue;
  const currentEnergy = section.profile?.energy || slot.energy;
  const nextEnergy = nextSection.profile?.energy || nextSlot.energy;
  const currentGroove = section.profile?.groove || state.profile.groove;
  const nextGroove = nextSection.profile?.groove || state.profile.groove;
  if (currentEnergy !== nextEnergy) {
    return `${slot.exitCue} Move from ${currentEnergy.toLowerCase()} to ${nextEnergy.toLowerCase()} by changing one layer first.`;
  }
  if (currentGroove !== nextGroove) {
    return `Keep one anchor while the groove changes from ${currentGroove} to ${nextGroove}.`;
  }
  return `Use a shared sound, fill, held note or mute to make ${nextSlot.label.toLowerCase()} feel inevitable.`;
}

function preferredNextSlot(entries = arrangedSlotSections()) {
  const byId = new Map(entries.map((entry) => [entry.slot.id, entry]));
  const anyFilled = entries.some((entry) => entry.section);
  const orderedIds = anyFilled ? NEXT_SLOT_ORDER : ['main_groove', ...NEXT_SLOT_ORDER.filter((id) => id !== 'main_groove')];
  return orderedIds.map((id) => byId.get(id)).find((entry) => entry && !entry.section) || entries.find((entry) => !entry.section) || null;
}

function nearestArrangementSection(entries = [], index = 0) {
  const before = entries.slice(0, index).reverse().find((entry) => entry.section)?.section;
  const after = entries.slice(index + 1).find((entry) => entry.section)?.section;
  return before || after || null;
}

function nextSlotReason(slot, referenceSection) {
  const label = slot?.label || 'section';
  if (!referenceSection) {
    if (slot?.id === 'main_groove') return 'Start with the body of the track so later sections have something concrete to support, contrast or release.';
    return `Sketch the ${label.toLowerCase()} as a clear musical job, then place it against the main groove later.`;
  }
  const referenceType = referenceSection.profile?.sectionType || referenceSection.title || 'saved section';
  if (slot?.id === 'intro') return `Use the existing ${referenceType.toLowerCase()} as the destination, then write a doorway that makes its arrival feel earned.`;
  if (slot?.id === 'breakdown') return `Create contrast around the existing ${referenceType.toLowerCase()} without losing the key world or main pulse.`;
  if (slot?.id === 'build') return `Turn the existing material into pressure: add density, register lift or motion one layer at a time.`;
  if (slot?.id === 'peak') return `Make the strongest version of the idea: hook, low end and rhythm should agree before extra colour arrives.`;
  if (slot?.id === 'outro') return `Let the track release by keeping only the sound that still carries the identity.`;
  return `Use the existing ${referenceType.toLowerCase()} as context and build the missing ${label.toLowerCase()} with a clear purpose.`;
}

function buildNextMove(song = state.song) {
  const entries = arrangedSlotSections(song);
  const nextEntry = preferredNextSlot(entries);
  if (!nextEntry) {
    return {
      complete: true,
      title: 'Review the full track',
      action: 'All core slots are filled. Listen through the arrangement and mark which sections are ready, recorded, arranged or mixed.',
      slotId: '',
      slotLabel: 'Full track',
    };
  }
  const index = entries.findIndex((entry) => entry.slot.id === nextEntry.slot.id);
  const reference = nearestArrangementSection(entries, index);
  const slot = nextEntry.slot;
  return {
    complete: false,
    title: `Build the ${slot.label.toLowerCase()} next`,
    action: nextSlotReason(slot, reference),
    slotId: slot.id,
    slotLabel: slot.label,
    energy: slot.energy,
    keep: reference ? `Keep ${currentKeyLabel()} and the strongest identity from ${sectionLabel(reference)}.` : `Keep ${currentKeyLabel()} and one playable pulse.`,
    change: slot.purpose,
  };
}

function arrangementHandoffs(song = state.song, limit = 4) {
  const entries = arrangedSlotSections(song);
  return entries.slice(0, -1).map((entry, index) => {
    const nextEntry = entries[index + 1];
    return {
      fromSlotId: entry.slot.id,
      from: entry.section ? sectionLabel(entry.section) : entry.slot.label,
      to: nextEntry.section ? sectionLabel(nextEntry.section) : nextEntry.slot.label,
      advice: transitionAdvice(entry, nextEntry),
      ready: Boolean(entry.section || nextEntry.section),
    };
  }).filter((handoff) => handoff.ready).slice(0, limit);
}

function slotBarCue(slotId = '') {
  if (slotId === 'intro' || slotId === 'outro') return '8 or 16 bars';
  if (slotId === 'build') return '8 bars with one clear rise';
  if (slotId === 'breakdown') return '4, 8 or 16 bars of contrast';
  if (slotId === 'peak') return '16 or 32 bars if the body can carry it';
  return '16 bars before duplicating';
}

function abletonPlanningNotes(song = state.song) {
  const entries = arrangedSlotSections(song);
  return entries.map((entry, index) => {
    const section = entry.section;
    const slot = entry.slot;
    const profile = section?.profile || state.profile;
    const sceneName = `${index + 1}. ${slot.label}${section ? ` - ${profile.sectionType || 'section'}` : ' - sketch'}`;
    return {
      slotId: slot.id,
      sceneName,
      clipLength: slotBarCue(slot.id),
      capture: section
        ? `Capture ${sceneName} at ${profile.tempo || state.profile.tempo} BPM with ${profile.groove || state.profile.groove} as the feel.`
        : `Leave a labelled scene ready for the ${slot.label.toLowerCase()}.`,
      liveCue: section
        ? `Make one safe launch path and one playable gesture for ${slot.label.toLowerCase()}.`
        : slot.cue,
    };
  });
}

function buildTrackIntelligence(song = state.song) {
  return {
    nextMove: buildNextMove(song),
    handoffs: arrangementHandoffs(song),
    abletonNotes: abletonPlanningNotes(song),
  };
}

function buildSectionForSlot(slotId = '') {
  const slot = arrangementSlotById(slotId);
  if (!slot) return;
  const entries = arrangedSlotSections();
  const index = entries.findIndex((entry) => entry.slot.id === slot.id);
  const reference = nearestArrangementSection(entries, index);
  const referenceProfile = reference?.profile || state.profile || DEFAULT_PROFILE;
  state.currentSectionId = null;
  state.profile = {
    ...DEFAULT_PROFILE,
    ...referenceProfile,
    sectionType: slot.label,
    energy: slot.energy,
    notes: [
      `Track role: ${slot.purpose}`,
      `Entry cue: ${slot.entryCue}`,
      `Handoff cue: ${slot.exitCue}`,
    ].join(' '),
    variationOf: '',
  };
  syncProfileDomains();
  state.plan = {};
  state.phaseFocus = {};
  state.prompts = [];
  state.promptMode = 'normal';
  state.traceIdea = null;
  state.screenIndex = 1;
  renderAll();
  saveAppState();
  toast(`${slot.label} setup opened`);
}

function focusTransitionFromSlot(slotId = '') {
  const entries = arrangedSlotSections();
  const index = entries.findIndex((entry) => entry.slot.id === slotId);
  const entry = entries[index];
  const nextEntry = entries[index + 1];
  if (!entry || !nextEntry) {
    toast('Choose an earlier slot for a transition');
    return;
  }
  const from = entry.section ? sectionLabel(entry.section) : entry.slot.label;
  const to = nextEntry.section ? sectionLabel(nextEntry.section) : nextEntry.slot.label;
  const advice = transitionAdvice(entry, nextEntry);
  const existingNotes = String(state.profile.notes || '').trim();
  state.profile.notes = [existingNotes, `Transition focus: ${from} into ${to}. ${advice}`].filter(Boolean).join(' ');
  state.phaseFocus.arrange = 'transitions';
  state.prompts = [];
  state.promptMode = 'arrangement';
  state.screenIndex = SCREENS.findIndex((screen) => screen.id === 'arrange');
  if (state.screenIndex < 0) state.screenIndex = SCREENS.length - 1;
  renderAll();
  saveAppState();
  refreshPrompts({ inspiration: true, mode: 'arrangement' });
}

function slotForSection(section = {}) {
  const sectionType = String(section.profile?.sectionType || section.title || '').toLowerCase();
  return ARRANGEMENT_TEMPLATE.find((slot) => slot.accepts.some((accepted) => sectionType.includes(accepted))) || null;
}

function autoPlaceSectionInSong(song, section) {
  const nextSong = normaliseSong(song);
  const slot = slotForSection(section);
  if (!slot) return nextSong;
  const target = nextSong.arrangement.find((item) => item.id === slot.id);
  if (target && !target.sectionId) target.sectionId = section.id;
  return nextSong;
}

function autoArrangeSong() {
  const sections = arrangementSections();
  const used = new Set();
  const current = new Map((state.song?.arrangement || []).map((slot) => [slot.id, slot.sectionId]));
  const arrangement = ARRANGEMENT_TEMPLATE.map((slot) => {
    const existing = current.get(slot.id);
    if (existing && !used.has(existing)) {
      used.add(existing);
      return { id: slot.id, sectionId: existing };
    }
    const match = sections.find((section) => !used.has(section.id) && slot.accepts.some((accepted) => String(section.profile?.sectionType || section.title || '').toLowerCase().includes(accepted)));
    if (match) {
      used.add(match.id);
      return { id: slot.id, sectionId: match.id };
    }
    return { id: slot.id, sectionId: '' };
  });
  state.song = normaliseSong({ ...(state.song || createDraftSong()), arrangement, updatedAt: new Date().toISOString() });
  saveAppState();
  renderAll();
  toast('Track arranged');
}

function setArrangementSlot(slotId, sectionId = '') {
  const song = normaliseSong(state.song || createDraftSong());
  state.song = {
    ...song,
    arrangement: song.arrangement.map((slot) => slot.id === slotId ? { ...slot, sectionId } : slot),
    updatedAt: new Date().toISOString(),
  };
  saveAppState();
  renderAll();
}

function setSectionStatus(sectionId, status = 'sketch') {
  if (!sectionId) return;
  const cleanStatus = validSectionStatus(status);
  const song = normaliseSong(state.song || createDraftSong());
  state.song = {
    ...song,
    sections: song.sections.map((section) => section.id === sectionId ? { ...section, compositionStatus: cleanStatus } : section),
    updatedAt: new Date().toISOString(),
  };
  saveAppState();
  renderAll();
  toast(`${statusLabel(cleanStatus)} status saved`);
}

function variationSectionType(fromType = '', targetSlotId = '') {
  const targetSlot = arrangementSlotById(targetSlotId);
  if (targetSlot) return targetSlot.label;
  const sectionType = String(fromType || '').toLowerCase();
  if (sectionType.includes('main groove')) return 'Build';
  if (sectionType.includes('build')) return 'Drop / peak';
  if (sectionType.includes('breakdown')) return 'Build';
  if (sectionType.includes('intro')) return 'Main groove';
  if (sectionType.includes('drop') || sectionType.includes('peak')) return 'Outro';
  return fromType || 'Main groove';
}

function createVariationFromSection(sectionId, targetSlotId = '') {
  const source = sectionForArrangement(sectionId);
  if (!source) {
    toast('Choose a saved section first');
    return;
  }
  const sourceProfile = { ...DEFAULT_PROFILE, ...(source.profile || {}) };
  const nextSectionType = variationSectionType(sourceProfile.sectionType, targetSlotId);
  const targetSlot = arrangementSlotById(targetSlotId);
  const variationBrief = targetSlot
    ? [
      `Variation target: ${targetSlot.label}.`,
      `Purpose: ${targetSlot.purpose}`,
      `Entry: ${targetSlot.entryCue}`,
      `Handoff: ${targetSlot.exitCue}`,
    ]
    : ['Variation target: keep the recognisable part and change only one musical dimension.'];
  state.currentSectionId = null;
  state.profile = {
    ...sourceProfile,
    sectionType: nextSectionType,
    energy: targetSlot?.energy || sourceProfile.energy,
    variationOf: source.id,
    notes: [
      `Variation of ${sectionLabel(source)}.`,
      ...variationBrief,
      'Change one thing first: energy, texture, rhythm, register or density.',
      sourceProfile.notes || '',
    ].filter(Boolean).join(' '),
  };
  syncProfileDomains();
  state.plan = { ...(source.plan || {}) };
  state.phaseFocus = {};
  state.prompts = [];
  state.promptMode = 'normal';
  state.traceIdea = null;
  state.screenIndex = 1;
  if (targetSlotId) {
    const song = normaliseSong(state.song || createDraftSong());
    state.song = {
      ...song,
      updatedAt: new Date().toISOString(),
    };
  }
  renderAll();
  saveAppState();
  toast('Variation opened for editing');
}

function setUtilityPanel(panel = 'section', open = true) {
  if (!els.utilityPanel) return;
  state.utilityPanel = panel;
  const labels = {
    section: 'Current section',
    track: 'Track arrangement',
    plan: 'Chosen prompts',
    trace: 'Source trace',
    search: 'Find ideas',
  };
  els.utilityPanelTitle.textContent = labels[panel] || 'Section';
  els.utilityPanel.querySelectorAll('[data-panel-view]').forEach((view) => {
    view.classList.toggle('is-active', view.dataset.panelView === panel);
  });
  els.utilityPanel.classList.toggle('hidden', !open);
  els.utilityPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function renderStatus() {
  const manifest = state.bootstrap.manifest;
  els.statusCard.innerHTML = `
    <span><strong>${manifest.ideaCount.toLocaleString()}</strong> ideas</span>
    <span><strong>${manifest.bookCount}</strong> books</span>
    <span><strong>${manifest.ragaCount}</strong> ragas</span>
    <span><strong>${escapeHtml(manifest.auditStatus).replaceAll('_', ' ')}</strong></span>
  `;
}

function renderStepStrip() {
  els.stepStrip.innerHTML = SCREENS.map((screen, index) => `
    <button class="step-button ${index === state.screenIndex ? 'active' : ''} ${isDone(screen) ? 'done' : ''}" data-step="${index}">
      <strong>${index + 1}. ${escapeHtml(screen.label.replace(/^\d+\.\s*/, ''))}</strong>
      <span>${screen.type === 'build' ? phaseCompletion(screen) : screen.type}</span>
    </button>
  `).join('');
}

function renderScreenHeader() {
  const screen = currentScreen();
  const stage = screen.type === 'build' ? activeStage(screen) : null;
  els.screenKicker.textContent = screen.type === 'build' ? 'Composition phase' : screen.type === 'song' ? 'Song workspace' : 'Section setup';
  els.screenTitle.textContent = screen.label.replace(/^\d+\.\s*/, '');
  els.screenBlurb.textContent = stage ? `${screen.blurb} Focus: ${stage.label.replace(/^\d+\.\s*/, '')}.` : (screen.blurb || '');
  els.progressPill.textContent = `${state.screenIndex + 1} / ${SCREENS.length} · ${selectedBuildCount()} ideas chosen`;
  els.backBtn.disabled = state.screenIndex === 0;
  els.nextBtn.textContent = state.screenIndex === SCREENS.length - 1 ? 'Review' : 'Next';
  els.inspireBtn.style.display = screen.type === 'build' ? 'inline-flex' : 'none';
}

function renderSectionSummary() {
  const p = state.profile;
  const rows = [
    ['Song', state.song?.title || 'New Song'],
    ['Song sections', String(state.song?.sections?.length || 0)],
    ['Key', currentKeyLabel()],
    ['Tempo', p.tempo ? `${p.tempo} BPM` : '—'],
    ['Groove', p.groove],
    ['Section', p.sectionType],
    ['Source', p.instrument],
    ['Tools', activeGearLabels(3).join(', ') || '—'],
    ['Mood', p.mood],
    ['Energy', p.energy],
  ];
  els.sectionSummary.innerHTML = rows.map(([label, value]) => `
    <div class="mini-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '—')}</strong></div>
  `).join('');
}

function arrangementOptions(selectedId = '') {
  const sections = arrangementSections();
  const options = [`<option value="">No section assigned</option>`];
  sections.forEach((section) => {
    options.push(`<option value="${escapeHtml(section.id)}" ${section.id === selectedId ? 'selected' : ''}>${escapeHtml(sectionLabel(section))}</option>`);
  });
  return options.join('');
}

function renderTrackNextMove({ compact = false } = {}) {
  const intelligence = buildTrackIntelligence();
  const nextMove = intelligence.nextMove;
  const handoffs = intelligence.handoffs || [];
  const abletonNotes = intelligence.abletonNotes || [];
  return `
    <section class="track-next-move ${compact ? 'compact' : ''}">
      <div>
        <span class="mini-label">Next useful move</span>
        <h4>${escapeHtml(nextMove.title)}</h4>
        <p>${escapeHtml(nextMove.action)}</p>
        ${nextMove.complete ? '' : `
          <div class="next-move-meta">
            <span>${escapeHtml(nextMove.energy || 'Flexible energy')}</span>
            <span>${escapeHtml(nextMove.change || '')}</span>
          </div>
        `}
      </div>
      <div class="next-move-actions">
        ${nextMove.slotId ? `<button type="button" class="btn primary small" data-build-slot="${escapeHtml(nextMove.slotId)}">Build ${escapeHtml(nextMove.slotLabel)}</button>` : ''}
        ${handoffs[0] ? `<button type="button" class="btn small" data-transition-slot="${escapeHtml(handoffs[0].fromSlotId)}">Transition ideas</button>` : ''}
      </div>
      ${compact ? '' : `
        <div class="handoff-list">
          ${handoffs.length ? handoffs.map((handoff) => `
            <article>
              <strong>${escapeHtml(handoff.from)} into ${escapeHtml(handoff.to)}</strong>
              <p>${escapeHtml(handoff.advice)}</p>
              <button type="button" class="btn small" data-transition-slot="${escapeHtml(handoff.fromSlotId)}">Work this handoff</button>
            </article>
          `).join('') : `<article><strong>Transition map</strong><p>Save or place sections, then this area will suggest practical handoffs.</p></article>`}
        </div>
        <details class="ableton-notes">
          <summary>Ableton planning notes</summary>
          <div>
            ${abletonNotes.map((note) => `
              <article>
                <strong>${escapeHtml(note.sceneName)}</strong>
                <p>${escapeHtml(note.clipLength)} · ${escapeHtml(note.capture)}</p>
                <em>${escapeHtml(note.liveCue)}</em>
              </article>
            `).join('')}
          </div>
        </details>
      `}
    </section>
  `;
}

function renderTrackMiniMap() {
  const song = normaliseSong(state.song || createDraftSong());
  const arrangement = new Map(song.arrangement.map((slot) => [slot.id, slot.sectionId]));
  const entries = ARRANGEMENT_TEMPLATE.map((slot) => ({
    slot,
    sectionId: arrangement.get(slot.id) || '',
    section: sectionForArrangement(arrangement.get(slot.id) || ''),
  }));
  const progress = arrangementProgress(song);
  return `
    <section class="track-mini-map">
      <div class="track-mini-head">
        <div>
          <span class="mini-label">Track map</span>
          <h3>${escapeHtml(song.title || 'New Song')}</h3>
          <p>${progress.filled} / ${progress.total} slots filled · ${progress.arranged} arranged or mixed</p>
        </div>
        <button type="button" class="btn small" data-open-panel="track">Open map</button>
      </div>
      <div class="mini-slot-grid" aria-label="Track slots">
        ${entries.map(({ slot, section }) => `
          <button type="button" class="mini-slot ${section ? 'is-filled' : ''}" ${section ? `data-open-section="${escapeHtml(section.id)}"` : `data-build-slot="${escapeHtml(slot.id)}"`}>
            <span>${escapeHtml(slot.label)}</span>
            <strong>${escapeHtml(section ? (section.profile?.sectionType || section.title || 'Saved section') : slot.energy)}</strong>
          </button>
        `).join('')}
      </div>
      ${renderTrackNextMove({ compact: true })}
    </section>
  `;
}

function renderTrackArrangement({ compact = false } = {}) {
  const song = normaliseSong(state.song || createDraftSong());
  const arrangement = new Map(song.arrangement.map((slot) => [slot.id, slot.sectionId]));
  const entries = ARRANGEMENT_TEMPLATE.map((slot) => ({
    slot,
    sectionId: arrangement.get(slot.id) || '',
    section: sectionForArrangement(arrangement.get(slot.id) || ''),
  }));
  const progress = arrangementProgress(song);
  return `
    <section class="track-arrangement ${compact ? 'compact' : ''}">
      <div class="track-arrangement-head">
        <div>
          <span class="mini-label">Track map</span>
          <h3>${escapeHtml(song.title || 'New Song')}</h3>
          <p>${progress.filled} / ${progress.total} slots filled · ${progress.arranged} arranged or mixed</p>
        </div>
        <div class="track-actions">
          <button type="button" class="btn small" data-auto-arrange>Auto arrange</button>
        </div>
      </div>
      <div class="track-guide">
        <strong>Arrangement focus</strong>
        <p>Place only useful sections, then use variation and transition notes to make the full track flow.</p>
      </div>
      ${renderTrackNextMove({ compact })}
      <div class="arrangement-slots">
        ${entries.map(({ slot, sectionId, section }, index) => {
          const status = validSectionStatus(section?.compositionStatus);
          const nextEntry = entries[index + 1];
          const advice = transitionAdvice({ slot, section }, nextEntry);
          return `
            <article class="arrangement-slot ${section ? 'is-filled' : ''}">
              <div class="slot-number">${index + 1}</div>
              <div class="slot-main">
                <div class="slot-title-line">
                  <span>${escapeHtml(slot.label)}</span>
                  <small>${escapeHtml(section ? statusLabel(status) : slot.energy)}</small>
                </div>
                <strong>${escapeHtml(section ? (section.summary?.title || section.title || sectionLabel(section)) : slot.cue)}</strong>
                <em>${escapeHtml(section ? sectionLabel(section) : slot.purpose)}</em>
                <div class="slot-guidance">
                  <p><b>Entry:</b> ${escapeHtml(slot.entryCue)}</p>
                  <p><b>${nextEntry ? 'Handoff' : 'Finish'}:</b> ${escapeHtml(advice)}</p>
                </div>
                <select data-arrangement-slot="${escapeHtml(slot.id)}">${arrangementOptions(sectionId)}</select>
                ${section ? `
                  <label class="slot-status-field">
                    <span>Status</span>
                    <select data-section-status="${escapeHtml(section.id)}">${statusOptions(status)}</select>
                    <em>${escapeHtml(statusCue(status))}</em>
                  </label>
                ` : ''}
              </div>
              <div class="slot-actions">
                ${section ? `<button type="button" class="btn small" data-open-arrangement-section="${escapeHtml(section.id)}">Open</button>` : ''}
                ${section ? `<button type="button" class="btn small" data-create-variation="${escapeHtml(section.id)}" data-variation-slot="${escapeHtml(nextEntry?.slot?.id || '')}">Variation</button>` : ''}
                ${section ? `<button type="button" class="btn small" data-clear-arrangement-slot="${escapeHtml(slot.id)}">Clear</button>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderTrackPanel() {
  if (!els.trackPanel) return;
  els.trackPanel.innerHTML = renderTrackArrangement({ compact: false });
}

function renderCurrentSectionResume() {
  const section = resumeSectionCandidate();
  if (!section) return '';
  const profile = { ...DEFAULT_PROFILE, ...(section.profile || {}) };
  const plan = section.id && section.id === state.currentSectionId ? state.plan : (section.plan || state.plan);
  const key = `${profile.keyRoot || ''} ${profile.selectedRaga || profile.pitchWorld || ''}`.trim() || 'Open key world';
  const status = statusLabel(section.compositionStatus || inferSectionStatus({ plan }));
  const nextScreenId = nextSectionScreenId(plan, profile);
  const nextScreen = SCREENS[screenIndexById(nextScreenId)];
  const title = section.title || section.summary?.title || profile.sectionType || 'Current section';
  const updated = section.updatedAt ? new Date(section.updatedAt).toLocaleDateString('en-GB') : 'unsaved draft';
  const continueAttr = section.id ? `data-continue-section="${escapeHtml(section.id)}"` : 'data-continue-current';
  return `
    <section class="resume-section-card">
      <div class="resume-copy">
        <span class="mini-label">Resume</span>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml([profile.sectionType, key, profile.groove].filter(Boolean).join(' · '))}</p>
      </div>
      <div class="resume-metrics">
        <div><span>Status</span><strong>${escapeHtml(status)}</strong></div>
        <div><span>Progress</span><strong>${escapeHtml(sectionProgressText(plan))}</strong></div>
        <div><span>Next</span><strong>${escapeHtml(nextScreen?.label || 'Setup')}</strong></div>
        <div><span>Updated</span><strong>${escapeHtml(updated)}</strong></div>
      </div>
      <div class="resume-actions">
        <button type="button" class="btn primary small" ${continueAttr}>Continue composing</button>
        <button type="button" class="btn small" data-step-target="setup">Setup</button>
        <button type="button" class="btn small" data-open-panel="plan">Chosen ideas</button>
      </div>
    </section>
  `;
}

function renderPlanSummary() {
  const chosen = Object.keys(state.plan).length;
  if (!chosen) {
    els.planSummary.innerHTML = `<div class="mini-card muted-box">No prompts chosen yet.</div>`;
    return;
  }
  els.planSummary.innerHTML = STAGES.map((stage) => {
    const item = state.plan[stage.id];
    if (!item) return '';
    const presentation = ideaPresentation(item, stage.id);
    return `<div class="mini-card"><span>${escapeHtml(stage.label)}</span><p>${escapeHtml(presentation.action)}</p></div>`;
  }).join('');
}

function renderTracePanel() {
  const item = state.traceIdea;
  if (!item) {
    els.tracePanel.innerHTML = `<div class="mini-card muted-box">Choose “Source” on a prompt.</div>`;
    return;
  }
  els.tracePanel.innerHTML = `
    <div class="mini-card">
      <span>Book ${item.bookNumber}</span>
      <h3>${escapeHtml(item.sourceBook || 'Unknown source')}</h3>
      <p>${escapeHtml(item.sourceAuthor || '')}</p>
      ${item.friendly?.action ? `<p style="margin-top:10px"><strong>Shown as:</strong> ${escapeHtml(item.friendly.action)}</p>` : ''}
      <p style="margin-top:10px"><strong>Original source wording:</strong> ${escapeHtml(item.prompt)}</p>
      ${item._sourceAlternates?.length ? `
        <p style="margin-top:10px"><strong>Related source versions kept:</strong> ${escapeHtml(item._sourceAlternates.map((alt) => `Book ${alt.bookNumber} (${String(alt.stageBucket || '').replaceAll('_', ' ')})`).join(', '))}</p>
      ` : ''}
      <div class="chips" style="margin-top:10px">
        ${(item.domainHints || []).slice(0, 5).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}
        ${(item.gearHints || []).slice(0, 4).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderSongEntry() {
  const sections = savedSections().slice(0, 12);
  const savedById = new Map(sections.map((section) => [section.id, section]));
  const songSections = (state.song?.sections || []).slice(0, 12);
  els.wizardBody.innerHTML = `
    <div class="song-entry song-entry-polished">
      <div class="song-choice-row">
        <button type="button" class="entry-card primary-entry" data-new-song>
          <span class="mini-label">Start fresh</span>
          <strong>New Song</strong>
          <em>Begin with one useful section, then let the track map suggest the next musical move.</em>
        </button>

        <div class="entry-card existing-entry">
          <div class="entry-card-head">
            <div>
              <span class="mini-label">Local workspace</span>
              <strong>Existing Song</strong>
              <em>Open a saved section and continue the track from there.</em>
            </div>
            <button type="button" class="btn small" data-open-panel="track">Track drawer</button>
          </div>
          <div class="section-list compact-list">
            ${sections.length ? sections.map((section) => `
              <button type="button" class="section-row" data-open-section="${escapeHtml(section.id)}">
                <span>${escapeHtml(`${section.summary?.title || section.profile?.sectionType || 'Saved section'} · ${statusLabel(section.compositionStatus)}`)}</span>
                <strong>${escapeHtml(section.profile ? `${section.profile.sectionType || 'Section'} · ${section.profile.keyRoot || ''} ${section.profile.selectedRaga || section.profile.pitchWorld || ''}` : 'Saved section')}</strong>
                <em>${escapeHtml(section.updatedAt ? `Updated ${new Date(section.updatedAt).toLocaleDateString('en-GB')}` : 'Saved locally')}</em>
              </button>
            `).join('') : `<div class="mini-card muted-box">No saved sections yet. Start a new song and save the first section.</div>`}
          </div>
        </div>
      </div>

      <div class="entry-card current-song-entry song-flow-card">
        <div class="song-flow-head">
          <label class="song-title-field">
            <span>Current song</span>
            <input data-song-title type="text" value="${escapeHtml(state.song?.title || 'New Song')}" />
          </label>
          <div class="song-flow-actions">
            <button type="button" class="btn primary small" data-new-section>New section</button>
            <button type="button" class="btn small" data-open-panel="track">Track map</button>
          </div>
        </div>
        ${renderCurrentSectionResume()}
        <div class="song-flow-columns">
          ${renderTrackMiniMap()}
          <div class="song-section-panel">
            <span class="mini-label section-list-label">Song sections</span>
            <div class="section-list compact-list">
              ${songSections.length ? songSections.map((section) => {
                const saved = savedById.get(section.id);
                const profile = saved?.profile || section.profile || {};
                const key = `${profile.keyRoot || ''} ${profile.selectedRaga || profile.pitchWorld || ''}`.trim();
                const status = statusLabel(section.compositionStatus || saved?.compositionStatus);
                return `
                  <button type="button" class="section-row ${section.id === state.currentSectionId ? 'is-current' : ''}" data-open-section="${escapeHtml(section.id)}">
                    <span>${escapeHtml(section.id === state.currentSectionId ? 'Current section' : `Song section · ${status}`)}</span>
                    <strong>${escapeHtml(section.title || saved?.summary?.title || profile.sectionType || 'Saved section')}</strong>
                    <em>${escapeHtml([profile.sectionType, key, profile.groove].filter(Boolean).join(' · ') || 'Saved locally')}</em>
                  </button>
                `;
              }).join('') : `<div class="mini-card muted-box">No sections in this song yet. Save the first section when it has a useful shape.</div>`}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSetup() {
  state.profile.noteSpelling = state.profile.noteSpelling || 'sharps';
  state.profile.keyRoot = normaliseKeyRoot(state.profile.keyRoot || DEFAULT_PROFILE.keyRoot, state.profile.noteSpelling);
  const ragas = state.bootstrap.ragaData.cards.map((card) => card.name);
  const path = activePitchPath();
  const selectedRaga = selectedRagaCard();
  const pitchContext = getPitchContext(state.profile, selectedRaga);
  const pitchSummary = formatPitchSummary(state.profile, selectedRaga);
  const keyRoots = getKeyRootOptions(state.profile.noteSpelling);
  const scaleWorlds = (APP_OPTIONS.pitchWorlds || []).filter((world) => world !== 'Raga-driven');
  if (state.profile.pitchWorld && !scaleWorlds.includes(state.profile.pitchWorld)) scaleWorlds.push(state.profile.pitchWorld);
  const keyLabel = currentKeyLabel();
  const root = state.profile.keyRoot || 'D';
  const intervals = pitchContext.intervals?.length ? pitchContext.intervals.join(' - ') : 'No fixed interval set yet';
  const notes = pitchContext.notes?.length
    ? pitchContext.notes.join(', ')
    : path === 'raga'
      ? `${root} is Sa/home. Choose a raga to see a common pitch reference.`
      : `${root} is home. Keep the note set small until the section has a clear centre.`;
  const ragaInfo = pitchContext.ragaInfo || null;
  const ragaFeatures = cleanedRagaFeatures(selectedRaga);
  const sourceLine = selectedRaga?.source ? `Source trace: ${selectedRaga.source}` : '';
  const ragaBehaviour = [
    pitchSummary.tip,
    `Keep a drone or bass anchor on ${root}, then write one short phrase that returns to Sa before adding extra notes.`,
    ...ragaFeatures,
  ].filter(Boolean).filter((feature, index, list) => list.indexOf(feature) === index).slice(0, 3);

  els.wizardBody.innerHTML = `
    <div class="setup-workspace">
      <section class="setup-panel setup-pitch-panel">
        <div class="setup-section-head">
          <span class="mini-label">Key world</span>
          <h3>${escapeHtml(keyLabel)}</h3>
        </div>

        <div class="pitch-path-grid compact" role="group" aria-label="Choose pitch route">
          <button type="button" class="pitch-path-card ${path === 'scale' ? 'is-selected' : ''}" data-pitch-path="scale" aria-pressed="${path === 'scale'}">
            <span>Scale / mode</span>
            <strong>Notes and intervals</strong>
          </button>
          <button type="button" class="pitch-path-card ${path === 'raga' ? 'is-selected' : ''}" data-pitch-path="raga" aria-pressed="${path === 'raga'}">
            <span>Raga</span>
            <strong>Behaviour first</strong>
          </button>
        </div>

        ${renderNoteSpellingControl()}

        <div class="note-grid compact" role="list" aria-label="Choose tonic note">
          ${keyRoots.map((note) => `
            <button type="button" class="note-button ${note === state.profile.keyRoot ? 'is-selected' : ''}" data-key-root="${escapeHtml(note)}">
              ${escapeHtml(note)}
            </button>
          `).join('')}
        </div>

        ${path === 'scale' ? `
          <label class="select-field"><span>Scale / mode</span>
            <select data-profile="pitchWorld">${optionList(scaleWorlds, state.profile.pitchWorld)}</select>
          </label>
        ` : `
          <label class="select-field"><span>Raga</span>
            <select data-profile="selectedRaga">${optionList(ragas, state.profile.selectedRaga, 'Choose a raga')}</select>
          </label>
        `}

        <div class="pitch-guide compact-guide">
          <div class="pitch-detail-grid compact">
            <div class="pitch-detail"><span>${path === 'raga' ? 'Common intervals' : 'Intervals'}</span><strong>${escapeHtml(intervals)}</strong></div>
            <div class="pitch-detail"><span>${path === 'raga' ? `Notes from ${root} as Sa` : `Notes in ${keyLabel}`}</span><strong>${escapeHtml(notes)}</strong></div>
          </div>
          ${path === 'raga' && selectedRaga ? `
            <p>${escapeHtml(cleanTimeWindow(ragaInfo?.timeWindow))}</p>
            <ul class="pitch-feature-list">${ragaBehaviour.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>
            ${sourceLine ? `<p class="source-line">${escapeHtml(sourceLine)}</p>` : ''}
          ` : `<p>${escapeHtml(pitchSummary.tip)}</p>`}
        </div>
      </section>

      <section class="setup-panel setup-motion-panel">
        <div class="setup-section-head">
          <span class="mini-label">Pulse + identity</span>
          <h3>${escapeHtml(state.profile.tempo)} BPM · ${escapeHtml(state.profile.groove)}</h3>
        </div>

        <div class="setup-grid">
          <label class="select-field"><span>Tempo</span><input data-profile="tempo" type="number" min="40" max="220" value="${escapeHtml(state.profile.tempo)}"></label>
          <label class="select-field"><span>Groove feel</span><select data-profile="groove">${optionList(APP_OPTIONS.grooveFeels, state.profile.groove)}</select></label>
          <label class="select-field"><span>Section type</span><select data-profile="sectionType">${optionList(APP_OPTIONS.sectionTypes, state.profile.sectionType)}</select></label>
          <label class="select-field"><span>Mood</span><select data-profile="mood">${optionList(APP_OPTIONS.moods, state.profile.mood)}</select></label>
          <label class="select-field"><span>Energy</span><select data-profile="energy">${optionList(APP_OPTIONS.energyLevels, state.profile.energy)}</select></label>
          <label class="select-field wide"><span>Short intent</span><textarea data-profile="notes" rows="3" placeholder="What should this section do in the song?">${escapeHtml(state.profile.notes || '')}</textarea></label>
        </div>

        <div class="guidance-strip">
          <div><span>Tempo</span><p>${escapeHtml(tempoGuidance())}</p></div>
          <div><span>Groove</span><p>${escapeHtml(grooveGuidance())}</p></div>
        </div>
      </section>

      ${renderGearSetupPanel()}
    </div>
  `;
}

function renderPitch() {
  const ragas = state.bootstrap.ragaData.cards.map((card) => card.name);
  const path = activePitchPath();
  const selectedRaga = selectedRagaCard();
  const pitchContext = getPitchContext(state.profile, selectedRaga);
  const pitchSummary = formatPitchSummary(state.profile, selectedRaga);
  const keyRoots = getKeyRootOptions(state.profile.noteSpelling);
  const scaleWorlds = (APP_OPTIONS.pitchWorlds || []).filter((world) => world !== 'Raga-driven');
  if (state.profile.pitchWorld && !scaleWorlds.includes(state.profile.pitchWorld)) scaleWorlds.push(state.profile.pitchWorld);
  const keyLabel = currentKeyLabel();
  const root = state.profile.keyRoot || 'D';
  const intervals = pitchContext.intervals?.length ? pitchContext.intervals.join(' - ') : 'No fixed interval set yet';
  const notes = pitchContext.notes?.length
    ? pitchContext.notes.join(', ')
    : path === 'raga'
      ? `${root} is Sa/home. Choose a raga to see a common pitch reference.`
      : `${root} is home. Keep the note set small until the section has a clear centre.`;
  const ragaInfo = pitchContext.ragaInfo || null;
  const ragaFeatures = cleanedRagaFeatures(selectedRaga);
  const sourceLine = selectedRaga?.source ? `Source trace: ${selectedRaga.source}` : '';
  const ragaBehaviour = [
    pitchSummary.tip,
    `Keep a drone or bass anchor on ${root}, then write one short phrase that returns to Sa before adding extra notes.`,
    ...ragaFeatures,
  ].filter(Boolean).filter((feature, index, list) => list.indexOf(feature) === index).slice(0, 3);

  els.wizardBody.innerHTML = `
    <div class="key-screen">
      <div class="field-card wide key-hero">
        <span class="mini-label">Current key world</span>
        <h3>${escapeHtml(keyLabel)}</h3>
        <p>${path === 'raga'
          ? 'Treat the chosen note as Sa/home, then follow the raga behaviour card for movement, emphasis and mood.'
          : 'Use the chosen note as home, then let the scale or mode define the available colours.'}</p>
      </div>

      <div class="pitch-path-grid" role="group" aria-label="Choose pitch route">
        <button type="button" class="pitch-path-card ${path === 'scale' ? 'is-selected' : ''}" data-pitch-path="scale" aria-pressed="${path === 'scale'}">
          <span>Scale / mode</span>
          <strong>Clear notes and intervals</strong>
          <em>Dorian, Lydian dominant, pentatonic and other non-raga worlds.</em>
        </button>
        <button type="button" class="pitch-path-card ${path === 'raga' ? 'is-selected' : ''}" data-pitch-path="raga" aria-pressed="${path === 'raga'}">
          <span>Raga</span>
          <strong>Behaviour before scale</strong>
          <em>Sa/home, time, phrase movement, emphasis and source-card guidance.</em>
        </button>
      </div>

      <div class="field-card wide pitch-note-card">
        <h3>2. Choose the home note</h3>
        ${renderNoteSpellingControl()}
        <div class="note-grid" role="list" aria-label="Choose tonic note">
          ${keyRoots.map((note) => `
            <button type="button" class="note-button ${note === state.profile.keyRoot ? 'is-selected' : ''}" data-key-root="${escapeHtml(note)}">
              ${escapeHtml(note)}
            </button>
          `).join('')}
        </div>
      </div>

      ${path === 'scale' ? `
        <div class="field-card wide pitch-choice-card">
          <label><span>3. Choose the scale or mode</span>
            <select data-profile="pitchWorld">${optionList(scaleWorlds, state.profile.pitchWorld)}</select>
          </label>
        </div>

        <div class="info-card wide pitch-guide">
          <h3>Scale behaviour</h3>
          <div class="pitch-detail-grid">
            <div class="pitch-detail">
              <span>Intervals</span>
              <strong>${escapeHtml(intervals)}</strong>
            </div>
            <div class="pitch-detail">
              <span>Notes in ${escapeHtml(keyLabel)}</span>
              <strong>${escapeHtml(notes)}</strong>
            </div>
            <div class="pitch-detail">
              <span>Home / drone</span>
              <strong>Let ${escapeHtml(root)} stay underneath the guitar, bass or pad until the section feels centred.</strong>
            </div>
            <div class="pitch-detail">
              <span>Try now</span>
              <strong>${escapeHtml(pitchSummary.tip)}</strong>
            </div>
          </div>
        </div>
      ` : `
        <div class="field-card wide pitch-choice-card">
          <label><span>3. Choose the raga</span>
            <select data-profile="selectedRaga">${optionList(ragas, state.profile.selectedRaga, 'Choose a raga')}</select>
          </label>
        </div>

        <div class="info-card wide pitch-guide">
          <h3>${selectedRaga ? 'Raga behaviour' : 'Choose the raga behaviour'}</h3>
          ${selectedRaga ? `
            <p>A raga is not just a scale. In ${escapeHtml(keyLabel)}, use ${escapeHtml(root)} as Sa/home and let the source card guide ascent, descent, emphasis, phrase endings and mood.</p>
            <div class="pitch-detail-grid">
              <div class="pitch-detail">
                <span>Common intervals</span>
                <strong>${escapeHtml(intervals)}</strong>
              </div>
              <div class="pitch-detail">
                <span>Common notes from ${escapeHtml(root)} as Sa</span>
                <strong>${escapeHtml(notes)}</strong>
              </div>
              <div class="pitch-detail">
                <span>Time / window</span>
                <strong>${escapeHtml(cleanTimeWindow(ragaInfo?.timeWindow))}</strong>
              </div>
              <div class="pitch-detail">
                <span>Drone / home</span>
                <strong>Hold ${escapeHtml(root)} as Sa. Let bass, tanpura-style pad or guitar harmonics return there often.</strong>
              </div>
            </div>
            <ul class="pitch-feature-list">
              ${ragaBehaviour.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}
            </ul>
            ${sourceLine ? `<p class="source-line">${escapeHtml(sourceLine)}</p>` : ''}
          ` : `
            <p>Choose a raga, then this screen will show the combined key world, a common note reference from ${escapeHtml(root)}, the time window and the practical behaviour reminders.</p>
            <div class="pitch-detail-grid">
              <div class="pitch-detail">
                <span>Sa / home</span>
                <strong>${escapeHtml(root)}</strong>
              </div>
              <div class="pitch-detail">
                <span>Start here</span>
                <strong>Use a drone or held bass on ${escapeHtml(root)} while choosing the raga.</strong>
              </div>
            </div>
          `}
        </div>
      `}
    </div>
  `;
}

function renderMotion() {
  els.wizardBody.innerHTML = `
    <div class="card-grid">
      <div class="field-card">
        <label><span>Tempo</span><input data-profile="tempo" type="number" min="40" max="220" value="${escapeHtml(state.profile.tempo)}"></label>
      </div>
      <div class="field-card">
        <label><span>Groove / rhythm feel</span><select data-profile="groove">${optionList(APP_OPTIONS.grooveFeels, state.profile.groove)}</select></label>
      </div>
      <div class="info-card wide"><h3>Live-feel check</h3><p>Pick a feel you can imagine playing with guitar, Ableton clips and hardware, not only programming in the piano roll.</p></div>
    </div>
  `;
}

function renderIdentity() {
  els.wizardBody.innerHTML = `
    <div class="card-grid">
      <div class="field-card"><label><span>Mood</span><select data-profile="mood">${optionList(APP_OPTIONS.moods, state.profile.mood)}</select></label></div>
      <div class="field-card"><label><span>Section type</span><select data-profile="sectionType">${optionList(APP_OPTIONS.sectionTypes, state.profile.sectionType)}</select></label></div>
      <div class="field-card"><label><span>Energy</span><select data-profile="energy">${optionList(APP_OPTIONS.energyLevels, state.profile.energy)}</select></label></div>
      <div class="field-card"><label><span>Short intent note</span><textarea data-profile="notes" rows="4" placeholder="What should this section become?">${escapeHtml(state.profile.notes || '')}</textarea></label></div>
    </div>
  `;
}

function renderToggleGroup(items, selected, name) {
  const set = new Set(selected || []);
  return items.map((item) => {
    const value = typeof item === 'string' ? item : item.id;
    const label = typeof item === 'string' ? item : item.label;
    const isOn = set.has(value);
    return `<label class="toggle ${isOn ? 'is-on' : ''}"><input data-profile="${name}" type="checkbox" value="${escapeHtml(value)}" ${isOn ? 'checked' : ''}>${escapeHtml(label)}</label>`;
  }).join('');
}

function renderSource() {
  els.wizardBody.innerHTML = `
    <div class="card-grid">
      <div class="field-card wide"><label><span>Main instrument / sound source</span><select data-profile="instrument">${optionList(APP_OPTIONS.instruments, state.profile.instrument)}</select></label></div>
      <div class="field-card wide"><h3>Optional gear focus</h3><div class="toggle-group">${renderToggleGroup(APP_OPTIONS.gear, state.profile.gearFocus, 'gearFocus')}</div></div>
      <div class="field-card wide"><h3>Knowledge filters</h3><p>Pick only the lanes you want the next prompts to favour.</p><div class="toggle-group" style="margin-top:10px">${renderToggleGroup(APP_OPTIONS.domainFilters, state.profile.domainFilters, 'domainFilters')}</div></div>
    </div>
  `;
}

function rememberIdeas(ideas = []) {
  const map = new Map((state.ideas || []).map((idea) => [ideaRef(idea), idea]));
  for (const idea of ideas) {
    map.set(ideaRef(idea), idea);
  }
  state.ideas = [...map.values()];
}

function ideasForStages(stageIds = []) {
  const ids = new Set(stageIds);
  return (state.ideas || []).filter((idea) => ids.has(idea.stageBucket));
}

async function loadIdeaContext(stageIds = null) {
  const ids = stageIds ? uniqueList(stageIds) : [];
  const isFullPoolRequest = !ids.length;
  if (isFullPoolRequest && state.allIdeasLoaded) return state.ideas || [];
  if (!isFullPoolRequest && ids.every((id) => state.loadedStageIds.has(id))) return ideasForStages(ids);

  const promiseKey = isFullPoolRequest ? 'all' : ids.slice().sort().join('|');
  if (state.ideasPromise && state.ideasPromiseKey === promiseKey) return state.ideasPromise;
  els.loadIdeasBtn.textContent = isFullPoolRequest ? 'Loading pool…' : 'Loading focus…';
  state.ideasLoading = true;
  if (currentScreen().type === 'build') renderBuild();
  state.ideasPromise = (async () => {
    try {
      const loaded = isFullPoolRequest ? await loadIdeas() : await loadIdeasForStages(ids);
      rememberIdeas(loaded);
      if (isFullPoolRequest) state.allIdeasLoaded = true;
      ids.forEach((id) => state.loadedStageIds.add(id));
      els.loadIdeasBtn.textContent = isFullPoolRequest ? 'Idea pool loaded' : 'Focus ideas loaded';
      toast(isFullPoolRequest ? 'Idea pool loaded' : 'Focus ideas loaded');
      return isFullPoolRequest ? (state.ideas || []) : ideasForStages(ids);
    } catch (error) {
      console.error(error);
      toast('Could not load ideas. Use GitHub Pages or a local server.');
      return null;
    } finally {
      state.ideasLoading = false;
      state.ideasPromise = null;
      state.ideasPromiseKey = '';
    }
  })();
  state.ideasPromiseKey = promiseKey;
  return state.ideasPromise;
}

async function ensureIdeasLoaded(stageIds = null) {
  return Boolean(await loadIdeaContext(stageIds));
}

async function refreshPrompts({ inspiration = false, mode = null } = {}) {
  const screen = currentScreen();
  if (screen.type !== 'build') return;
  const stageId = activeStageId(screen);
  const promptMode = mode || (inspiration ? 'fresh' : 'normal');
  const contextStageIds = stageContextIds(stageId, promptMode);
  const contextIdeas = await loadIdeaContext(contextStageIds);
  if (!contextIdeas?.length) return;
  state.promptMode = promptMode;
  state.prompts = generateStagePrompts(contextIdeas, state.profile, stageId, state.plan, {
    inspiration,
    mode: promptMode,
    recentIds: state.recentIdeaIds,
    feedback: state.ideaFeedback,
  })
    .slice(0, 3)
    .map((idea) => ({ ...idea, _stageId: stageId }));
  state.recentIdeaIds = [
    ...state.prompts.map((idea) => idea.id),
    ...state.recentIdeaIds.filter((id) => !state.prompts.some((idea) => idea.id === id)),
  ].slice(0, 80);
  renderBuild();
}

function renderPromptCard(idea, index) {
  const presentation = ideaPresentation(idea, idea._stageId || activeStageId());
  const mode = idea._contextMode || state.promptMode || 'fresh';
  const relatedCount = Number(idea._relatedIdeaCount || 0);
  const feedback = feedbackForIdea(idea);
  return `
    <article class="prompt-card ${index === 0 ? 'featured' : ''}">
      <div class="prompt-topline">
        <span class="mini-label">${escapeHtml(presentation.title)}</span>
        <div class="chips">
          ${feedback.pinned ? `<span class="chip idea-tag">pinned</span>` : ''}
          ${feedback.usedAt ? `<span class="chip">used before</span>` : ''}
          ${presentation.tags.map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
      <div class="idea-card-grid">
        <div class="idea-main">
          ${renderPlayFirst(presentation)}
          <div class="do-now">
            <span>${escapeHtml(presentation.actionVerb || 'Try now')}</span>
            <strong>${escapeHtml(presentation.doNow || 'Make the smallest playable version first.')}</strong>
          </div>
          <p class="prompt-text">${escapeHtml(presentation.action)}</p>
          <ol class="prompt-steps">
            ${presentation.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
          </ol>
        </div>
        ${renderIdeaCompanion(presentation)}
      </div>
      <div class="prompt-footer">
        <span>${escapeHtml(presentation.sourceLine)}</span>
        <span>${escapeHtml(promptModeLabel(mode))}</span>
        ${relatedCount > 1 ? `<span>${relatedCount} related source versions kept</span>` : ''}
      </div>
      <div class="prompt-actions">
        <button class="btn primary small" data-use="${escapeHtml(ideaRef(idea))}">Use this</button>
        <button class="btn small" data-refresh="context" data-refresh-mode="${escapeHtml(mode)}">${escapeHtml(anotherModeLabel(mode))}</button>
        <button class="btn small ${feedback.pinned ? 'is-active' : ''}" data-feedback="pin" data-feedback-idea="${escapeHtml(ideaRef(idea))}">${feedback.pinned ? 'Pinned' : 'Pin'}</button>
        <button class="btn small" data-feedback="reject" data-feedback-idea="${escapeHtml(ideaRef(idea))}">Reject</button>
        <button class="btn small" data-source="${escapeHtml(ideaRef(idea))}">Source</button>
      </div>
    </article>
  `;
}

function renderBuild() {
  const screen = currentScreen();
  const stageId = activeStageId(screen);
  const stage = activeStage(screen);
  const chosen = state.plan[stageId];
  const stageGuide = renderStageGuide(screen, stageId);
  const composerNudge = renderComposerNudge(stageId);
  const gearWorkflow = renderGearWorkflow(stageId);
  const focusTabs = (screen.stageIds || []).map((id) => {
    const item = STAGE_BY_ID[id];
    const label = item?.label.replace(/^\d+\.\s*/, '') || id.replaceAll('_', ' ');
    return `<button type="button" class="focus-chip ${id === stageId ? 'is-selected' : ''} ${state.plan[id] ? 'is-done' : ''}" data-phase-focus="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
  }).join('');
  if (chosen) {
    const presentation = ideaPresentation(chosen, stageId);
    const feedback = feedbackForIdea(chosen);
    els.wizardBody.innerHTML = `
      <div class="build-workspace">
        <div class="phase-focus">${focusTabs}</div>
        ${stageGuide}
        ${composerNudge}
        ${gearWorkflow}
        <div class="info-card wide chosen-idea prompt-card">
          <span class="mini-label">Chosen for ${escapeHtml(stage.label.replace(/^\d+\.\s*/, ''))}</span>
          <h3>${escapeHtml(presentation.title)}</h3>
          <div class="chips" style="margin-top:10px">
            ${feedback.pinned ? `<span class="chip idea-tag">pinned</span>` : ''}
            ${feedback.usedAt ? `<span class="chip">used before</span>` : ''}
            ${presentation.tags.map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
          <div class="idea-card-grid">
            <div class="idea-main">
              ${renderPlayFirst(presentation)}
              <div class="do-now">
                <span>${escapeHtml(presentation.actionVerb || 'Try now')}</span>
                <strong>${escapeHtml(presentation.doNow || 'Make the smallest playable version first.')}</strong>
              </div>
              <p class="prompt-text" style="margin-top:8px">${escapeHtml(presentation.action)}</p>
              <ol class="prompt-steps">${presentation.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
            </div>
            ${renderIdeaCompanion(presentation)}
          </div>
          <div class="prompt-actions" style="margin-top:14px">
            <button class="btn small" data-source="${escapeHtml(ideaRef(chosen))}">Source</button>
            <button class="btn small ${feedback.pinned ? 'is-active' : ''}" data-feedback="pin" data-feedback-idea="${escapeHtml(ideaRef(chosen))}">${feedback.pinned ? 'Pinned' : 'Pin'}</button>
            <button class="btn small" data-rechoose="${escapeHtml(stageId)}" data-rechoose-mode="fresh">Fresh source</button>
            <button class="btn danger small" data-rechoose="${escapeHtml(stageId)}" data-rechoose-mode="normal">Replace idea</button>
          </div>
        </div>
      </div>
    `;
    return;
  }
  if (!state.prompts.length) {
    els.wizardBody.innerHTML = `
      <div class="build-workspace">
        <div class="phase-focus">${focusTabs}</div>
        ${stageGuide}
        ${composerNudge}
        ${gearWorkflow}
        <div class="info-card wide">
          <span class="mini-label">${escapeHtml(screen.label)}</span>
          <h3>${escapeHtml(stage.label.replace(/^\d+\.\s*/, ''))}</h3>
          <p>${state.ideasLoading ? 'Finding a few useful moves for this focus…' : 'Start from one clear move and make the smallest playable version first.'}</p>
          <div class="prompt-actions" style="margin-top:14px"><button class="btn primary" data-refresh="normal" data-refresh-mode="normal">${state.ideasLoading ? 'Loading…' : 'Show ideas'}</button></div>
        </div>
      </div>
    `;
    return;
  }
  els.wizardBody.innerHTML = `
    <div class="build-workspace">
      <div class="phase-focus">${focusTabs}</div>
      ${stageGuide}
      ${composerNudge}
      ${gearWorkflow}
      <div class="prompt-scroll stack">${state.prompts.map(renderPromptCard).join('')}</div>
    </div>
  `;
}

function renderBody() {
  const screen = currentScreen();
  if (screen.id === 'song') renderSongEntry();
  else if (screen.id === 'setup') renderSetup();
  else renderBuild();
}

function renderAll() {
  renderStepStrip();
  renderScreenHeader();
  renderBody();
  renderSectionSummary();
  renderTrackPanel();
  renderPlanSummary();
  renderTracePanel();
  refreshExportLinks();
}

function maybeAutoRefreshBuild() {
  const screen = currentScreen();
  if (screen.type !== 'build') return;
  if (state.plan[activeStageId(screen)] || state.prompts.length || state.ideasLoading) return;
  refreshPrompts({ mode: state.promptMode || 'normal' });
}

function setProfileFromInput(input) {
  const name = input.dataset.profile;
  if (!name) return;
  if (name === 'gearFocus' || name === 'domainFilters') {
    const current = new Set(state.profile[name] || []);
    if (input.checked) current.add(input.value);
    else current.delete(input.value);
    state.profile[name] = [...current];
  } else if (name === 'noteSpelling') {
    setNoteSpelling(input.value);
  } else if (name === 'tempo') {
    state.profile[name] = Number(input.value || 0);
  } else {
    state.profile[name] = input.value;
    if (name === 'pitchWorld') {
      setPitchPath('scale');
    }
    if (name === 'selectedRaga') {
      state.profile.pitchPath = 'raga';
      rememberRagaChoice(input.value);
    }
  }
  syncProfileDomains();
  renderSectionSummary();
  renderStepStrip();
  refreshExportLinks();
  saveAppState();
}

function stepTo(index) {
  state.screenIndex = Math.max(0, Math.min(index, SCREENS.length - 1));
  state.prompts = [];
  state.promptMode = 'normal';
  renderAll();
  saveAppState();
  maybeAutoRefreshBuild();
}

function next() {
  if (state.screenIndex < SCREENS.length - 1) stepTo(state.screenIndex + 1);
  else toast('Section wizard complete');
}

function back() {
  if (state.screenIndex > 0) stepTo(state.screenIndex - 1);
}

function findVisibleIdea(id) {
  const all = [...state.prompts, ...Object.values(state.plan), ...state.searchResults];
  if (state.ideas) all.push(...state.ideas.filter((idea) => idea.id === id));
  return all.find((idea) => ideaRef(idea) === id || idea.id === id) || null;
}

function useIdeaById(id, targetStageId = activeStageId()) {
  const idea = findVisibleIdea(id);
  if (!idea) return false;
  const stageId = targetStageId || idea._stageId || activeStageId();
  const enrichedIdea = {
    ...idea,
    _stageId: stageId,
    friendly: ideaPresentation(idea, stageId),
  };
  state.plan[stageId] = enrichedIdea;
  state.traceIdea = enrichedIdea;
  markIdeaUsed(enrichedIdea);
  state.prompts = [];
  renderAll();
  saveAppState();
  return true;
}

function applyFeedbackAction(action, id) {
  const idea = findVisibleIdea(id) || { id, _indexKey: id };
  const current = state.ideaFeedback[id] || feedbackForIdea(idea);
  if (action === 'pin') {
    updateIdeaFeedback(id, { pinned: !current.pinned, rejected: false });
    toast(current.pinned ? 'Idea unpinned' : 'Idea pinned');
    renderAll();
    if (state.searchResults.length) renderIdeaResults(state.searchResults);
    return;
  }
  if (action === 'reject') {
    updateIdeaFeedback(id, { rejected: true, pinned: false });
    state.prompts = state.prompts.filter((item) => ideaRef(item) !== ideaRef(idea));
    state.searchResults = state.searchResults.filter((item) => ideaRef(item) !== ideaRef(idea));
    toast('Idea rejected locally');
    renderAll();
    if (currentScreen().type === 'build' && !state.plan[activeStageId()]) refreshPrompts({ mode: state.promptMode || 'fresh', inspiration: true });
  }
}

function showSourceForId(id) {
  const sourceIdea = findVisibleIdea(id);
  state.traceIdea = sourceIdea ? {
    ...sourceIdea,
    friendly: sourceIdea.friendly || ideaPresentation(sourceIdea, sourceIdea._stageId || sourceIdea.stageBucket || activeStageId()),
  } : null;
  renderTracePanel();
  setUtilityPanel('trace', true);
  saveAppState();
}

function startNewSong() {
  state.song = createDraftSong();
  state.currentSectionId = null;
  state.profile = { ...DEFAULT_PROFILE };
  state.lastSelectedRaga = '';
  syncProfileDomains();
  state.plan = {};
  state.phaseFocus = {};
  state.prompts = [];
  state.promptMode = 'normal';
  state.traceIdea = null;
  state.screenIndex = 1;
  renderAll();
  saveAppState();
}

function startNewSectionForSong() {
  state.currentSectionId = null;
  state.profile = {
    ...DEFAULT_PROFILE,
    keyRoot: state.profile.keyRoot,
    pitchWorld: state.profile.pitchWorld,
    pitchPath: state.profile.pitchPath,
    selectedRaga: state.profile.selectedRaga,
    noteSpelling: state.profile.noteSpelling,
    tempo: state.profile.tempo,
    groove: state.profile.groove,
    mood: state.profile.mood,
    energy: state.profile.energy,
    instrument: state.profile.instrument,
    gearFocus: [...(state.profile.gearFocus || [])],
    domainFilters: [...(state.profile.domainFilters || [])],
    notes: '',
    variationOf: '',
  };
  rememberRagaChoice();
  syncProfileDomains();
  state.plan = {};
  state.phaseFocus = {};
  state.prompts = [];
  state.promptMode = 'normal';
  state.traceIdea = null;
  state.screenIndex = 1;
  renderAll();
  saveAppState();
}

function openSavedSection(id) {
  const section = savedSections().find((item) => item.id === id);
  if (!section) {
    toast('Saved section not found');
    return;
  }
  const profile = { ...DEFAULT_PROFILE, ...(section.profile || {}) };
  profile.noteSpelling = profile.noteSpelling || 'sharps';
  profile.keyRoot = normaliseKeyRoot(profile.keyRoot || DEFAULT_PROFILE.keyRoot, profile.noteSpelling);
  profile.pitchPath = profile.pitchPath || (profile.selectedRaga ? 'raga' : 'scale');
  state.lastSelectedRaga = profile.selectedRaga || state.lastSelectedRaga || '';
  if (profile.pitchPath === 'scale') profile.selectedRaga = '';
  const openedSong = section.song || {
    id: `song_from_${section.id}`,
    title: section.summary?.title || 'Existing Song',
    sections: [section],
    updatedAt: section.createdAt || new Date().toISOString(),
  };
  const hasOpenedSection = (openedSong.sections || []).some((item) => item.id === section.id);
  state.song = normaliseSong(hasOpenedSection ? openedSong : {
    ...openedSong,
    sections: [
      normaliseSectionSummary({
        id: section.id,
        title: section.summary?.title || profile.sectionType || 'Section',
        profile,
        summary: section.summary,
        compositionStatus: section.compositionStatus,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
      }),
      ...(openedSong.sections || []),
    ].slice(0, 24),
  });
  state.currentSectionId = section.id;
  state.profile = profile;
  syncProfileDomains();
  state.plan = section.plan || {};
  state.phaseFocus = {};
  state.prompts = [];
  state.promptMode = 'normal';
  state.traceIdea = null;
  state.screenIndex = 1;
  renderAll();
  saveAppState();
}

function continueSection(sectionId = '') {
  if (sectionId && sectionId !== state.currentSectionId) {
    openSavedSection(sectionId);
  }
  stepTo(screenIndexById(nextSectionScreenId(state.plan, state.profile)));
}

function saveCurrentSection() {
  const snapshot = payload();
  state.currentSectionId = snapshot.id;
  const existingSongSection = (state.song?.sections || []).find((section) => section.id === snapshot.id);
  const existingSavedSection = savedSections().find((section) => section.id === snapshot.id);
  const sectionSummary = {
    id: snapshot.id,
    title: snapshot.summary?.title || state.profile.sectionType || 'Section',
    profile: snapshot.profile,
    summary: snapshot.summary,
    compositionStatus: existingSongSection?.compositionStatus || existingSavedSection?.compositionStatus || inferSectionStatus(snapshot),
    variationOf: existingSongSection?.variationOf || existingSavedSection?.variationOf || state.profile.variationOf || '',
    arrangementNote: existingSongSection?.arrangementNote || existingSavedSection?.arrangementNote || '',
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
  const updatedSongBase = {
    ...normaliseSong(state.song || createDraftSong()),
    updatedAt: new Date().toISOString(),
    sections: [
      sectionSummary,
      ...((state.song?.sections || []).filter((section) => section.id !== snapshot.id)),
    ].slice(0, 24),
  };
  const updatedSong = autoPlaceSectionInSong(updatedSongBase, sectionSummary);
  state.song = updatedSong;
  snapshot.song = updatedSong;
  snapshot.compositionStatus = sectionSummary.compositionStatus;
  snapshot.variationOf = sectionSummary.variationOf;
  snapshot.arrangementNote = sectionSummary.arrangementNote;
  try {
    savePlanSnapshot(snapshot);
    saveAppState();
  } catch (error) {
    console.error(error);
    renderAll();
    toast('Could not save locally. Export a copy instead.');
    return;
  }
  renderAll();
  toast('Saved locally');
}

function renderIdeaResults(results = []) {
  const canUse = currentScreen().type === 'build';
  els.searchResults.innerHTML = results.length ? results.map((idea) => {
    const stageId = canUse ? activeStageId() : (idea.stageBucket || currentScreen().id);
    const presentation = ideaPresentation(idea, stageId);
    const feedback = feedbackForIdea(idea);
    return `
      <div class="result-card">
        <span>Book ${idea.bookNumber} · ${escapeHtml((idea.stageBucket || '').replaceAll('_', ' '))}</span>
        <p>${escapeHtml(presentation.action)}</p>
        ${presentation.playFirst ? `
          <div class="result-play-first">
            <strong>${escapeHtml(presentation.playFirst.headline)}</strong>
            <em>${escapeHtml(presentation.playFirst.noteCue || presentation.playFirst.check || '')}</em>
          </div>
        ` : ''}
        <p class="result-explain">${escapeHtml(presentation.plainMeaning || '')}</p>
        <div class="chips" style="margin-top:8px">
          ${feedback.pinned ? `<span class="chip idea-tag">pinned</span>` : ''}
          ${feedback.usedAt ? `<span class="chip">used before</span>` : ''}
          ${presentation.tags.slice(0, 4).map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="prompt-actions" style="margin-top:10px">
          ${canUse ? `<button class="btn primary small" data-use="${escapeHtml(ideaRef(idea))}">Use here</button>` : ''}
          <button class="btn small ${feedback.pinned ? 'is-active' : ''}" data-feedback="pin" data-feedback-idea="${escapeHtml(ideaRef(idea))}">${feedback.pinned ? 'Pinned' : 'Pin'}</button>
          <button class="btn small" data-feedback="reject" data-feedback-idea="${escapeHtml(ideaRef(idea))}">Reject</button>
          <button class="btn small" data-source="${escapeHtml(ideaRef(idea))}">Source</button>
        </div>
      </div>
    `;
  }).join('') : `<div class="result-card muted-box">No results.</div>`;
}

async function showSearchResults() {
  const ideas = await loadIdeaContext();
  if (!ideas?.length) return;
  const results = searchIdeas(ideas, els.searchInput.value, {}).slice(0, 8);
  state.searchResults = results;
  renderIdeaResults(results);
}

async function showContextualResults({ random = false } = {}) {
  const stageId = currentScreen().type === 'build' ? activeStageId() : 'section_identity';
  const mode = random ? 'fresh' : (state.promptMode || 'normal');
  const contextIdeas = await loadIdeaContext(stageContextIds(stageId, mode));
  if (!contextIdeas?.length) return;
  const results = generateStagePrompts(contextIdeas, state.profile, stageId, state.plan, {
    inspiration: random,
    mode,
    recentIds: state.recentIdeaIds,
    feedback: state.ideaFeedback,
  }).slice(0, 8).map((idea) => ({ ...idea, _stageId: stageId }));
  state.searchResults = results;
  if (random) {
    state.recentIdeaIds = [
      ...results.map((idea) => idea.id),
      ...state.recentIdeaIds.filter((id) => !results.some((idea) => idea.id === id)),
    ].slice(0, 80);
  }
  renderIdeaResults(results);
}

function bindEvents() {
  const prepareMarkdownExport = (event) => {
    try {
      exportPlanMarkdown(payload(), STAGES, event.currentTarget);
    } catch (error) {
      event.preventDefault();
      console.error(error);
      toast('Markdown export is not ready yet.');
    }
  };
  const prepareJsonExport = (event) => {
    try {
      exportPlanJson(payload(), event.currentTarget);
    } catch (error) {
      event.preventDefault();
      console.error(error);
      toast('JSON export is not ready yet.');
    }
  };

  document.addEventListener('click', (event) => {
    const feedback = event.target.closest('[data-feedback]');
    if (!feedback) return;
    event.preventDefault();
    event.stopPropagation();
    applyFeedbackAction(feedback.dataset.feedback, feedback.dataset.feedbackIdea);
  }, true);

  document.addEventListener('click', (event) => {
    const autoArrange = event.target.closest('[data-auto-arrange]');
    if (autoArrange && !els.wizardBody.contains(autoArrange)) {
      autoArrangeSong();
      return;
    }
    const buildSlot = event.target.closest('[data-build-slot]');
    if (buildSlot && !els.wizardBody.contains(buildSlot)) {
      buildSectionForSlot(buildSlot.dataset.buildSlot);
      return;
    }
    const transitionSlot = event.target.closest('[data-transition-slot]');
    if (transitionSlot && !els.wizardBody.contains(transitionSlot)) {
      focusTransitionFromSlot(transitionSlot.dataset.transitionSlot);
      return;
    }
    const createVariation = event.target.closest('[data-create-variation]');
    if (createVariation && !els.wizardBody.contains(createVariation)) {
      createVariationFromSection(createVariation.dataset.createVariation, createVariation.dataset.variationSlot || '');
      return;
    }
    const openArrangement = event.target.closest('[data-open-arrangement-section]');
    if (openArrangement && !els.wizardBody.contains(openArrangement)) {
      openSavedSection(openArrangement.dataset.openArrangementSection);
      return;
    }
    const clearArrangement = event.target.closest('[data-clear-arrangement-slot]');
    if (clearArrangement && !els.wizardBody.contains(clearArrangement)) {
      setArrangementSlot(clearArrangement.dataset.clearArrangementSlot, '');
      return;
    }
    const panelButton = event.target.closest('[data-open-panel]');
    if (panelButton) {
      setUtilityPanel(panelButton.dataset.openPanel, true);
      return;
    }
    const drawerFeedback = event.target.closest('[data-feedback]');
    if (drawerFeedback && !els.wizardBody.contains(drawerFeedback)) {
      applyFeedbackAction(drawerFeedback.dataset.feedback, drawerFeedback.dataset.feedbackIdea);
      return;
    }
    const drawerSource = event.target.closest('[data-source]');
    if (drawerSource && !els.wizardBody.contains(drawerSource)) {
      showSourceForId(drawerSource.dataset.source);
      return;
    }
    const drawerUse = event.target.closest('[data-use]');
    if (drawerUse && !els.wizardBody.contains(drawerUse)) {
      if (currentScreen().type === 'build') useIdeaById(drawerUse.dataset.use, activeStageId());
      else toast('Open a build phase before choosing an idea');
      return;
    }
  });

  document.addEventListener('change', (event) => {
    const statusSelect = event.target.closest('[data-section-status]');
    if (statusSelect) {
      setSectionStatus(statusSelect.dataset.sectionStatus, statusSelect.value);
      return;
    }
    const arrangementSlot = event.target.closest('[data-arrangement-slot]');
    if (arrangementSlot && !els.wizardBody.contains(arrangementSlot)) {
      setArrangementSlot(arrangementSlot.dataset.arrangementSlot, arrangementSlot.value);
    }
  });

  els.panelCloseBtn?.addEventListener('click', () => setUtilityPanel(state.utilityPanel, false));

  els.stepStrip.addEventListener('click', (event) => {
    const button = event.target.closest('[data-step]');
    if (button) stepTo(Number(button.dataset.step));
  });

  els.wizardBody.addEventListener('input', (event) => {
    const songTitle = event.target.closest('[data-song-title]');
    if (songTitle) {
      state.song = {
        ...(state.song || createDraftSong()),
        title: songTitle.value || 'New Song',
        updatedAt: new Date().toISOString(),
      };
      renderSectionSummary();
      saveAppState();
      return;
    }

    const input = event.target.closest('[data-profile]');
    if (!input) return;
    setProfileFromInput(input);
  });

  els.wizardBody.addEventListener('change', (event) => {
    const arrangementSlot = event.target.closest('[data-arrangement-slot]');
    if (arrangementSlot) {
      setArrangementSlot(arrangementSlot.dataset.arrangementSlot, arrangementSlot.value);
      return;
    }

    const input = event.target.closest('[data-profile]');
    if (!input) return;
    setProfileFromInput(input);
    if (currentScreen().id === 'setup') renderBody();
  });

  els.wizardBody.addEventListener('click', (event) => {
    const autoArrange = event.target.closest('[data-auto-arrange]');
    if (autoArrange) {
      autoArrangeSong();
      return;
    }

    const buildSlot = event.target.closest('[data-build-slot]');
    if (buildSlot) {
      event.preventDefault();
      event.stopPropagation();
      buildSectionForSlot(buildSlot.dataset.buildSlot);
      return;
    }

    const transitionSlot = event.target.closest('[data-transition-slot]');
    if (transitionSlot) {
      event.preventDefault();
      event.stopPropagation();
      focusTransitionFromSlot(transitionSlot.dataset.transitionSlot);
      return;
    }

    const createVariation = event.target.closest('[data-create-variation]');
    if (createVariation) {
      createVariationFromSection(createVariation.dataset.createVariation, createVariation.dataset.variationSlot || '');
      return;
    }

    const openArrangement = event.target.closest('[data-open-arrangement-section]');
    if (openArrangement) {
      openSavedSection(openArrangement.dataset.openArrangementSection);
      return;
    }

    const clearArrangement = event.target.closest('[data-clear-arrangement-slot]');
    if (clearArrangement) {
      setArrangementSlot(clearArrangement.dataset.clearArrangementSlot, '');
      return;
    }

    const newSong = event.target.closest('[data-new-song]');
    if (newSong) {
      startNewSong();
      return;
    }

    const newSection = event.target.closest('[data-new-section]');
    if (newSection) {
      startNewSectionForSong();
      return;
    }

    const openSection = event.target.closest('[data-open-section]');
    if (openSection) {
      openSavedSection(openSection.dataset.openSection);
      return;
    }

    const continueSectionButton = event.target.closest('[data-continue-section], [data-continue-current]');
    if (continueSectionButton) {
      continueSection(continueSectionButton.dataset.continueSection || '');
      return;
    }

    const stepTarget = event.target.closest('[data-step-target]');
    if (stepTarget) {
      stepTo(screenIndexById(stepTarget.dataset.stepTarget));
      return;
    }

    const phaseFocus = event.target.closest('[data-phase-focus]');
    if (phaseFocus) {
      state.phaseFocus[currentScreen().id] = phaseFocus.dataset.phaseFocus;
      state.prompts = [];
      state.promptMode = 'normal';
      renderAll();
      saveAppState();
      maybeAutoRefreshBuild();
      return;
    }

    const pitchPathButton = event.target.closest('[data-pitch-path]');
    if (pitchPathButton) {
      setPitchPath(pitchPathButton.dataset.pitchPath);
      syncProfileDomains();
      renderBody();
      renderSectionSummary();
      renderStepStrip();
      refreshExportLinks();
      saveAppState();
      return;
    }

    const noteSpellingButton = event.target.closest('[data-note-spelling]');
    if (noteSpellingButton) {
      setNoteSpelling(noteSpellingButton.dataset.noteSpelling);
      renderBody();
      renderSectionSummary();
      renderStepStrip();
      refreshExportLinks();
      saveAppState();
      return;
    }

    const noteSpellingControl = event.target.closest('.note-spelling-control');
    if (noteSpellingControl) {
      const rect = noteSpellingControl.getBoundingClientRect();
      const nextSpelling = event.clientX > rect.left + rect.width / 2 ? 'flats' : 'sharps';
      setNoteSpelling(nextSpelling);
      renderBody();
      renderSectionSummary();
      renderStepStrip();
      refreshExportLinks();
      saveAppState();
      return;
    }

    const keyRoot = event.target.closest('[data-key-root]');
    if (keyRoot) {
      state.profile.keyRoot = keyRoot.dataset.keyRoot;
      if (state.profile.keyRoot.includes('b')) state.profile.noteSpelling = 'flats';
      if (state.profile.keyRoot.includes('#')) state.profile.noteSpelling = 'sharps';
      renderBody();
      renderSectionSummary();
      renderStepStrip();
      refreshExportLinks();
      saveAppState();
      return;
    }

    const refresh = event.target.closest('[data-refresh]');
    if (refresh) {
      const mode = refresh.dataset.refreshMode || (refresh.dataset.refresh === 'normal' ? 'normal' : 'fresh');
      return refreshPrompts({ inspiration: refresh.dataset.refresh !== 'normal', mode });
    }

    const feedback = event.target.closest('[data-feedback]');
    if (feedback) {
      applyFeedbackAction(feedback.dataset.feedback, feedback.dataset.feedbackIdea);
      return;
    }

    const use = event.target.closest('[data-use]');
    if (use) {
      useIdeaById(use.dataset.use, activeStageId());
      return;
    }

    const source = event.target.closest('[data-source]');
    if (source) {
      showSourceForId(source.dataset.source);
      return;
    }

    const rechoose = event.target.closest('[data-rechoose]');
    if (rechoose) {
      delete state.plan[rechoose.dataset.rechoose];
      renderAll();
      saveAppState();
      refreshPrompts({ inspiration: rechoose.dataset.rechooseMode !== 'normal', mode: rechoose.dataset.rechooseMode || 'normal' });
    }
  });

  els.backBtn.addEventListener('click', back);
  els.nextBtn.addEventListener('click', next);
  els.loadIdeasBtn.addEventListener('click', () => currentScreen().type === 'build' ? refreshPrompts() : ensureIdeasLoaded());
  els.inspireBtn.addEventListener('click', () => refreshPrompts({ inspiration: true, mode: 'fresh' }));
  els.saveBtn.addEventListener('click', saveCurrentSection);
  els.exportJsonBtn.addEventListener('pointerdown', prepareJsonExport);
  els.exportJsonBtn.addEventListener('focus', prepareJsonExport);
  els.exportJsonBtn.addEventListener('click', prepareJsonExport);
  els.exportMdBtn.addEventListener('pointerdown', prepareMarkdownExport);
  els.exportMdBtn.addEventListener('focus', prepareMarkdownExport);
  els.exportMdBtn.addEventListener('click', prepareMarkdownExport);
  els.searchBtn.addEventListener('click', showSearchResults);
  els.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') showSearchResults();
  });
  els.contextIdeasBtn?.addEventListener('click', () => showContextualResults());
  els.randomSearchBtn?.addEventListener('click', () => showContextualResults({ random: true }));
}

async function init() {
  state.bootstrap = await loadBootstrapData();
  hydrateState();
  renderStatus();
  renderAll();
  bindEvents();
  setUtilityPanel(state.utilityPanel, false);
}

init().catch((error) => {
  console.error(error);
  els.statusCard.textContent = 'Could not load app data. Make sure the data folder is present and you are running from GitHub Pages or a local server.';
});
