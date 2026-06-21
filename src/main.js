import { STAGES, APP_OPTIONS, DEFAULT_PROFILE } from './config.js?v=keyfirst3.23';
import { loadBootstrapData, loadIdeas } from './data-loader.js?v=keyfirst3.23';
import { generateStagePrompts, searchIdeas, buildSectionSummary } from './engine.js?v=keyfirst3.23';
import { buildIdeaPresentation } from './idea-presenter.js?v=keyfirst3.23';
import { formatPitchSummary, getPitchContext, normaliseKeyRoot } from './pitch-utils.js?v=keyfirst3.23';
import { loadState, saveState, loadSavedPlans, savePlanSnapshot } from './storage.js?v=keyfirst3.23';
import { exportPlanJson, exportPlanMarkdown } from './export-utils.js?v=keyfirst3.23';

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

const state = {
  bootstrap: null,
  ideas: null,
  song: null,
  profile: { ...DEFAULT_PROFILE },
  plan: {},
  phaseFocus: {},
  screenIndex: 0,
  prompts: [],
  promptMode: 'normal',
  recentIdeaIds: [],
  searchResults: [],
  traceIdea: null,
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
  planSummary: $('planSummary'),
  tracePanel: $('tracePanel'),
  searchInput: $('searchInput'),
  searchBtn: $('searchBtn'),
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

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.add('hidden'), 2300);
}

function currentScreen() {
  return SCREENS[state.screenIndex] || SCREENS[0];
}

function createDraftSong() {
  return {
    id: `song_${Date.now()}`,
    title: 'New Song',
    sections: [],
    updatedAt: new Date().toISOString(),
  };
}

function saveAppState() {
  saveState({
    song: state.song,
    profile: state.profile,
    plan: state.plan,
    phaseFocus: state.phaseFocus,
    screenIndex: state.screenIndex,
    traceIdea: state.traceIdea,
  });
}

