import assert from 'node:assert/strict';
import { test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { TopTelemetryBar } from './TopTelemetryBar';

test('the telemetry bar shows the route title without owning the page h1', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <TopTelemetryBar
        pageTitle="Biometric Vitals"
        mobileMenuOpen={false}
        onOpenMobileMenu={() => {}}
        onOpenDriveModal={() => {}}
      />
    </MemoryRouter>
  );

  assert.doesNotMatch(html, /<h1/);
  assert.match(html, /<p class="[^"]*">Biometric Vitals<\/p>/);
});
