import { STAGES, APP_OPTIONS, DEFAULT_PROFILE } from './config.js?v=keyfirst3.11';
import { loadBootstrapData, loadIdeas } from './data-loader.js?v=keyfirst3.11';
import { generateStagePrompts, searchIdeas, buildSectionSummary } from './engine.js?v=keyfirst3.11';
import { buildIdeaPresentation } from './idea-presenter.js?v=keyfirst3.11';
import { formatPitchSummary, getPitchContext } from './pitch-utils.js?v=keyfirst3.11';
import { loadState, saveState, clearState, savePlanSnapshot } from './storage.js?v=keyfirst3.11';
import { exportPlanJson, exportPlanMarkdown } from './export-utils.js?v=keyfirst3.11';

const SETUP_SCREENS = [
  { id: 'start', type: 'start', label: 'Start', blurb: 'A calm start before the app serves prompts.' },
  { id: 'pitch', type: 'setup', label: 'Key + scale', blurb: 'Choose the tonic note first, then choose the scale, mode or raga behaviour.' },
  { id: 'motion', type: 'setup', label: 'Motion', blurb: 'Choose tempo and groove feel.' },
  { id: 'identity', type: 'setup', label: 'Identity', blurb: 'Choose mood, role and energy.' },
  { id: 'source', type: 'setup', label: 'Source', blurb: 'Choose the main instrument, gear focus and knowledge lanes.' },
];

const SCREENS = [...SETUP_SCREENS, ...STAGES.map((stage) => ({ ...stage, type: 'build' }))];

const state = {
  bootstrap: null,
  ideas: null,
  profile: { ...DEFAULT_PROFILE },
  plan: {},
  screenIndex: 0,
  prompts: [],
  traceIdea: null,
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

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.add('hidden'), 2300);
}

function currentScreen() {
  return SCREENS[state.screenIndex] || SCREENS[0];
}

function saveAppState() {
  saveState({
    profile: state.profile,
    plan: state.plan,
    screenIndex: state.screenIndex,
    traceIdea: state.traceIdea,
  });
}

function hydrateState() {
  const stored = loadState();
  if (!stored) return;
  state.profile = { ...DEFAULT_PROFILE, ...(stored.profile || {}) };
  state.profile.pitchPath = state.profile.pitchPath || (state.profile.selectedRaga ? 'raga' : 'scale');
  if (!['scale', 'raga'].includes(state.profile.pitchPath)) state.profile.pitchPath = 'scale';
  if (state.profile.pitchPath === 'scale') {
    state.profile.selectedRaga = '';
    normaliseScalePitchWorld();
  }
  state.plan = stored.plan || {};
  state.screenIndex = stored.screenIndex || stored.currentIndex || 0;
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
  if (screen.id === 'start') return true;
  if (screen.id === 'pitch') {
    if (activePitchPath() === 'raga') return Boolean(state.profile.keyRoot && state.profile.selectedRaga);
    return Boolean(state.profile.keyRoot && state.profile.pitchWorld);
  }
  if (screen.id === 'motion') return Boolean(state.profile.tempo && state.profile.groove);
  if (screen.id === 'identity') return Boolean(state.profile.mood && state.profile.sectionType && state.profile.energy);
  if (screen.id === 'source') return Boolean(state.profile.instrument);
  if (screen.type === 'build') return Boolean(state.plan[screen.id]);
  return false;
}

