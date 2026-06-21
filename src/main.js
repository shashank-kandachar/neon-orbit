import { STAGES, APP_OPTIONS, DEFAULT_PROFILE } from './config.js';
import { loadBootstrapData, loadIdeas } from './data-loader.js';
import { generateStagePrompts, searchIdeas, buildSectionSummary } from './engine.js';
import { loadState, saveState, clearState, loadSavedPlans, savePlanSnapshot, removeSavedPlan } from './storage.js';
import { exportPlanJson, exportPlanMarkdown } from './export-utils.js';

const state = {
  bootstrap: null,
  ideas: null,
  profile: { ...DEFAULT_PROFILE },
  plan: {},
  currentStage: STAGES[0].id,
  currentPrompts: [],
  activeView: 'builder',
  traceIdea: null,
  savedPlans: loadSavedPlans(),
};

const els = {
  topbarStats: document.getElementById('topbarStats'),
  setupForm: document.getElementById('setupForm'),
  pitchWorldSelect: document.getElementById('pitchWorldSelect'),
  ragaSelect: document.getElementById('ragaSelect'),
  tempoInput: document.getElementById('tempoInput'),
  moodSelect: document.getElementById('moodSelect'),
  sectionTypeSelect: document.getElementById('sectionTypeSelect'),
  energySelect: document.getElementById('energySelect'),
  grooveSelect: document.getElementById('grooveSelect'),
  instrumentSelect: document.getElementById('instrumentSelect'),
  notesInput: document.getElementById('notesInput'),
  gearChecklist: document.getElementById('gearChecklist'),
  gearGuidance: document.getElementById('gearGuidance'),
  domainChecklist: document.getElementById('domainChecklist'),
  stageNav: document.getElementById('stageNav'),
  stageTitle: document.getElementById('stageTitle'),
  stageBlurb: document.getElementById('stageBlurb'),
  loadIdeasBtn: document.getElementById('loadIdeasBtn'),
  refreshStageBtn: document.getElementById('refreshStageBtn'),
  inspirationBtn: document.getElementById('inspirationBtn'),
  promptCards: document.getElementById('promptCards'),
  sectionPlan: document.getElementById('sectionPlan'),
  sectionSummary: document.getElementById('sectionSummary'),
  completedCountPill: document.getElementById('completedCountPill'),
  tracePanel: document.getElementById('tracePanel'),
  saveSnapshotBtn: document.getElementById('saveSnapshotBtn'),
  exportMdBtn: document.getElementById('exportMdBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  resetBuilderBtn: document.getElementById('resetBuilderBtn'),
  searchInput: document.getElementById('searchInput'),
  browseStageFilter: document.getElementById('browseStageFilter'),
  browseDomainFilter: document.getElementById('browseDomainFilter'),
  browseGearFilter: document.getElementById('browseGearFilter'),
  searchBtn: document.getElementById('searchBtn'),
  browseResults: document.getElementById('browseResults'),
  savedPlans: document.getElementById('savedPlans'),
  loadingOverlay: document.getElementById('loadingOverlay'),
  loadingTitle: document.getElementById('loadingTitle'),
  loadingText: document.getElementById('loadingText'),
  clearGearBtn: document.getElementById('clearGearBtn'),
  clearDomainBtn: document.getElementById('clearDomainBtn'),
  builderView: document.getElementById('builderView'),
  browseView: document.getElementById('browseView'),
  savedView: document.getElementById('savedView'),
};

function showLoading(title, text) {
  els.loadingTitle.textContent = title;
  els.loadingText.textContent = text;
  els.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  els.loadingOverlay.classList.add('hidden');
}

function saveAppState() {
  saveState({
    profile: state.profile,
    plan: state.plan,
    currentStage: state.currentStage,
    activeView: state.activeView,
    traceIdea: state.traceIdea,
  });
}

function hydrateState() {
  const stored = loadState();
  if (!stored) return;
  state.profile = { ...DEFAULT_PROFILE, ...(stored.profile || {}) };
  state.plan = stored.plan || {};
  state.currentStage = stored.currentStage || state.currentStage;
  state.activeView = stored.activeView || state.activeView;
  state.traceIdea = stored.traceIdea || null;
}

function renderTopbarStats() {
  const { manifest } = state.bootstrap;
  const cards = [
    { label: 'Ideas', value: manifest.ideaCount.toLocaleString() },
    { label: 'Books', value: manifest.bookCount.toString() },
    { label: 'Ragas', value: manifest.ragaCount.toString() },
    { label: 'Audit', value: manifest.auditStatus.replaceAll('_', ' ') },
  ];
  els.topbarStats.innerHTML = cards.map((card) => `
    <div class="stat-card">
      <strong>${card.value}</strong>
      <span>${card.label}</span>
    </div>
  `).join('');
}

function populateSelect(select, values, placeholder = '') {
  const options = placeholder ? [`<option value="">${placeholder}</option>`] : [];
  values.forEach((value) => {
    options.push(`<option value="${value}">${value}</option>`);
  });
  select.innerHTML = options.join('');
}

function renderFormOptions() {
  populateSelect(els.pitchWorldSelect, APP_OPTIONS.pitchWorlds);
  populateSelect(els.moodSelect, APP_OPTIONS.moods);
  populateSelect(els.sectionTypeSelect, APP_OPTIONS.sectionTypes);
  populateSelect(els.energySelect, APP_OPTIONS.energyLevels);
  populateSelect(els.grooveSelect, APP_OPTIONS.grooveFeels);
  populateSelect(els.instrumentSelect, APP_OPTIONS.instruments);

  const ragaOptions = state.bootstrap.ragaData.cards.map((card) => `<option value="${card.name}">${card.name}</option>`);
  els.ragaSelect.insertAdjacentHTML('beforeend', ragaOptions.join(''));

  populateSelect(els.browseStageFilter, STAGES.map((stage) => stage.id), 'All stages');
  populateSelect(els.browseDomainFilter, APP_OPTIONS.domainFilters, 'All domains');
  populateSelect(els.browseGearFilter, APP_OPTIONS.gear.map((g) => g.id), 'All gear');
}

function renderFormValues() {
  els.pitchWorldSelect.value = state.profile.pitchWorld || DEFAULT_PROFILE.pitchWorld;
  els.ragaSelect.value = state.profile.selectedRaga || '';
  els.tempoInput.value = state.profile.tempo;
  els.moodSelect.value = state.profile.mood;
  els.sectionTypeSelect.value = state.profile.sectionType;
  els.energySelect.value = state.profile.energy;
  els.grooveSelect.value = state.profile.groove;
  els.instrumentSelect.value = state.profile.instrument;
  els.notesInput.value = state.profile.notes || '';
}

function renderChecklists() {
  els.gearChecklist.innerHTML = APP_OPTIONS.gear.map((item) => `
    <label class="checkbox-item">
      <input type="checkbox" value="${item.id}" ${state.profile.gearFocus.includes(item.id) ? 'checked' : ''} />
      <span class="checkbox-copy">
        <strong>${item.label}</strong>
        <span>Focused guidance</span>
      </span>
    </label>
  `).join('');

  els.domainChecklist.innerHTML = APP_OPTIONS.domainFilters.map((domain) => `
    <label class="checkbox-item">
      <input type="checkbox" value="${domain}" ${state.profile.domainFilters.includes(domain) ? 'checked' : ''} />
      <span class="checkbox-copy">
        <strong>${domain}</strong>
        <span>Filter prompt engine</span>
      </span>
    </label>
  `).join('');
}

function renderGearGuidance() {
  const selected = state.profile.gearFocus;
  if (!selected.length) {
    els.gearGuidance.innerHTML = `<div class="info-card"><strong>No gear focus selected</strong><p class="muted">Choose one or more gear lanes to make the guidance more practical.</p></div>`;
    return;
  }

  const panels = [];
  const seedPanels = state.bootstrap.seedPanels;

  if (selected.includes('microfreak')) {
    panels.push({
      title: 'MicroFreak lanes',
      items: seedPanels.microfreak_app_prompt_domains?.domains || [],
    });
  }
  if (selected.includes('sl2')) {
    panels.push({
      title: 'Boss SL-2 lanes',
      items: seedPanels.sl2_app_prompt_domains?.domains || [],
    });
  }
  if (selected.includes('ampero')) {
    const ampero = seedPanels.ampero_signal_chain_engine_seed || {};
    panels.push({
      title: 'Ampero chain thinking',
      items: [...(ampero.chain_types || []), ...(ampero.guardrails || [])],
    });
  }
  if (selected.includes('ableton')) {
    panels.push({
      title: 'Ableton flow cues',
      items: state.bootstrap.seedPanels.neon_orbit_scale_selector_ui_seed?.screens || ['tone_count_browser', 'harmony_match', 'sound_design_pairing'],
    });
  }
  if (selected.includes('guitar')) {
    panels.push({
      title: 'Guitar lens',
      items: ['motif clarity', 'voicing restraint', 'touch and articulation', 'live-feasible repetition'],
    });
  }
  if (selected.includes('field_recordings')) {
    panels.push({
      title: 'Field layer lens',
      items: ['capture a specific environment', 'shape texture, not clutter', 'let a real-world sound become a rhythm or drone', 'preserve emotional place-memory'],
    });
  }

  els.gearGuidance.innerHTML = panels.map((panel) => `
    <div class="info-card">
      <strong>${panel.title}</strong>
      <ul>${panel.items.slice(0, 6).map((item) => `<li>${item}</li>`).join('')}</ul>
    </div>
  `).join('');
}

function renderStageNav() {
  const counts = new Map((state.bootstrap.manifest.stageBuckets || []).map((item) => [item.id, item.count]));
  els.stageNav.innerHTML = STAGES.map((stage, index) => `
    <button class="stage-pill ${stage.id === state.currentStage ? 'active' : ''}" data-stage="${stage.id}">
      <strong>${index + 1}. ${stage.label.replace(/^\d+\.\s*/, '')}</strong>
      <span>${(counts.get(stage.id) || 0).toLocaleString()} ideas</span>
    </button>
  `).join('');
}

function renderStageHeader() {
  const stage = STAGES.find((item) => item.id === state.currentStage);
  els.stageTitle.textContent = stage?.label.replace(/^\d+\.\s*/, '') || 'Section builder';
  els.stageBlurb.textContent = stage?.blurb || '';
}

function renderPrompts() {
  if (!state.currentPrompts.length) {
    els.promptCards.innerHTML = `<div class="info-card"><strong>No prompts loaded yet</strong><p class="muted">Load the idea pool, then refresh prompts for the current stage.</p></div>`;
    return;
  }

  els.promptCards.innerHTML = state.currentPrompts.map((idea, index) => {
    const scoreClass = idea._score >= 70 ? 'score-high' : idea._score >= 48 ? 'score-mid' : 'score-low';
    return `
      <article class="prompt-card ${scoreClass}">
        <div class="prompt-meta">
          <span class="meta-chip">Book ${idea.bookNumber}</span>
          <span class="meta-chip">${idea.stageBucket.replaceAll('_', ' ')}</span>
          <span class="meta-chip">${idea.energy || 'energy open'}</span>
          <span class="meta-chip">Match ${idea._score ?? '—'}</span>
        </div>
        <p class="prompt-copy">${idea.prompt}</p>
        <div class="prompt-meta">
          ${(idea.instrumentFocus || []).slice(0, 3).map((item) => `<span class="meta-chip">${item}</span>`).join('')}
        </div>
        <div class="prompt-actions">
          <button class="button primary" data-action="add" data-id="${idea.id}">${index === 0 ? 'Use for this stage' : 'Add to stage'}</button>
          <button class="button secondary" data-action="trace" data-id="${idea.id}">Why this?</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderSectionSummary() {
  const summary = buildSectionSummary(state.profile, state.plan);
  const ragaInfo = state.profile.selectedRaga ? `<div class="meta-chip">Raga focus: ${state.profile.selectedRaga}</div>` : '';
  els.sectionSummary.innerHTML = `
    <div class="brand-kicker">Current section</div>
    <h3>${summary.title}</h3>
    <p class="muted">${summary.subtitle}</p>
    <div class="prompt-meta" style="margin-top:10px">
      <span class="meta-chip">${summary.completedStages} / 15 stages filled</span>
      ${ragaInfo}
    </div>
  `;
  els.completedCountPill.textContent = `${summary.completedStages} / 15`;
}

function renderPlan() {
  els.sectionPlan.innerHTML = STAGES.map((stage) => {
    const item = state.plan[stage.id];
    if (!item) {
      return `
        <div class="plan-item">
          <h4>${stage.label}</h4>
          <p class="muted">No prompt chosen yet.</p>
        </div>
      `;
    }
    return `
      <div class="plan-item selected">
        <h4>${stage.label}</h4>
        <p>${item.prompt}</p>
        <small>Book ${item.bookNumber} — ${item.sourceBook}</small>
      </div>
    `;
  }).join('');
}

function renderTracePanel() {
  const item = state.traceIdea;
  if (!item) {
    els.tracePanel.classList.add('empty');
    els.tracePanel.innerHTML = `<p class="muted">Choose “Why this?” on a prompt to inspect its source, domains and applicability.</p>`;
    return;
  }
  els.tracePanel.classList.remove('empty');
  els.tracePanel.innerHTML = `
    <div class="trace-card">
      <div class="brand-kicker">Source trace</div>
      <h3>Book ${item.bookNumber} — ${item.sourceBook}</h3>
      <p class="muted">${item.sourceAuthor || 'Unknown source author'}</p>
      <div class="trace-meta" style="margin-top:10px">
        <span class="meta-chip">${item.category || 'category open'}</span>
        <span class="meta-chip">${item.useCase || 'use case open'}</span>
        <span class="meta-chip">${item.wizardStageDisplay || item.stageBucket}</span>
      </div>
      <p class="prompt-copy" style="margin-top:12px">${item.prompt}</p>
      <p class="muted" style="margin-top:12px">${item.neonOrbitUse || 'No extra Neon Orbit application note available.'}</p>
      <div class="trace-meta" style="margin-top:12px">
        ${(item.domainHints || []).map((domain) => `<span class="meta-chip">${domain}</span>`).join('')}
      </div>
      <div class="trace-meta" style="margin-top:8px">
        ${(item.tags || []).slice(0, 6).map((tag) => `<span class="meta-chip">${tag}</span>`).join('')}
      </div>
    </div>
  `;
}

function renderSavedPlans() {
  if (!state.savedPlans.length) {
    els.savedPlans.innerHTML = `<div class="info-card"><strong>No saved snapshots yet</strong><p class="muted">Save a section plan and it will appear here.</p></div>`;
    return;
  }
  els.savedPlans.innerHTML = state.savedPlans.map((item) => `
    <article class="saved-card">
      <h4>${item.summary.title}</h4>
      <p class="muted">${item.summary.subtitle}</p>
      <small>${new Date(item.createdAt).toLocaleString('en-GB')}</small>
      <div class="prompt-actions" style="margin-top:12px">
        <button class="button secondary" data-plan-action="load" data-plan-id="${item.id}">Load</button>
        <button class="button ghost" data-plan-action="remove" data-plan-id="${item.id}">Remove</button>
      </div>
    </article>
  `).join('');
}

function renderBrowseResults(results = []) {
  if (!results.length) {
    els.browseResults.innerHTML = `<div class="info-card"><strong>No results yet</strong><p class="muted">Try a search or filter to browse the idea pool.</p></div>`;
    return;
  }
  els.browseResults.innerHTML = results.map((idea) => `
    <article class="browse-card">
      <h4>${idea.prompt}</h4>
      <div class="prompt-meta">
        <span class="meta-chip">Book ${idea.bookNumber}</span>
        <span class="meta-chip">${idea.stageBucket.replaceAll('_', ' ')}</span>
        <span class="meta-chip">${idea.sourceBook}</span>
      </div>
      <small>${idea.neonOrbitUse || 'No extra application note.'}</small>
      <div class="prompt-actions" style="margin-top:12px">
        <button class="button primary" data-browse-action="stage" data-id="${idea.id}">Use for current stage</button>
        <button class="button secondary" data-browse-action="trace" data-id="${idea.id}">Why this?</button>
      </div>
    </article>
  `).join('');
}

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  els.builderView.classList.toggle('hidden', view !== 'builder');
  els.browseView.classList.toggle('hidden', view !== 'browse');
  els.savedView.classList.toggle('hidden', view !== 'saved');
  saveAppState();
}

function syncProfileFromForm() {
  state.profile = {
    ...state.profile,
    pitchWorld: els.pitchWorldSelect.value,
    selectedRaga: els.ragaSelect.value,
    tempo: Number(els.tempoInput.value || DEFAULT_PROFILE.tempo),
    mood: els.moodSelect.value,
    sectionType: els.sectionTypeSelect.value,
    energy: els.energySelect.value,
    groove: els.grooveSelect.value,
    instrument: els.instrumentSelect.value,
    notes: els.notesInput.value,
    gearFocus: [...els.gearChecklist.querySelectorAll('input:checked')].map((input) => input.value),
    domainFilters: [...els.domainChecklist.querySelectorAll('input:checked')].map((input) => input.value),
  };
  renderGearGuidance();
  renderSectionSummary();
  saveAppState();
}

async function ensureIdeasLoaded() {
  if (state.ideas) return;
  showLoading('Loading idea pool', 'Reading the compact authority bundle. This may take a moment the first time.');
  try {
    state.ideas = await loadIdeas();
    els.loadIdeasBtn.textContent = 'Ideas loaded';
  } catch (error) {
    alert(`Could not load the idea pool. Run the app from a local web server.\n\n${error.message}`);
  } finally {
    hideLoading();
  }
}

async function refreshCurrentStage({ inspiration = false } = {}) {
  await ensureIdeasLoaded();
  if (!state.ideas) return;
  syncProfileFromForm();
  state.currentPrompts = generateStagePrompts(state.ideas, state.profile, state.currentStage, state.plan, { inspiration });
  renderPrompts();
  saveAppState();
}

function getIdeaById(id) {
  if (!state.ideas) return null;
  return state.ideas.find((idea) => idea.id === id) || null;
}

function addPromptToCurrentStage(id) {
  const idea = getIdeaById(id) || state.currentPrompts.find((item) => item.id === id);
  if (!idea) return;
  state.plan[state.currentStage] = idea;
  renderPlan();
  renderSectionSummary();
  state.traceIdea = idea;
  renderTracePanel();
  saveAppState();

  const index = STAGES.findIndex((stage) => stage.id === state.currentStage);
  if (index < STAGES.length - 1) {
    state.currentStage = STAGES[index + 1].id;
    renderStageNav();
    renderStageHeader();
    refreshCurrentStage();
  }
}

function buildSnapshotPayload() {
  const summary = buildSectionSummary(state.profile, state.plan);
  return {
    id: `section_${Date.now()}`,
    createdAt: new Date().toISOString(),
    profile: state.profile,
    summary,
    plan: state.plan,
  };
}

function handleSaveSnapshot() {
  const payload = buildSnapshotPayload();
  savePlanSnapshot(payload);
  state.savedPlans = loadSavedPlans();
  renderSavedPlans();
  switchView('saved');
}

function handleReset() {
  if (!confirm('Reset the builder and clear the current local state?')) return;
  state.profile = { ...DEFAULT_PROFILE };
  state.plan = {};
  state.currentPrompts = [];
  state.currentStage = STAGES[0].id;
  state.traceIdea = null;
  clearState();
  renderFormValues();
  renderChecklists();
  renderStageNav();
  renderStageHeader();
  renderGearGuidance();
  renderSectionSummary();
  renderPlan();
  renderTracePanel();
  renderPrompts();
}

async function handleSearch() {
  await ensureIdeasLoaded();
  if (!state.ideas) return;
  const results = searchIdeas(state.ideas, els.searchInput.value, {
    stage: els.browseStageFilter.value,
    domain: els.browseDomainFilter.value,
    gear: els.browseGearFilter.value,
  });
  renderBrowseResults(results);
}

function bindEvents() {
  els.setupForm.addEventListener('change', syncProfileFromForm);
  els.notesInput.addEventListener('input', syncProfileFromForm);
  els.gearChecklist.addEventListener('change', syncProfileFromForm);
  els.domainChecklist.addEventListener('change', syncProfileFromForm);

  els.clearGearBtn.addEventListener('click', () => {
    els.gearChecklist.querySelectorAll('input').forEach((input) => { input.checked = false; });
    syncProfileFromForm();
  });

  els.clearDomainBtn.addEventListener('click', () => {
    els.domainChecklist.querySelectorAll('input').forEach((input) => { input.checked = false; });
    syncProfileFromForm();
  });

  els.stageNav.addEventListener('click', (event) => {
    const button = event.target.closest('[data-stage]');
    if (!button) return;
    state.currentStage = button.dataset.stage;
    renderStageNav();
    renderStageHeader();
    if (state.ideas) refreshCurrentStage();
    saveAppState();
  });

  els.promptCards.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === 'add') addPromptToCurrentStage(id);
    if (button.dataset.action === 'trace') {
      state.traceIdea = getIdeaById(id) || state.currentPrompts.find((item) => item.id === id);
      renderTracePanel();
      saveAppState();
    }
  });

  els.savedPlans.addEventListener('click', (event) => {
    const button = event.target.closest('[data-plan-action]');
    if (!button) return;
    const id = button.dataset.planId;
    if (button.dataset.planAction === 'remove') {
      state.savedPlans = removeSavedPlan(id);
      renderSavedPlans();
      return;
    }
    if (button.dataset.planAction === 'load') {
      const plan = state.savedPlans.find((item) => item.id === id);
      if (!plan) return;
      state.profile = plan.profile;
      state.plan = plan.plan;
      state.currentStage = STAGES[0].id;
      renderFormValues();
      renderChecklists();
      renderStageNav();
      renderStageHeader();
      renderGearGuidance();
      renderSectionSummary();
      renderPlan();
      renderTracePanel();
      switchView('builder');
      saveAppState();
    }
  });

  els.browseResults.addEventListener('click', (event) => {
    const button = event.target.closest('[data-browse-action]');
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.browseAction === 'stage') {
      addPromptToCurrentStage(id);
      switchView('builder');
    }
    if (button.dataset.browseAction === 'trace') {
      state.traceIdea = getIdeaById(id);
      renderTracePanel();
      saveAppState();
    }
  });

  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });

  els.loadIdeasBtn.addEventListener('click', () => refreshCurrentStage());
  els.refreshStageBtn.addEventListener('click', () => refreshCurrentStage());
  els.inspirationBtn.addEventListener('click', () => refreshCurrentStage({ inspiration: true }));
  els.searchBtn.addEventListener('click', handleSearch);
  els.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleSearch();
  });
  els.saveSnapshotBtn.addEventListener('click', handleSaveSnapshot);
  els.exportJsonBtn.addEventListener('click', () => exportPlanJson(buildSnapshotPayload()));
  els.exportMdBtn.addEventListener('click', () => exportPlanMarkdown(buildSnapshotPayload(), STAGES));
  els.resetBuilderBtn.addEventListener('click', handleReset);
}

async function init() {
  showLoading('Loading authority data', 'Preparing the audited Neon Orbit bootstrap data.');
  try {
    state.bootstrap = await loadBootstrapData();
    hydrateState();
    renderTopbarStats();
    renderFormOptions();
    renderFormValues();
    renderChecklists();
    renderStageNav();
    renderStageHeader();
    renderGearGuidance();
    renderSectionSummary();
    renderPlan();
    renderTracePanel();
    renderSavedPlans();
    renderPrompts();
    switchView(state.activeView);
    bindEvents();
  } catch (error) {
    console.error(error);
    els.topbarStats.innerHTML = `<div class="info-card"><strong>Could not load bootstrap data</strong><p class="muted">${error.message}</p></div>`;
  } finally {
    hideLoading();
  }
}

init();
