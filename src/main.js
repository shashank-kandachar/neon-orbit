import { STAGES, APP_OPTIONS, DEFAULT_PROFILE } from './config.js?v=keyfirst3.5';
import { loadBootstrapData, loadIdeas } from './data-loader.js?v=keyfirst3.5';
import { generateStagePrompts, searchIdeas, buildSectionSummary } from './engine.js?v=keyfirst3.5';
import { loadState, saveState, clearState, savePlanSnapshot } from './storage.js?v=keyfirst3.5';
import { exportPlanJson, exportPlanMarkdown } from './export-utils.js?v=keyfirst3.5';

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
  if (screen.id === 'pitch') return Boolean(state.profile.keyRoot && state.profile.pitchWorld);
  if (screen.id === 'motion') return Boolean(state.profile.tempo && state.profile.groove);
  if (screen.id === 'identity') return Boolean(state.profile.mood && state.profile.sectionType && state.profile.energy);
  if (screen.id === 'source') return Boolean(state.profile.instrument);
  if (screen.type === 'build') return Boolean(state.plan[screen.id]);
  return false;
}

function selectedBuildCount() {
  return Object.keys(state.plan).length;
}

function payload() {
  return {
    id: `section_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile: state.profile,
    summary: buildSectionSummary(state.profile, state.plan),
    plan: state.plan,
  };
}

function refreshExportLinks() {
  exportPlanMarkdown(payload(), STAGES, els.exportMdBtn);
  exportPlanJson(payload(), els.exportJsonBtn);
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
    ['Key', p.selectedRaga ? `${p.keyRoot || '—'} ${p.selectedRaga}` : `${p.keyRoot || '—'} ${p.pitchWorld || ''}`],
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
    return `<div class="mini-card"><span>${escapeHtml(stage.label)}</span><p>${escapeHtml(item.prompt)}</p></div>`;
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
      <p style="margin-top:10px">${escapeHtml(item.prompt)}</p>
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
  const selectedRaga = state.bootstrap.ragaData.cards.find((card) => card.name === state.profile.selectedRaga);
  const keyRoots = APP_OPTIONS.keyRoots || ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const scaleLabel = state.profile.selectedRaga ? state.profile.selectedRaga : state.profile.pitchWorld;
  const keyLabel = `${state.profile.keyRoot || '—'} ${scaleLabel || ''}`.trim();

  els.wizardBody.innerHTML = `
    <div class="key-screen">
      <div class="field-card wide key-hero">
        <span class="mini-label">Current key world</span>
        <h3>${escapeHtml(keyLabel || 'Choose a note and scale')}</h3>
        <p>First choose your tonic/root note. Then choose the scale, mode or raga behaviour that colours the section.</p>
      </div>

      <div class="field-card wide">
        <h3>1. Choose the note</h3>
        <div class="note-grid" role="list" aria-label="Choose tonic note">
          ${keyRoots.map((note) => `
            <button type="button" class="note-button ${note === state.profile.keyRoot ? 'is-selected' : ''}" data-key-root="${escapeHtml(note)}">
              ${escapeHtml(note)}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="field-card">
        <label><span>2. Choose the scale / mode</span>
          <select data-profile="pitchWorld">${optionList(APP_OPTIONS.pitchWorlds, state.profile.pitchWorld)}</select>
        </label>
      </div>

      <div class="field-card">
        <label><span>Or choose a specific raga</span>
          <select data-profile="selectedRaga">${optionList(ragas, state.profile.selectedRaga, 'No specific raga')}</select>
        </label>
      </div>

      <div class="info-card wide">
        <h3>${state.profile.selectedRaga ? 'Raga behaviour' : 'Scale behaviour'}</h3>
        ${selectedRaga ? `
          <p>A raga is not just a scale. Treat ${escapeHtml(state.profile.keyRoot || '')} ${escapeHtml(selectedRaga.name)} as behaviour: ascent, descent, emphasis, phrase grammar, drone and mood.</p>
          <ul>
            <li><strong>Time / window:</strong> ${escapeHtml(selectedRaga.timeWindow || 'open')}</li>
            <li>${escapeHtml((selectedRaga.keyFeatures || [])[0] || selectedRaga.note || 'Use the raga as a behavioural card.')}</li>
          </ul>
        ` : `
          <p>Use ${escapeHtml(keyLabel)} as the tonal centre. Let the scale suggest the bass root, drone note, guitar comfort zones and synth patch colour.</p>
        `}
      </div>
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
  return `
    <article class="prompt-card ${index === 0 ? 'featured' : ''}">
      <div class="chips">
        <span class="chip">Book ${idea.bookNumber}</span>
        <span class="chip">${escapeHtml((idea.stageBucket || '').replaceAll('_', ' '))}</span>
        <span class="chip">${escapeHtml(idea.energy || 'energy open')}</span>
        ${idea._score ? `<span class="chip">match ${idea._score}</span>` : ''}
      </div>
      <p class="prompt-text">${escapeHtml(idea.prompt)}</p>
      <div class="chips">${(idea.instrumentFocus || []).slice(0, 3).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}</div>
      <div class="prompt-actions"><button class="btn primary small" data-use="${escapeHtml(idea.id)}">Use this</button><button class="btn small" data-source="${escapeHtml(idea.id)}">Source</button></div>
    </article>
  `;
}

function renderBuild() {
  const screen = currentScreen();
  const chosen = state.plan[screen.id];
  if (chosen) {
    els.wizardBody.innerHTML = `
      <div class="info-card wide"><h3>Chosen for this step</h3><p class="prompt-text" style="margin-top:8px">${escapeHtml(chosen.prompt)}</p><div class="chips" style="margin-top:10px"><span class="chip">Book ${chosen.bookNumber}</span><span class="chip">${escapeHtml(chosen.sourceBook || '')}</span></div><div class="prompt-actions" style="margin-top:14px"><button class="btn small" data-source="${escapeHtml(chosen.id)}">Source</button><button class="btn danger small" data-rechoose="${escapeHtml(screen.id)}">Choose again</button></div></div>
    `;
    return;
  }
  if (!state.prompts.length) {
    els.wizardBody.innerHTML = `
      <div class="info-card wide"><h3>Ready for prompts</h3><p>The app will show only three options for this step.</p><div class="prompt-actions" style="margin-top:14px"><button class="btn primary" data-refresh="normal">Show prompts</button></div></div>
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
  }
  renderSectionSummary();
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
    if (refresh) return refreshPrompts();

    const use = event.target.closest('[data-use]');
    if (use) {
      const idea = state.prompts.find((item) => item.id === use.dataset.use);
      if (!idea) return;
      state.plan[currentScreen().id] = idea;
      state.traceIdea = idea;
      state.prompts = [];
      renderAll();
      saveAppState();
      return;
    }

    const source = event.target.closest('[data-source]');
    if (source) {
      state.traceIdea = findVisibleIdea(source.dataset.source);
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
    els.searchResults.innerHTML = results.length ? results.map((idea) => `
      <div class="result-card"><span>Book ${idea.bookNumber} · ${escapeHtml((idea.stageBucket || '').replaceAll('_', ' '))}</span><p>${escapeHtml(idea.prompt)}</p></div>
    `).join('') : `<div class="result-card muted-box">No results.</div>`;
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
