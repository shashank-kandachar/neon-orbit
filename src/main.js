import { STAGES, APP_OPTIONS, DEFAULT_PROFILE } from './config.js';
import { loadBootstrapData, loadIdeas } from './data-loader.js';
import { generateStagePrompts, searchIdeas, buildSectionSummary } from './engine.js';
import { loadState, saveState, clearState, savePlanSnapshot } from './storage.js';
import { exportPlanJson, exportPlanMarkdown } from './export-utils.js';

const SETUP_STEPS = [
  { id: 'start', type: 'start', label: 'Start', blurb: 'Begin with a clear musical intention before choosing details.' },
  { id: 'pitch', type: 'setup', label: 'Pitch world', blurb: 'Choose the scale, mode, raga or drone logic.' },
  { id: 'motion', type: 'setup', label: 'Tempo + groove', blurb: 'Set the speed, pulse and rhythmic feel.' },
  { id: 'identity', type: 'setup', label: 'Mood + role', blurb: 'Define what this section is supposed to do.' },
  { id: 'source', type: 'setup', label: 'Instrument + gear', blurb: 'Choose the main sound source and optional hardware focus.' },
];

const SCREENS = [
  ...SETUP_STEPS,
  ...STAGES.map((stage) => ({ ...stage, type: 'build' })),
];

const state = {
  bootstrap: null,
  ideas: null,
  profile: { ...DEFAULT_PROFILE },
  plan: {},
  currentIndex: 0,
  currentPrompts: [],
  traceIdea: null,
};

const $ = (id) => document.getElementById(id);
const els = {
  dataStrip: $('dataStrip'),
  stepper: $('stepper'),
  progressText: $('progressText'),
  screenEyebrow: $('screenEyebrow'),
  screenTitle: $('screenTitle'),
  screenBlurb: $('screenBlurb'),
  stageCount: $('stageCount'),
  wizardBody: $('wizardBody'),
  backBtn: $('backBtn'),
  nextBtn: $('nextBtn'),
  inspireBtn: $('inspireBtn'),
  loadIdeasBtn: $('loadIdeasBtn'),
  saveBtn: $('saveBtn'),
  exportMdBtn: $('exportMdBtn'),
  exportJsonBtn: $('exportJsonBtn'),
  profileSummary: $('profileSummary'),
  planSummary: $('planSummary'),
  tracePanel: $('tracePanel'),
  searchInput: $('searchInput'),
  searchBtn: $('searchBtn'),
  searchResults: $('searchResults'),
  toast: $('toast'),
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.add('hidden'), 2400);
}

function saveAppState() {
  saveState({
    profile: state.profile,
    plan: state.plan,
    currentIndex: state.currentIndex,
    traceIdea: state.traceIdea,
  });
}