function selectedBuildCount() {
  return Object.keys(state.plan).length;
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
  const root = state.profile.keyRoot || '—';
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
      <span>${screen.type === 'build' ? 'build' : 'setup'}</span>
    </button>
  `).join('');
}

function renderScreenHeader() {
  const screen = currentScreen();
  els.screenKicker.textContent = screen.type === 'build' ? 'Build step' : 'Setup';
  els.screenTitle.textContent = screen.label.replace(/^\d+\.\s*/, '');
  els.screenBlurb.textContent = screen.blurb || '';
  els.progressPill.textContent = `Step ${state.screenIndex + 1} / ${SCREENS.length} · ${selectedBuildCount()} / ${STAGES.length} prompts`;
  els.backBtn.disabled = state.screenIndex === 0;
  els.nextBtn.textContent = state.screenIndex === SCREENS.length - 1 ? 'Finish' : 'Next';
  els.inspireBtn.style.display = screen.type === 'build' ? 'inline-flex' : 'none';
}

function renderSectionSummary() {
  const p = state.profile;
  const rows = [
    ['Key', currentKeyLabel()],
    ['Tempo', p.tempo ? `${p.tempo} BPM` : '—'],
    ['Mood', p.mood],
    ['Section', p.sectionType],
    ['Energy', p.energy],
    ['Groove', p.groove],
    ['Source', p.instrument],
    ['Gear', (p.gearFocus || []).join(', ') || 'None'],
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
      <div class="chips" style="margin-top:10px">
        ${(item.domainHints || []).slice(0, 5).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}
        ${(item.gearHints || []).slice(0, 4).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderStart() {
  els.wizardBody.innerHTML = `
    <div class="info-card wide">
      <h3>One decision at a time.</h3>
      <p>This version avoids the earlier dashboard clutter. Setup happens first, then the app gives you only three focused prompt cards per musical layer.</p>
    </div>
    <div class="card-grid three">
      <div class="field-card"><h3>1. Define</h3><p>Pitch, tempo, mood, groove and sound source.</p></div>
      <div class="field-card"><h3>2. Build</h3><p>Move through rhythm, bass, harmony, motif, texture, movement and arrangement.</p></div>
      <div class="field-card"><h3>3. Capture</h3><p>Save or export the section plan with source trace intact.</p></div>
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

async function refreshPrompts({ inspiration = false } = {}) {
  const screen = currentScreen();
  if (screen.type !== 'build') return;
  const ok = await ensureIdeasLoaded();
  if (!ok) return;
  state.prompts = generateStagePrompts(state.ideas, state.profile, screen.id, state.plan, { inspiration }).slice(0, 3);
  renderBuild();
}

function renderPromptCard(idea, index) {
  const presentation = ideaPresentation(idea);
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
        ${idea._score ? `<span>match ${idea._score}</span>` : ''}
      </div>
      <div class="prompt-actions"><button class="btn primary small" data-use="${escapeHtml(idea.id)}">Use this</button><button class="btn small" data-refresh="another">Another</button><button class="btn small" data-source="${escapeHtml(idea.id)}">Source</button></div>
    </article>
  `;
}

function renderBuild() {
  const screen = currentScreen();
  const chosen = state.plan[screen.id];
  if (chosen) {
    const presentation = ideaPresentation(chosen, screen.id);
    els.wizardBody.innerHTML = `
      <div class="info-card wide">
        <span class="mini-label">Chosen for this step</span>
        <h3>${escapeHtml(presentation.title)}</h3>
        <p class="prompt-text" style="margin-top:8px">${escapeHtml(presentation.action)}</p>
        <ol class="prompt-steps">${presentation.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        ${presentation.pitchTip ? `<div class="prompt-tip">${escapeHtml(presentation.pitchTip)}</div>` : ''}
        <div class="chips" style="margin-top:10px">${presentation.tags.map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}</div>
        <div class="prompt-actions" style="margin-top:14px"><button class="btn small" data-source="${escapeHtml(chosen.id)}">Source</button><button class="btn danger small" data-rechoose="${escapeHtml(screen.id)}">Another idea</button></div>
      </div>
    `;
    return;
  }
  if (!state.prompts.length) {
    els.wizardBody.innerHTML = `
      <div class="info-card wide"><h3>Ready for prompts</h3><p>The app will show only three plain-language ideas for this step.</p><div class="prompt-actions" style="margin-top:14px"><button class="btn primary" data-refresh="normal">Show ideas</button></div></div>
    `;
    return;
  }
  els.wizardBody.innerHTML = `<div class="stack">${state.prompts.map(renderPromptCard).join('')}</div>`;
}

function renderBody() {
  const screen = currentScreen();
  if (screen.id === 'start') renderStart();
  else if (screen.id === 'pitch') renderPitch();
  else if (screen.id === 'motion') renderMotion();
  else if (screen.id === 'identity') renderIdentity();
  else if (screen.id === 'source') renderSource();
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
  renderAll();
  saveAppState();
  if (currentScreen().type === 'build' && state.ideas && !state.plan[currentScreen().id]) refreshPrompts();
}

function next() {
  if (state.screenIndex < SCREENS.length - 1) stepTo(state.screenIndex + 1);
  else toast('Section wizard complete');
}

function back() {
  if (state.screenIndex > 0) stepTo(state.screenIndex - 1);
}

function findVisibleIdea(id) {
  const all = [...state.prompts, ...Object.values(state.plan)];
  if (state.ideas) all.push(...state.ideas.filter((idea) => idea.id === id));
  return all.find((idea) => idea.id === id) || null;
}

function bindEvents() {
  const prepareMarkdownExport = (event) => exportPlanMarkdown(payload(), STAGES, event.currentTarget);
  const prepareJsonExport = (event) => exportPlanJson(payload(), event.currentTarget);

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
    if (currentScreen().id === 'pitch' || currentScreen().id === 'source') renderBody();
  });

  els.wizardBody.addEventListener('click', (event) => {
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
      renderBody();
      renderSectionSummary();
      renderStepStrip();
      refreshExportLinks();
      saveAppState();
      return;
    }

    const refresh = event.target.closest('[data-refresh]');
    if (refresh) return refreshPrompts({ inspiration: refresh.dataset.refresh !== 'normal' });

    const use = event.target.closest('[data-use]');
    if (use) {
      const idea = state.prompts.find((item) => item.id === use.dataset.use);
      if (!idea) return;
      const enrichedIdea = {
        ...idea,
        friendly: ideaPresentation(idea),
      };
      state.plan[currentScreen().id] = enrichedIdea;
      state.traceIdea = enrichedIdea;
      state.prompts = [];
      renderAll();
      saveAppState();
      return;
    }

    const source = event.target.closest('[data-source]');
    if (source) {
      const sourceIdea = findVisibleIdea(source.dataset.source);
      state.traceIdea = sourceIdea ? {
        ...sourceIdea,
        friendly: sourceIdea.friendly || ideaPresentation(sourceIdea),
      } : null;
      renderTracePanel();
      saveAppState();
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
  els.inspireBtn.addEventListener('click', () => refreshPrompts({ inspiration: true }));
  els.saveBtn.addEventListener('click', () => { savePlanSnapshot(payload()); toast('Saved locally'); });
  els.exportJsonBtn.addEventListener('pointerdown', prepareJsonExport);
  els.exportJsonBtn.addEventListener('focus', prepareJsonExport);
  els.exportJsonBtn.addEventListener('click', prepareJsonExport);
  els.exportMdBtn.addEventListener('pointerdown', prepareMarkdownExport);
  els.exportMdBtn.addEventListener('focus', prepareMarkdownExport);
  els.exportMdBtn.addEventListener('click', prepareMarkdownExport);
  els.searchBtn.addEventListener('click', async () => {
    const ok = await ensureIdeasLoaded();
    if (!ok) return;
    const results = searchIdeas(state.ideas, els.searchInput.value, {}).slice(0, 8);
    els.searchResults.innerHTML = results.length ? results.map((idea) => {
      const presentation = ideaPresentation(idea, idea.stageBucket || currentScreen().id);
      return `
        <div class="result-card">
          <span>Book ${idea.bookNumber} · ${escapeHtml((idea.stageBucket || '').replaceAll('_', ' '))}</span>
          <p>${escapeHtml(presentation.action)}</p>
          <div class="chips" style="margin-top:8px">${presentation.tags.slice(0, 4).map((tag) => `<span class="chip idea-tag">${escapeHtml(tag)}</span>`).join('')}</div>
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
}

init().catch((error) => {
  console.error(error);
  els.statusCard.textContent = 'Could not load app data. Make sure the data folder is present and you are running from GitHub Pages or a local server.';
});
