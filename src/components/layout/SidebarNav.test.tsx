import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';

test('mission operations stay primary while research and system pages are secondary', () => {
  const html = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(SidebarNav, {
        mobileOpen: false,
        onCloseMobile: () => {},
        onOpenMobileMenu: () => {},
      })
    )
  );

  const primaryStart = html.indexOf('aria-label="Primary Navigation"');
  const secondaryStart = html.indexOf('aria-label="Reference and system navigation"');
  assert.ok(primaryStart >= 0 && secondaryStart > primaryStart, 'both navigation groups render');

  const primary = html.slice(primaryStart, secondaryStart);
  for (const label of ['Dashboard', 'Daily Check-In', 'Vitals', 'Mission', 'Reports']) {
    assert.match(primary, new RegExp(`>${label.replace('-', '\\-')}<`));
  }
  assert.doesNotMatch(primary, /Research Context/);
  assert.doesNotMatch(primary, /Settings/);
  assert.doesNotMatch(primary, /About &amp; Sources/);

  const secondary = html.slice(secondaryStart);
  assert.match(secondary, /Research Context/);
  assert.match(secondary, /Settings/);
  assert.match(secondary, /About &amp; Sources/);

  // The mobile quick bar mirrors the five primary destinations and adds a More entry.
  const quickStart = html.indexOf('aria-label="Mobile Quick Navigation"');
  assert.ok(quickStart > secondaryStart);
  const quickBar = html.slice(quickStart);
  assert.doesNotMatch(quickBar, /href="\/research"/);
  assert.equal(html.split('href="/research"').length - 1, 1);
  assert.match(
    quickBar,
    /aria-label="More navigation: research, settings, and about"/
  );
  assert.match(quickBar, />More</);
});
