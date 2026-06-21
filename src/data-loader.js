let bootstrapCache = null;
let ideaCache = null;

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

export async function loadIdeas() {
  if (ideaCache) return ideaCache;
  ideaCache = await getJson('./data/ideas.compact.json');
  for (const idea of ideaCache) {
    idea._blob = [
      idea.prompt,
      idea.neonOrbitUse,
      idea.category,
      idea.useCase,
      ...(idea.tags || []),
      ...(idea.instrumentFocus || []),
      ...(idea.domainHints || []),
      idea.sourceBook,
      idea.sourceAuthor,
      idea.wizardStage,
      idea.wizardStageDisplay,
    ].filter(Boolean).join(' ').toLowerCase();
  }
  return ideaCache;
}