function hydrateState() {
  const stored = loadState();
  if (!stored) return;
  state.profile = { ...DEFAULT_PROFILE, ...(stored.profile || {}) };
  state.plan = stored.plan || {};
  state.currentIndex = stored.currentIndex || 0;
  state.traceIdea = stored.traceIdea || null;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function optionList(values, selected = '', empty = '') {
  const items = empty ? [`<option value="">${empty}</option>`] : [];
  values.forEach((value) => {
    items.push(`<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`);
  });
  return items.join('');
}

function currentScreen() {
  return SCREENS[state.currentIndex] || SCREENS[0];
}

function buildPayload() {
  return {
    id: `section_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile: state.profile,
    summary: buildSectionSummary(state.profile, state.plan),
    plan: state.plan,
  };
}

function completedBuildStages() {
  return Object.keys(state.plan).length;
}

function isScreenDone(screen) {
  if (screen.type === 'start') return true;
  if (screen.id === 'pitch') return Boolean(state.profile.pitchWorld);
  if (screen.id === 'motion') return Boolean(state.profile.tempo && state.profile.groove);
  if (screen.id === 'identity') return Boolean(state.profile.mood && state.profile.sectionType && state.profile.energy);
  if (screen.id === 'source') return Boolean(state.profile.instrument);
  if (screen.type === 'build') return Boolean(state.plan[screen.id]);
  return false;
}

function renderDataStrip() {
  const m = state.bootstrap.manifest;
  els.dataStrip.innerHTML = `
    <span><strong>${m.ideaCount.toLocaleString()}</strong> ideas</span>
    <span><strong>${m.bookCount}</strong> books</span>
    <span><strong>${m.ragaCount}</strong> ragas</span>
    <span><strong>${escapeHtml(m.auditStatus).replaceAll('_',' ')}</strong></span>
  `;
}

function renderStepper() {
  els.progressText.textContent = `Step ${state.currentIndex + 1} / ${SCREENS.length}`;
  els.stepper.innerHTML = SCREENS.map((screen, index) => `
    <button class="step-btn ${index === state.currentIndex ? 'active' : ''} ${isScreenDone(screen) ? 'done' : ''}" data-index="${index}">
      <span class="step-num">${index + 1}</span>
      <span class="step-copy">
        <strong>${escapeHtml(screen.label.replace(/^\d+\.\s*/, ''))}</strong>
        <span>${screen.type === 'build' ? 'compose step' : 'setup'}</span>
      </span>
    </button>
  `).join('');
}

function renderHeader() {
  const screen = currentScreen();
  els.screenEyebrow.textContent = screen.type === 'build' ? 'Build the section' : 'Setup';
  els.screenTitle.textContent = screen.label.replace(/^\d+\.\s*/, '');
  els.screenBlurb.textContent = screen.blurb || '';
  els.stageCount.textContent = `${completedBuildStages()} / ${STAGES.length} prompts`;
  els.backBtn.disabled = state.currentIndex === 0;
  els.nextBtn.textContent = state.currentIndex === SCREENS.length - 1 ? 'Finish' : 'Next';
  els.inspireBtn.style.display = screen.type === 'build' ? 'inline-flex' : 'none';
}

function renderProfileSummary() {
  const p = state.profile;
  const rows = [
    ['Pitch', p.selectedRaga ? `${p.pitchWorld} · ${p.selectedRaga}` : p.pitchWorld],
    ['Tempo', `${p.tempo} BPM`],
    ['Mood', p.mood],
    ['Section', p.sectionType],
    ['Energy', p.energy],
    ['Groove', p.groove],
    ['Source', p.instrument],
    ['Gear', (p.gearFocus || []).join(', ') || 'None'],
  ];
  els.profileSummary.innerHTML = rows.map(([label, value]) => `
    <div class="summary-item"><span>${label}</span><strong>${escapeHtml(value || '—')}</strong></div>
  `).join('');
}

function renderPlanSummary() {
  if (!Object.keys(state.plan).length) {
    els.planSummary.innerHTML = `<div class="plan-item empty">No build prompts chosen yet.</div>`;
    return;
  }
  els.planSummary.innerHTML = STAGES.map((stage) => {
    const item = state.plan[stage.id];
    if (!item) return '';
    return `<div class="plan-item"><span>${escapeHtml(stage.label)}</span><p>${escapeHtml(item.prompt)}</p></div>`;
  }).join('');
}

function renderTrace() {
  const item = state.traceIdea;
  if (!item) {
    els.tracePanel.innerHTML = `<p class="subtle">Choose “Source” on a prompt to see where it came from.</p>`;
    return;
  }
  els.tracePanel.innerHTML = `
    <div class="trace-card">
      <div class="eyebrow">Book ${item.bookNumber}</div>
      <h3>${escapeHtml(item.sourceBook || 'Unknown source')}</h3>
      <p class="subtle">${escapeHtml(item.sourceAuthor || '')}</p>
      <p style="margin-top:10px">${escapeHtml(item.prompt)}</p>
      <div class="chip-row" style="margin-top:10px">
        ${(item.domainHints || []).slice(0,5).map((d) => `<span class="chip">${escapeHtml(d)}</span>`).join('')}
        ${(item.gearHints || []).map((d) => `<span class="chip">${escapeHtml(d)}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderStart() {
  els.wizardBody.innerHTML = `
    <div class="start-panel">
      <div class="big-start">
        <h3>Less dashboard. More musical path.</h3>
        <p class="subtle">This version hides the big control surface. First you define the section, then the app gives you a few relevant prompts at each creative step.</p>
      </div>
      <div class="mode-list">
        <div class="mode-card"><strong>1. Choose</strong><p class="subtle">Pitch world, tempo, mood, section role and sound source.</p></div>
        <div class="mode-card"><strong>2. Build</strong><p class="subtle">Move through the section one layer at a time.</p></div>
        <div class="mode-card"><strong>3. Capture</strong><p class="subtle">Save or export the section plan with source traces intact.</p></div>
      </div>
      <div class="help-card">
        <strong>Stage 1 note</strong>
        <p class="subtle">The idea pool only loads when needed, so the interface stays calm until you reach the prompt-building part.</p>
      </div>
    </div>
  `;
}

function setProfileFromInput(name, value, checked = null) {
  if (name === 'gearFocus' || name === 'domainFilters') {
    const current = new Set(state.profile[name] || []);
    checked ? current.add(value) : current.delete(value);
    state.profile[name] = [...current];
  } else if (name === 'tempo') {
    state.profile[name] = Number(value || 0);
  } else {
    state.profile[name] = value;
  }
  renderProfileSummary();
  saveAppState();
}

function renderPitch() {
  const ragas = state.bootstrap.ragaData.cards.map((card) => card.name);
  const selectedRaga = state.bootstrap.ragaData.cards.find((card) => card.name === state.profile.selectedRaga);
  els.wizardBody.innerHTML = `
    <div class="choice-grid">
      <div class="choice-card">
        <label>Scale / raga / mode / pitch world
          <select data-profile="pitchWorld">${optionList(APP_OPTIONS.pitchWorlds, state.profile.pitchWorld)}</select>
        </label>
      </div>
      <div class="choice-card">
        <label>Specific raga, optional
          <select data-profile="selectedRaga">${optionList(ragas, state.profile.selectedRaga, 'No specific raga')}</select>
        </label>
      </div>
      <div class="choice-card wide help-card">
        <strong>Raga behaviour guardrail</strong>
        <p class="subtle">A raga is not just a scale. Use ascent/descent, emphasis, phrase grammar, drone and time/mood as behaviour.</p>
        ${selectedRaga ? `<ul>
          <li><strong>${escapeHtml(selectedRaga.name)}</strong>: ${escapeHtml(selectedRaga.timeWindow || 'time open')}</li>
          <li>${escapeHtml((selectedRaga.keyFeatures || [])[0] || selectedRaga.note || 'Use the raga as a behaviour card.')}</li>
        </ul>` : ''}
      </div>
    </div>
  `;
}

function renderMotion() {
  els.wizardBody.innerHTML = `
    <div class="choice-grid">
      <div class="choice-card">
        <label>Tempo
          <input data-profile="tempo" type="number" min="40" max="220" value="${state.profile.tempo}">
        </label>
      </div>
      <div class="choice-card">
        <label>Groove / rhythm feel
          <select data-profile="groove">${optionList(APP_OPTIONS.grooveFeels, state.profile.groove)}</select>
        </label>
      </div>
      <div class="choice-card wide help-card">
        <strong>Keep it playable</strong>
        <p class="subtle">Choose a feel you can imagine performing with guitar, Ableton clips and live hardware — not only programming in the piano roll.</p>
      </div>
    </div>
  `;
}

function renderIdentity() {
  els.wizardBody.innerHTML = `
    <div class="choice-grid">
      <div class="choice-card">
        <label>Mood
          <select data-profile="mood">${optionList(APP_OPTIONS.moods, state.profile.mood)}</select>
        </label>
      </div>
      <div class="choice-card">
        <label>Section type
          <select data-profile="sectionType">${optionList(APP_OPTIONS.sectionTypes, state.profile.sectionType)}</select>
        </label>
      </div>
      <div class="choice-card">
        <label>Energy
          <select data-profile="energy">${optionList(APP_OPTIONS.energyLevels, state.profile.energy)}</select>
        </label>
      </div>
      <div class="choice-card">
        <label>Short intent note
          <textarea data-profile="notes" rows="4" placeholder="What should this section feel like?">${escapeHtml(state.profile.notes || '')}</textarea>
        </label>
      </div>
    </div>
  `;
}

function renderSource() {
  const gear = APP_OPTIONS.gear.map((g) => `
    <label class="toggle-pill">
      <input data-profile="gearFocus" type="checkbox" value="${g.id}" ${(state.profile.gearFocus || []).includes(g.id) ? 'checked' : ''}>
      ${escapeHtml(g.label)}
    </label>
  `).join('');
  const domains = APP_OPTIONS.domainFilters.map((d) => `
    <label class="toggle-pill">
      <input data-profile="domainFilters" type="checkbox" value="${d}" ${(state.profile.domainFilters || []).includes(d) ? 'checked' : ''}>
      ${escapeHtml(d)}
    </label>
  `).join('');
  els.wizardBody.innerHTML = `
    <div class="choice-grid">
      <div class="choice-card wide">
        <label>Main instrument or sound source
          <select data-profile="instrument">${optionList(APP_OPTIONS.instruments, state.profile.instrument)}</select>
        </label>
      </div>
      <div class="choice-card wide">
        <strong>Optional gear focus</strong>
        <div class="gear-grid">${gear}</div>
      </div>
      <div class="choice-card wide">
        <strong>Knowledge filters</strong>
        <p class="subtle">Keep this light. Pick only the lanes you want the next prompts to favour.</p>
        <div class="domain-grid">${domains}</div>
      </div>
    </div>
  `;
}

async function ensureIdeas() {
  if (state.ideas) return true;
  els.loadIdeasBtn.textContent = 'Loading…';
  try {
    state.ideas = await loadIdeas();
    els.loadIdeasBtn.textContent = 'Idea pool loaded';
    toast('Idea pool loaded');
    return true;
  } catch (err) {
    toast('Could not load idea pool. Run from a local server.');
    console.error(err);
    return false;
  }
}

async function refreshPrompts({ inspiration = false } = {}) {
  if (!(await ensureIdeas())) return;
  const screen = currentScreen();
  if (screen.type !== 'build') return;
  state.currentPrompts = generateStagePrompts(state.ideas, state.profile, screen.id, state.plan, { inspiration }).slice(0, 3);
  renderBuild();
}

function renderPromptCard(idea, index) {
  return `
    <article class="prompt-card ${index === 0 ? 'featured' : ''}">
      <div class="chip-row">
        <span class="chip">Book ${idea.bookNumber}</span>
        <span class="chip">${escapeHtml(idea.stageBucket.replaceAll('_',' '))}</span>
        <span class="chip">${escapeHtml(idea.energy || 'energy open')}</span>
        ${idea._score ? `<span class="chip">match ${idea._score}</span>` : ''}
      </div>
      <p class="prompt-text">${escapeHtml(idea.prompt)}</p>
      <div class="chip-row">
        ${(idea.instrumentFocus || []).slice(0, 3).map((x) => `<span class="chip">${escapeHtml(x)}</span>`).join('')}
      </div>
      <div class="prompt-actions">
        <button class="btn primary small" data-use="${idea.id}">Use this</button>
        <button class="btn small" data-source="${idea.id}">Source</button>
      </div>
    </article>
  `;
}

function renderBuild() {
  const screen = currentScreen();
  const chosen = state.plan[screen.id];
  if (chosen) {
    els.wizardBody.innerHTML = `
      <div class="help-card">
        <strong>Chosen for this step</strong>
        <p class="prompt-text" style="margin-top:8px">${escapeHtml(chosen.prompt)}</p>
        <div class="chip-row" style="margin-top:10px">
          <span class="chip">Book ${chosen.bookNumber}</span>
          <span class="chip">${escapeHtml(chosen.sourceBook || '')}</span>
        </div>
        <div class="prompt-actions" style="margin-top:14px">
          <button class="btn small" data-source="${chosen.id}">Source</button>
          <button class="btn danger small" data-rechoose="${screen.id}">Choose again</button>
        </div>
      </div>
    `;
    return;
  }
  if (!state.currentPrompts.length) {
    els.wizardBody.innerHTML = `
      <div class="help-card">
        <strong>Ready for prompts</strong>
        <p class="subtle">Load the audited idea pool and the wizard will give you three focused options for this step.</p>
        <div class="prompt-actions" style="margin-top:14px">
          <button class="btn primary" data-refresh="normal">Show prompts</button>
        </div>
      </div>
    `;
    return;
  }
  els.wizardBody.innerHTML = `
    <div class="prompt-list">
      ${state.currentPrompts.map(renderPromptCard).join('')}
    </div>
  `;
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
  renderStepper();
  renderHeader();
  renderBody();
  renderProfileSummary();
  renderPlanSummary();
  renderTrace();
}

function next() {
  if (state.currentIndex < SCREENS.length - 1) {
    state.currentIndex += 1;
    state.currentPrompts = [];
    renderAll();
    saveAppState();
    if (currentScreen().type === 'build' && state.ideas) refreshPrompts();
  } else {
    toast('Section wizard complete');
  }
}

function back() {
  if (state.currentIndex === 0) return;
  state.currentIndex -= 1;
  state.currentPrompts = [];
  renderAll();
  saveAppState();
  if (currentScreen().type === 'build' && state.ideas && !state.plan[currentScreen().id]) refreshPrompts();
}

function bindEvents() {
  els.stepper.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-index]');
    if (!btn) return;
    state.currentIndex = Number(btn.dataset.index);
    state.currentPrompts = [];
    renderAll();
    saveAppState();
    if (currentScreen().type === 'build' && state.ideas && !state.plan[currentScreen().id]) refreshPrompts();
  });

  els.wizardBody.addEventListener('input', (e) => {
    const input = e.target.closest('[data-profile]');
    if (!input) return;
    setProfileFromInput(input.dataset.profile, input.value, input.checked);
  });
  els.wizardBody.addEventListener('change', (e) => {
    const input = e.target.closest('[data-profile]');
    if (!input) return;
    setProfileFromInput(input.dataset.profile, input.value, input.checked);
    if (currentScreen().id === 'pitch') renderPitch();
  });
  els.wizardBody.addEventListener('click', async (e) => {
    if (e.target.closest('[data-refresh]')) return refreshPrompts();
    const use = e.target.closest('[data-use]');
    if (use) {
      const idea = state.currentPrompts.find((item) => item.id === use.dataset.use);
      if (!idea) return;
      state.plan[currentScreen().id] = idea;
      state.traceIdea = idea;
      state.currentPrompts = [];
      renderAll();
      saveAppState();
      return;
    }
    const source = e.target.closest('[data-source]');
    if (source) {
      const all = [...state.currentPrompts, ...Object.values(state.plan)];
      state.traceIdea = all.find((item) => item.id === source.dataset.source) || null;
      renderTrace();
      saveAppState();
      return;
    }
    const rechoose = e.target.closest('[data-rechoose]');
    if (rechoose) {
      delete state.plan[rechoose.dataset.rechoose];
      renderAll();
      saveAppState();
      refreshPrompts();
    }
  });

  els.nextBtn.addEventListener('click', next);
  els.backBtn.addEventListener('click', back);
  els.loadIdeasBtn.addEventListener('click', () => refreshPrompts());
  els.inspireBtn.addEventListener('click', () => refreshPrompts({ inspiration: true }));
  els.saveBtn.addEventListener('click', () => {
    savePlanSnapshot(buildPayload());
    toast('Saved locally');
  });
  els.exportJsonBtn.addEventListener('click', () => exportPlanJson(buildPayload()));
  els.exportMdBtn.addEventListener('click', () => exportPlanMarkdown(buildPayload(), STAGES));
  els.searchBtn.addEventListener('click', async () => {
    if (!(await ensureIdeas())) return;
    const results = searchIdeas(state.ideas, els.searchInput.value, {}).slice(0, 8);
    els.searchResults.innerHTML = results.length ? results.map((idea) => `
      <div class="search-item">
        <p>${escapeHtml(idea.prompt)}</p>
        <div class="chip-row" style="margin-top:8px"><span class="chip">Book ${idea.bookNumber}</span><span class="chip">${escapeHtml(idea.stageBucket.replaceAll('_',' '))}</span></div>
      </div>
    `).join('') : `<p class="subtle">No results.</p>`;
  });
}

async function init() {
  state.bootstrap = await loadBootstrapData();
  hydrateState();
  renderDataStrip();
  renderAll();
  bindEvents();
}

init().catch((err) => {
  console.error(err);
  els.dataStrip.textContent = 'Could not load app data. Make sure you are running from a local server or GitHub Pages.';
});
