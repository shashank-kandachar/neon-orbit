let bootstrapCache = null;
let ideaCache = null;
let promptIndexCache = null;

async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return response.json();
}

export async function loadBootstrapData() {
  if (bootstrapCache) return bootstrapCache;
  const [manifest, ledger, ragaData, seedPanels] = await Promise.all([
    getJson('./data/manifest.json'),
    getJson('./data/source-ledger.json'),
    getJson('./data/raga-cards.json'),
    getJson('./data/seed-panels.json'),
  ]);
  bootstrapCache = { manifest, ledger, ragaData, seedPanels };
  return bootstrapCache;
}

function ensureIdeaBlob(idea) {
  if (idea._blob) return;
  idea._blob = [
    idea.prompt,
    idea.neonOrbitUse,
    idea.category,
    idea.useCase,
    ...(idea.tags || []),
    ...(idea.instrumentFocus || []),
    ...(idea.domainHints || []),
    ...(idea.gearHints || []),
    idea.sourceBook,
    idea.sourceAuthor,
    idea.sourceConcept,
    idea.wizardStage,
    idea.wizardStageDisplay,
  ].filter(Boolean).join(' ').toLowerCase();
}

async function loadPromptIndex() {
  if (promptIndexCache) return promptIndexCache;
  promptIndexCache = await getJson('./data/prompt-index.json');
  return promptIndexCache;
}

export async function loadIdeas() {
  if (ideaCache) return ideaCache;
  try {
    const promptIndex = await loadPromptIndex();
    ideaCache = Object.values(promptIndex.stageBuckets || {}).flat();
  } catch (error) {
    console.warn('Prompt index unavailable; falling back to full idea pool.', error);
    ideaCache = await getJson('./data/ideas.compact.json');
  }
  for (const idea of ideaCache) {
    ensureIdeaBlob(idea);
  }
  return ideaCache;
}
