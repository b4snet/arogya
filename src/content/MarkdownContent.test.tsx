import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownContent } from './MarkdownContent';

test('markdown headings are demoted below the page h1', () => {
  const html = renderToStaticMarkup(
    <MarkdownContent content={'# Section title\n\nText\n\n## Sub title\n\n### Detail'} />
  );

  assert.doesNotMatch(html, /<h1/);
  assert.match(html, /<h2>Section title<\/h2>/);
  assert.match(html, /<h3>Sub title<\/h3>/);
  assert.match(html, /<h4>Detail<\/h4>/);
});