function hydrateState() {
  const stored = loadState();
  if (!stored) {
    state.song = createDraftSong();
    return;
  }
  state.song = stored.song || createDraftSong();
  state.profile = { ...DEFAULT_PROFILE, ...(stored.profile || {}) };
  state.profile.noteSpelling = state.profile.noteSpelling || 'sharps';
  state.profile.keyRoot = state.profile.keyRoot || DEFAULT_PROFILE.keyRoot;
  state.profile.pitchPath = state.profile.pitchPath || (state.profile.selectedRaga ? 'raga' : 'scale');
  if (!['scale', 'raga'].includes(state.profile.pitchPath)) state.profile.pitchPath = 'scale';
  if (state.profile.pitchPath === 'scale') {
    state.profile.selectedRaga = '';
    normaliseScalePitchWorld();
  }
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
  return {
    id: `section_${Date.now()}`,
    createdAt: new Date().toISOString(),
    song: state.song,
    profile: state.profile,
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
  exportPlanMarkdown(payload(), STAGES, els.exportMdBtn);
  exportPlanJson(payload(), els.exportJsonBtn);
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

function savedSections() {
  return loadSavedPlans();
}

function setUtilityPanel(panel = 'section', open = true) {
  if (!els.utilityPanel) return;
  state.utilityPanel = panel;
  const labels = {
    section: 'Current section',
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
    ['Key', currentKeyLabel()],
    ['Tempo', p.tempo ? `${p.tempo} BPM` : '—'],
    ['Groove', p.groove],
    ['Section', p.sectionType],
    ['Mood', p.mood],
    ['Energy', p.energy],
  ];
  els.sectionSummary.innerHTML = rows.map(([label, value]) => `
    <div class="mini-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '—')}</strong></div>
  `).join('');
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
  const sections = savedSections().slice(0, 10);
  els.wizardBody.innerHTML = `
    <div class="song-entry">
      <button type="button" class="entry-card primary-entry" data-new-song>
        <span class="mini-label">Start fresh</span>
        <strong>New Song</strong>
        <em>Begin with one section, then save it into the local song workspace.</em>
      </button>

      <div class="entry-card existing-entry">
        <span class="mini-label">Local workspace</span>
        <strong>Existing Song</strong>
        <em>Open a saved section and keep building the track from there.</em>
        <div class="section-list">
          ${sections.length ? sections.map((section) => `
            <button type="button" class="section-row" data-open-section="${escapeHtml(section.id)}">
              <span>${escapeHtml(section.summary?.title || section.profile?.sectionType || 'Saved section')}</span>
              <strong>${escapeHtml(section.profile ? `${section.profile.sectionType || 'Section'} · ${section.profile.keyRoot || ''} ${section.profile.selectedRaga || section.profile.pitchWorld || ''}` : 'Saved section')}</strong>
            </button>
          `).join('') : `<div class="mini-card muted-box">No saved sections yet. Start a new song and save the first section.</div>`}
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
  const keyRoots = APP_OPTIONS.keyRoots || ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
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
    </div>
  `;
}

function renderPitch() {
  const ragas = state.bootstrap.ragaData.cards.map((card) => card.name);
  const path = activePitchPath();
  const selectedRaga = selectedRagaCard();
  const pitchContext = getPitchContext(state.profile, selectedRaga);
  const pitchSummary = formatPitchSummary(state.profile, selectedRaga);
  const keyRoots = APP_OPTIONS.keyRoots || ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
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

async function ensureIdeasLoaded() {
  if (state.ideas) return true;
  els.loadIdeasBtn.textContent = 'Loading…';
  try {
    state.ideas = await loadIdeas();
    els.loadIdeasBtn.textContent = 'Idea pool loaded';
    toast('Idea pool loaded');
    return true;
  } catch (error) {
    console.error(error);
    toast('Could not load ideas. Use GitHub Pages or a local server.');
    return false;
  }
}

async function refreshPrompts({ inspiration = false, mode = null } = {}) {
  const screen = currentScreen();
  if (screen.type !== 'build') return;
  const ok = await ensureIdeasLoaded();
  if (!ok) return;
  const stageId = activeStageId(screen);
  const promptMode = mode || (inspiration ? 'fresh' : 'normal');
  state.promptMode = promptMode;
  state.prompts = generateStagePrompts(state.ideas, state.profile, stageId, state.plan, {
    inspiration,
    mode: promptMode,
    recentIds: state.recentIdeaIds,
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
  return `
    <article class="prompt-card ${index === 0 ? 'featured' : ''}">
      <div class="prompt-topline">
        <span class="mini-label">${escapeHtml(presentation.title)}</span>
        <div class="chips">
          ${presentation.tags.map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
      </div>
      <p class="prompt-text">${escapeHtml(presentation.action)}</p>
      <ol class="prompt-steps">
        ${presentation.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}
      </ol>
      ${presentation.pitchTip ? `<div class="prompt-tip">${escapeHtml(presentation.pitchTip)}</div>` : ''}
      <div class="prompt-footer">
        <span>${escapeHtml(presentation.sourceLine)}</span>
        <span>${escapeHtml(promptModeLabel(mode))}</span>
        ${relatedCount > 1 ? `<span>${relatedCount} related source versions kept</span>` : ''}
      </div>
      <div class="prompt-actions">
        <button class="btn primary small" data-use="${escapeHtml(ideaRef(idea))}">Use this</button>
        <button class="btn small" data-refresh="context" data-refresh-mode="${escapeHtml(mode)}">${escapeHtml(anotherModeLabel(mode))}</button>
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
  const focusTabs = (screen.stageIds || []).map((id) => {
    const item = STAGE_BY_ID[id];
    const label = item?.label.replace(/^\d+\.\s*/, '') || id.replaceAll('_', ' ');
    return `<button type="button" class="focus-chip ${id === stageId ? 'is-selected' : ''} ${state.plan[id] ? 'is-done' : ''}" data-phase-focus="${escapeHtml(id)}">${escapeHtml(label)}</button>`;
  }).join('');
  if (chosen) {
    const presentation = ideaPresentation(chosen, stageId);
    els.wizardBody.innerHTML = `
      <div class="build-workspace">
        <div class="phase-focus">${focusTabs}</div>
        <div class="info-card wide chosen-idea">
        <span class="mini-label">Chosen for ${escapeHtml(stage.label.replace(/^\d+\.\s*/, ''))}</span>
        <h3>${escapeHtml(presentation.title)}</h3>
        <p class="prompt-text" style="margin-top:8px">${escapeHtml(presentation.action)}</p>
        <ol class="prompt-steps">${presentation.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        ${presentation.pitchTip ? `<div class="prompt-tip">${escapeHtml(presentation.pitchTip)}</div>` : ''}
        <div class="chips" style="margin-top:10px">${presentation.tags.map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="prompt-actions" style="margin-top:14px"><button class="btn small" data-source="${escapeHtml(ideaRef(chosen))}">Source</button><button class="btn danger small" data-rechoose="${escapeHtml(stageId)}">Another idea</button></div>
        </div>
      </div>
    `;
    return;
  }
  if (!state.prompts.length) {
    els.wizardBody.innerHTML = `
      <div class="build-workspace">
        <div class="phase-focus">${focusTabs}</div>
        ${renderContextActions(stageId)}
        <div class="info-card wide">
          <span class="mini-label">${escapeHtml(screen.label)}</span>
          <h3>${escapeHtml(stage.label.replace(/^\d+\.\s*/, ''))}</h3>
          <p>The app will show only three plain-language ideas for this focus. Switch focus above when you want a different part of the phase.</p>
          <div class="prompt-actions" style="margin-top:14px"><button class="btn primary" data-refresh="normal" data-refresh-mode="normal">Show ideas</button></div>
        </div>
      </div>
    `;
    return;
  }
  els.wizardBody.innerHTML = `
    <div class="build-workspace">
      <div class="phase-focus">${focusTabs}</div>
      ${renderContextActions(stageId)}
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
  renderPlanSummary();
  renderTracePanel();
  refreshExportLinks();
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
    state.profile.noteSpelling = input.value;
    state.profile.keyRoot = normaliseKeyRoot(state.profile.keyRoot || DEFAULT_PROFILE.keyRoot, state.profile.noteSpelling);
  } else if (name === 'tempo') {
    state.profile[name] = Number(input.value || 0);
  } else {
    state.profile[name] = input.value;
    if (name === 'pitchWorld') {
      state.profile.pitchPath = 'scale';
      state.profile.selectedRaga = '';
      normaliseScalePitchWorld();
    }
    if (name === 'selectedRaga') {
      state.profile.pitchPath = 'raga';
    }
  }
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
  if (currentScreen().type === 'build' && state.ideas && !state.plan[activeStageId()]) refreshPrompts();
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
  state.profile = { ...DEFAULT_PROFILE };
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
  if (profile.pitchPath === 'scale') profile.selectedRaga = '';
  state.song = section.song || {
    id: `song_from_${section.id}`,
    title: section.summary?.title || 'Existing Song',
    sections: [section],
    updatedAt: section.createdAt || new Date().toISOString(),
  };
  state.profile = profile;
  state.plan = section.plan || {};
  state.phaseFocus = {};
  state.prompts = [];
  state.promptMode = 'normal';
  state.traceIdea = null;
  state.screenIndex = 1;
  renderAll();
  saveAppState();
}

function saveCurrentSection() {
  const snapshot = payload();
  savePlanSnapshot(snapshot);
  state.song = {
    ...(state.song || createDraftSong()),
    updatedAt: new Date().toISOString(),
    sections: [
      {
        id: snapshot.id,
        title: snapshot.summary?.title || state.profile.sectionType || 'Section',
        profile: snapshot.profile,
        createdAt: snapshot.createdAt,
      },
      ...((state.song?.sections || []).filter((section) => section.id !== snapshot.id)),
    ].slice(0, 24),
  };
  saveAppState();
  renderSectionSummary();
  toast('Saved locally');
}

function bindEvents() {
  const prepareMarkdownExport = (event) => exportPlanMarkdown(payload(), STAGES, event.currentTarget);
  const prepareJsonExport = (event) => exportPlanJson(payload(), event.currentTarget);

  document.addEventListener('click', (event) => {
    const panelButton = event.target.closest('[data-open-panel]');
    if (panelButton) {
      setUtilityPanel(panelButton.dataset.openPanel, true);
      return;
    }
    const drawerSource = event.target.closest('[data-source]');
    if (drawerSource && !els.wizardBody.contains(drawerSource)) {
      showSourceForId(drawerSource.dataset.source);
    }
  });

  els.panelCloseBtn?.addEventListener('click', () => setUtilityPanel(state.utilityPanel, false));

  els.stepStrip.addEventListener('click', (event) => {
    const button = event.target.closest('[data-step]');
    if (button) stepTo(Number(button.dataset.step));
  });

  els.wizardBody.addEventListener('input', (event) => {
    const input = event.target.closest('[data-profile]');
    if (!input) return;
    setProfileFromInput(input);
  });

  els.wizardBody.addEventListener('change', (event) => {
    const input = event.target.closest('[data-profile]');
    if (!input) return;
    setProfileFromInput(input);
    if (currentScreen().id === 'setup') renderBody();
  });

  els.wizardBody.addEventListener('click', (event) => {
    const newSong = event.target.closest('[data-new-song]');
    if (newSong) {
      startNewSong();
      return;
    }

    const openSection = event.target.closest('[data-open-section]');
    if (openSection) {
      openSavedSection(openSection.dataset.openSection);
      return;
    }

    const phaseFocus = event.target.closest('[data-phase-focus]');
    if (phaseFocus) {
      state.phaseFocus[currentScreen().id] = phaseFocus.dataset.phaseFocus;
      state.prompts = [];
      state.promptMode = 'normal';
      renderAll();
      saveAppState();
      if (state.ideas && !state.plan[activeStageId()]) refreshPrompts();
      return;
    }

    const pitchPathButton = event.target.closest('[data-pitch-path]');
    if (pitchPathButton) {
      state.profile.pitchPath = pitchPathButton.dataset.pitchPath;
      if (state.profile.pitchPath === 'scale') {
        state.profile.selectedRaga = '';
        normaliseScalePitchWorld();
      }
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

    const use = event.target.closest('[data-use]');
    if (use) {
      const idea = state.prompts.find((item) => ideaRef(item) === use.dataset.use || item.id === use.dataset.use);
      if (!idea) return;
      const stageId = idea._stageId || activeStageId();
      const enrichedIdea = {
        ...idea,
        friendly: ideaPresentation(idea, stageId),
      };
      state.plan[stageId] = enrichedIdea;
      state.traceIdea = enrichedIdea;
      state.prompts = [];
      renderAll();
      saveAppState();
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
      refreshPrompts();
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
  els.searchBtn.addEventListener('click', async () => {
    const ok = await ensureIdeasLoaded();
    if (!ok) return;
    const filters = currentScreen().type === 'build' ? { stage: activeStageId() } : {};
    const results = searchIdeas(state.ideas, els.searchInput.value, filters).slice(0, 8);
    state.searchResults = results;
    els.searchResults.innerHTML = results.length ? results.map((idea) => {
      const presentation = ideaPresentation(idea, idea.stageBucket || currentScreen().id);
      return `
        <div class="result-card">
          <span>Book ${idea.bookNumber} · ${escapeHtml((idea.stageBucket || '').replaceAll('_', ' '))}</span>
          <p>${escapeHtml(presentation.action)}</p>
          <div class="chips" style="margin-top:8px">${presentation.tags.slice(0, 4).map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}</div>
          <div class="prompt-actions" style="margin-top:10px"><button class="btn small" data-source="${escapeHtml(ideaRef(idea))}">Source</button></div>
        </div>
      `;
    }).join('') : `<div class="result-card muted-box">No results.</div>`;
  });
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
