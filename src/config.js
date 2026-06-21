export const STAGES = [
  { id: 'section_identity', label: '1. Define section identity', blurb: 'Set the emotional and compositional intent of the section.' },
  { id: 'pitch_material', label: '2. Choose scale / raga / mode', blurb: 'Pick the pitch world and the behavioural logic that will guide the section.' },
  { id: 'tempo_groove', label: '3. Choose tempo / groove / meter', blurb: 'Anchor the pulse, speed and rhythmic feel.' },
  { id: 'section_role', label: '4. Choose role of the section', blurb: 'Clarify what the section needs to do in the journey.' },
  { id: 'rhythmic_foundation', label: '5. Build rhythmic foundation', blurb: 'Shape drums, pulse and rhythmic identity.' },
  { id: 'bass_pulse', label: '6. Build bass or pulse', blurb: 'Create the low-end movement or sustained pulse.' },
  { id: 'harmony_drone', label: '7. Build harmony / drone / pad', blurb: 'Decide the harmonic or drone ground.' },
  { id: 'motif_hook', label: '8. Build guitar or synth motif', blurb: 'Design the riff, phrase, motif or hook.' },
  { id: 'texture_layer', label: '9. Add texture / field / sound-design layer', blurb: 'Add atmosphere, sonic detail and colour.' },
  { id: 'movement_modulation', label: '10. Add movement / automation / modulation', blurb: 'Make the section breathe, evolve and shimmer.' },
  { id: 'arrangement_arc', label: '11. Add arrangement arc', blurb: 'Shape the progression across the bars.' },
  { id: 'transitions', label: '12. Add transitions', blurb: 'Create handoffs, openings, breakdowns or exits.' },
  { id: 'mix_space', label: '13. Check mix space', blurb: 'Keep the section spacious, clear and playable.' },
  { id: 'live_translation', label: '14. Check live-performance feasibility', blurb: 'Make sure it can live on stage, not only in the DAW.' },
  { id: 'finish_review', label: '15. Save / review / commit', blurb: 'Wrap the section, capture the plan and decide the next move.' },
];

export const APP_OPTIONS = {
  keyRoots: ['C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B'],
  pitchWorlds: [
    'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian',
    'Melodic minor', 'Harmonic minor', 'Dorian ♭2', 'Lydian dominant', 'Altered',
    'Phrygian dominant', 'Double harmonic', 'Whole tone', 'Octatonic',
    'Minor pentatonic', 'Major pentatonic', 'Hexatonic colour', 'Raga-driven',
    'Drone-centred', 'Open pitch world'
  ],
  moods: [
    'Mystic', 'Hypnotic', 'Ritual', 'Expansive', 'Cosmic', 'Warm', 'Dark', 'Playful',
    'Meditative', 'Restless', 'Euphoric', 'Liminal', 'Earthy', 'Dreamlike'
  ],
  sectionTypes: [
    'Intro', 'Verse-like section', 'Main groove', 'Build', 'Breakdown', 'Bridge',
    'Transition', 'Interlude', 'Drop / peak', 'Outro', 'Live jam section'
  ],
  energyLevels: [
    'Low', 'Low to medium', 'Medium', 'Medium to high', 'High', 'Evolving', 'Wide', 'Ritual'
  ],
  grooveFeels: [
    'Straight 4/4', 'Triplet / swung', 'Off-beat pulse', 'Hypnotic ostinato', 'Polyrhythmic',
    'Broken beat', 'Downtempo roll', 'Psytrance drive', 'Ambient free pulse', 'Indian cyclic feel'
  ],
  instruments: [
    'Electric guitar', 'MicroFreak', 'Bass synth', 'Ableton drum rack', 'Pad / drone synth',
    'Field recordings', 'Voice / vocal texture', 'Percussion', 'Hybrid section'
  ],
  gear: [
    { id: 'guitar', label: 'Guitar' },
    { id: 'ableton', label: 'Ableton' },
    { id: 'microfreak', label: 'Arturia MicroFreak' },
    { id: 'sl2', label: 'Boss SL-2' },
    { id: 'ampero', label: 'Hotone Ampero II Stomp' },
    { id: 'field_recordings', label: 'Field recordings' },
  ],
  domainFilters: [
    'pitch-world', 'rhythm-groove', 'bass', 'harmony-drone', 'guitar', 'electronic-composition',
    'sound-design', 'sampling-field', 'microfreak', 'sl2', 'ampero', 'mixing-production',
    'psychedelic-structure', 'creative-process', 'live-performance'
  ]
};

export const DEFAULT_PROFILE = {
  pitchPath: 'scale',
  keyRoot: 'D',
  pitchWorld: 'Dorian',
  selectedRaga: '',
  tempo: 110,
  mood: 'Hypnotic',
  sectionType: 'Main groove',
  energy: 'Medium',
  groove: 'Hypnotic ostinato',
  instrument: 'Hybrid section',
  gearFocus: ['guitar', 'ableton'],
  domainFilters: ['pitch-world', 'rhythm-groove', 'sound-design'],
  notes: '',
};
