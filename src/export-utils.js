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
  if (payload.song?.arrangement?.length) {
    const sections = new Map((payload.song.sections || []).map((section) => [section.id, section]));
    lines.push('## Track arrangement');
    payload.song.arrangement.forEach((slot, index) => {
      const section = sections.get(slot.sectionId);
      const label = slot.label || slot.id.replaceAll('_', ' ');
      if (section) {
        const profile = section.profile || {};
        const key = `${profile.keyRoot || ''} ${profile.selectedRaga || profile.pitchWorld || ''}`.trim();
        const status = section.compositionStatus ? ` · ${section.compositionStatus}` : '';
        lines.push(`- **${index + 1}. ${label}:** ${section.title || profile.sectionType || 'Section'}${key ? ` — ${key}` : ''}${status}`);
        if (slot.purpose) lines.push(`  Purpose: ${slot.purpose}`);
        if (slot.entryCue) lines.push(`  Entry: ${slot.entryCue}`);
        if (slot.exitCue) lines.push(`  Handoff: ${slot.exitCue}`);
        if (section.variationOf) lines.push(`  Variation of: ${section.variationOf}`);
      } else {
        lines.push(`- **${index + 1}. ${label}:** —`);
        if (slot.cue) lines.push(`  Cue: ${slot.cue}`);
        if (slot.purpose) lines.push(`  Purpose: ${slot.purpose}`);
      }
    });
    lines.push('');
  }
  if (payload.trackIntelligence?.nextMove) {
    const nextMove = payload.trackIntelligence.nextMove;
    lines.push('## Next composition move');
    lines.push(`**${nextMove.title}:** ${nextMove.action}`);
    if (nextMove.keep) lines.push(`- **Keep:** ${nextMove.keep}`);
    if (nextMove.change) lines.push(`- **Change / purpose:** ${nextMove.change}`);
    lines.push('');
  }
  if (payload.trackIntelligence?.handoffs?.length) {
    lines.push('## Transition notes');
    payload.trackIntelligence.handoffs.forEach((handoff) => {
      lines.push(`- **${handoff.from} into ${handoff.to}:** ${handoff.advice}`);
    });
    lines.push('');
  }
  if (payload.trackIntelligence?.abletonNotes?.length) {
    lines.push('## Ableton planning notes');
    payload.trackIntelligence.abletonNotes.forEach((note) => {
      lines.push(`- **${note.sceneName}:** ${note.clipLength}. ${note.capture}`);
      if (note.liveCue) lines.push(`  Live cue: ${note.liveCue}`);
    });
    lines.push('');
  }
  if (payload.gearWorkflows?.length) {
    lines.push('## Practical gear workflow');
    payload.gearWorkflows.forEach((workflow) => {
      lines.push(`### ${workflow.label}`);
      lines.push(workflow.role || '');
      if (workflow.setup?.length) {
        workflow.setup.forEach((step) => lines.push(`- ${step}`));
      }
      lines.push('');
    });
  }
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
    if (item.friendly?.playFirst) {
      lines.push(`- **Play first:** ${item.friendly.playFirst.headline}`);
      if (item.friendly.playFirst.detail) lines.push(`  ${item.friendly.playFirst.detail}`);
      if (item.friendly.playFirst.noteCue) lines.push(`  Notes: ${item.friendly.playFirst.noteCue}`);
      if (item.friendly.playFirst.check) lines.push(`  Listen check: ${item.friendly.playFirst.check}`);
      lines.push('');
    }
    if (item.friendly?.doNow || item.friendly?.useCue || item.friendly?.listenFor || item.friendly?.whyHere) {
      if (item.friendly.doNow) lines.push(`- **Try now:** ${item.friendly.doNow}`);
      if (item.friendly.useCue) lines.push(`- **Use:** ${item.friendly.useCue}`);
      if (item.friendly.listenFor) lines.push(`- **Listen for:** ${item.friendly.listenFor}`);
      if (item.friendly.whyHere) lines.push(`- **Why here:** ${item.friendly.whyHere}`);
      lines.push('');
    }
    if (item.friendly?.plainMeaning) {
      lines.push(`**What this means:** ${item.friendly.plainMeaning}`);
      lines.push('');
    }
    if (item.friendly?.steps?.length) {
      item.friendly.steps.forEach((step) => lines.push(`- ${step}`));
      lines.push('');
    }
    if (item.friendly?.concepts?.length) {
      lines.push('**Terms / concepts:**');
      item.friendly.concepts.forEach((concept) => {
        lines.push(`- **${concept.term}:** ${concept.meaning}${concept.tryThis ? ` Try: ${concept.tryThis}` : ''}`);
      });
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
