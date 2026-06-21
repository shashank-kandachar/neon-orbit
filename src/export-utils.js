function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportPlanJson(payload) {
  downloadFile('neon-orbit-section-plan.json', JSON.stringify(payload, null, 2), 'application/json');
}

export function exportPlanMarkdown(payload, stages) {
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
    lines.push(item.prompt);
    lines.push('');
    if (item.neonOrbitUse) lines.push(`- **Neon Orbit use:** ${item.neonOrbitUse}`);
    if (item.instrumentFocus?.length) lines.push(`- **Instrument focus:** ${item.instrumentFocus.join(', ')}`);
    if (item.domainHints?.length) lines.push(`- **Domains:** ${item.domainHints.join(', ')}`);
    lines.push(`- **Source:** Book ${item.bookNumber} — ${item.sourceBook} (${item.sourceAuthor})`);
    lines.push('');
  });
  downloadFile('neon-orbit-section-plan.md', lines.join('\n'), 'text/markdown');
}
