function isiOSSafari() {
  return /iP(ad|hone|od)/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function releaseDownloadUrl(link) {
  if (!link?.dataset?.downloadUrl) return;
  URL.revokeObjectURL(link.dataset.downloadUrl);
  delete link.dataset.downloadUrl;
}

function prepareDownloadLink(link, filename, content, mimeType, { removeOnCleanup = false } = {}) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  releaseDownloadUrl(link);
  link.href = url;
  link.download = filename;
  link.type = mimeType;
  link.rel = 'noopener';
  link.dataset.downloadUrl = url;

  if (removeOnCleanup) {
    window.setTimeout(() => {
      if (link.dataset.downloadUrl === url) {
        releaseDownloadUrl(link);
        link.remove();
      }
    }, isiOSSafari() ? 60000 : 30000);
  }
}

function downloadFile(filename, content, mimeType, trigger) {
  if (trigger?.tagName === 'A') {
    prepareDownloadLink(trigger, filename, content, mimeType);
    return;
  }

  const link = document.createElement('a');
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.top = '0';
  link.textContent = filename;
  document.body.appendChild(link);
  prepareDownloadLink(link, filename, content, mimeType, { removeOnCleanup: true });
  if (isiOSSafari()) link.target = '_blank';
  link.click();
}

export function exportPlanJson(payload, trigger) {
  downloadFile('neon-orbit-section-plan.json', JSON.stringify(payload, null, 2), 'application/json', trigger);
}

export function exportPlanMarkdown(payload, stages, trigger) {
  const lines = [];
  lines.push(`# ${payload.summary.title}`);
  lines.push('');
  lines.push(`**Profile:** ${payload.summary.subtitle}`);
  lines.push('');
  lines.push('## Setup');
  Object.entries(payload.profile).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      lines.push(`- **${key}**: ${value.join(', ')}`);
    } else {
      lines.push(`- **${key}**: ${value || '—'}`);
    }
  });
  lines.push('');
  lines.push('## Stage plan');
  stages.forEach((stage) => {
    const item = payload.plan[stage.id];
    if (!item) return;
    lines.push(`### ${stage.label}`);
    lines.push(item.friendly?.action || item.prompt);
    lines.push('');
    if (item.friendly?.steps?.length) {
      item.friendly.steps.forEach((step) => lines.push(`- ${step}`));
      lines.push('');
    }
    if (item.friendly?.pitchTip) lines.push(`- **Pitch note:** ${item.friendly.pitchTip}`);
    if (item.friendly?.tags?.length) lines.push(`- **Idea tags:** ${item.friendly.tags.join(', ')}`);
    if (item.neonOrbitUse) lines.push(`- **Neon Orbit use:** ${item.neonOrbitUse}`);
    if (item.instrumentFocus?.length) lines.push(`- **Instrument focus:** ${item.instrumentFocus.join(', ')}`);
    if (item.domainHints?.length) lines.push(`- **Domains:** ${item.domainHints.join(', ')}`);
    lines.push(`- **Source:** Book ${item.bookNumber} — ${item.sourceBook} (${item.sourceAuthor})`);
    lines.push(`- **Original wording:** ${item.prompt}`);
    lines.push('');
  });
  downloadFile('neon-orbit-section-plan.md', lines.join('\n'), 'text/markdown', trigger);
}
