import alertMessages from '../../health-content/alert-messages.md?raw';
import bodySystems from '../../health-content/body-systems.md?raw';
import disclaimers from '../../health-content/disclaimers.md?raw';
import glossary from '../../health-content/glossary.md?raw';
import healthIndicators from '../../health-content/health-indicators.md?raw';
import safeActions from '../../health-content/safe-actions.md?raw';
import spaceflightHazards from '../../health-content/spaceflight-hazards.md?raw';
import nasaResources from '../../NASA Data & Resources.txt?raw';
import partnerResources from '../../Space Agency Partner Resources.txt?raw';

export const HEALTH_CONTENT = {
  alerts: alertMessages,
  bodySystems,
  disclaimers,
  glossary,
  healthIndicators,
  safeActions,
  spaceflightHazards,
  nasaResources,
  partnerResources,
} as const;

export type HealthContentKey = keyof typeof HEALTH_CONTENT;

export function extractMarkdownSection(markdown: string, title: string): string {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    return heading?.[2].trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase();
  });

  if (headingIndex < 0) return '';

  const headingLevel = lines[headingIndex].match(/^#+/)?.[0].length ?? 6;
  const sectionLines: string[] = [];

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const nextHeadingLevel = lines[index].match(/^(#{1,6})\s+/)?.[1].length;
    if (nextHeadingLevel !== undefined && nextHeadingLevel <= headingLevel) break;
    sectionLines.push(lines[index]);
  }

  return sectionLines.join('\n').trim();
}

export function extractMarkdownListItems(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\s*[-*+]\s+/.test(line))
    .map((line) => line.replace(/^\s*[-*+]\s+/, '').trim())
    .filter(Boolean);
}

export function getStatusAlertMessage(
  status: 'green' | 'yellow' | 'orange' | 'red'
): string {
  const message = extractMarkdownListItems(
    extractMarkdownSection(HEALTH_CONTENT.alerts, status)
  )[0];
  if (!message) {
    throw new Error(`No alert message is defined for the "${status}" health level.`);
  }
  return message;
}

export function getResourceUrls(key: 'nasaResources' | 'partnerResources'): string[] {
  return HEALTH_CONTENT[key]
    .split(/\s+/)
    .filter((value) => /^https?:\/\//i.test(value));
}
