let bootstrapCache = null;
let ideaCache = null;
let promptIndexCache = null;
let promptChunkManifestCache = null;
const stageChunkCache = new Map();
const PROMPT_CHUNK_BASE = './data/prompt-index/';

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

async function loadPromptChunkManifest() {
  if (promptChunkManifestCache) return promptChunkManifestCache;
  promptChunkManifestCache = await getJson(`${PROMPT_CHUNK_BASE}manifest.json`);
  return promptChunkManifestCache;
}

function uniqueStageIds(stageIds = []) {
  return [...new Set(stageIds.filter(Boolean))];
}

function mergeIdeas(lists = []) {
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    for (const idea of list || []) {
      const key = idea._indexKey || `${idea.id || 'idea'}::${idea.globalIndex || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ensureIdeaBlob(idea);
      merged.push(idea);
    }
  }
  return merged;
}

async function loadStageChunk(stageId, { full = false } = {}) {
  const cacheKey = `${stageId}:${full ? 'full' : 'core'}`;
  if (stageChunkCache.has(cacheKey)) return stageChunkCache.get(cacheKey);
  const manifest = await loadPromptChunkManifest();
  const stageInfo = manifest.stages?.[stageId];
  if (!stageInfo?.path) throw new Error(`No prompt chunk for ${stageId}`);
  const paths = full && stageInfo.parts?.length
    ? stageInfo.parts.map((part) => part.path)
    : [stageInfo.path];
  const payloads = await Promise.all(paths.map((path) => getJson(`${PROMPT_CHUNK_BASE}${path}`)));
  const ideas = mergeIdeas(payloads.map((payload) => payload.ideas || []));
  ideas.forEach(ensureIdeaBlob);
  stageChunkCache.set(cacheKey, ideas);
  return ideas;
}

export async function loadIdeasForStages(stageIds = [], { full = false } = {}) {
  const ids = uniqueStageIds(stageIds);
  if (!ids.length) return loadIdeas();
  try {
    const chunks = await Promise.all(ids.map((stageId) => loadStageChunk(stageId, { full })));
    return mergeIdeas(chunks);
  } catch (error) {
    console.warn('Prompt chunks unavailable; falling back to full prompt pool.', error);
    const allIdeas = await loadIdeas();
    return allIdeas.filter((idea) => ids.includes(idea.stageBucket));
  }
}

export async function loadIdeas() {
  if (ideaCache) return ideaCache;
  try {
    const manifest = await loadPromptChunkManifest();
    const stageIds = Object.keys(manifest.stages || {});
    const chunks = await Promise.all(stageIds.map((stageId) => loadStageChunk(stageId, { full: true })));
    ideaCache = mergeIdeas(chunks);
  } catch (error) {
    try {
      console.warn('Prompt chunks unavailable; falling back to monolithic prompt index.', error);
      const promptIndex = await loadPromptIndex();
      ideaCache = Object.values(promptIndex.stageBuckets || {}).flat();
    } catch (fallbackError) {
      console.warn('Prompt index unavailable; falling back to full idea pool.', fallbackError);
      ideaCache = await getJson('./data/ideas.compact.json');
    }
  }
  for (const idea of ideaCache) {
    ensureIdeaBlob(idea);
  }
  return ideaCache;
}
