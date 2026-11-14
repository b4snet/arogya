import { describe, expect, it } from 'vitest';
import {
  extractMarkdownListItems,
  extractMarkdownSection,
  getResourceUrls,
  getStatusAlertMessage,
  HEALTH_CONTENT,
} from './healthContent';

describe('health content imports', () => {
  it('loads every supplied Markdown source', () => {
    for (const [name, content] of Object.entries(HEALTH_CONTENT)) {
      expect(content.trim(), `${name} should not be empty`).not.toBe('');
    }
  });

  it('maps alert levels and safe-action lists from the source documents', () => {
    expect(getStatusAlertMessage('red')).toMatch(/urgent|review|escalat/i);
    expect(extractMarkdownListItems(extractMarkdownSection(HEALTH_CONTENT.safeActions, 'General actions')))
      .not.toHaveLength(0);
  });

  it('extracts NASA and partner source URLs without duplicating them in code', () => {
    expect(getResourceUrls('nasaResources')).toHaveLength(3);
    expect(getResourceUrls('partnerResources')).toHaveLength(2);
  });
});
