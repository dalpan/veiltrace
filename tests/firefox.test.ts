// Firefox build (D-086): the manifest keeps exactly the Chromium permissions and only changes what Firefox requires.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error -- plain ESM build script without type declarations
import { firefoxManifest } from '../scripts/build-extension.mjs';

describe('Firefox manifest', () => {
  const chromium = JSON.parse(readFileSync('src/extension/manifest.json', 'utf8'));
  const ff = firefoxManifest(chromium);

  it('keeps the same permissions, optional permissions and CSP', () => {
    expect(ff.permissions).toEqual(['activeTab', 'scripting']);
    expect(ff.optional_host_permissions).toEqual(chromium.optional_host_permissions);
    expect(ff.host_permissions).toBeUndefined();
    expect(ff.content_security_policy).toEqual(chromium.content_security_policy);
  });

  it('uses an event-page background, a gecko id and Firefox 128+ (desktop and Android)', () => {
    expect(ff.background).toEqual({ scripts: ['background.js'] });
    expect(ff.minimum_chrome_version).toBeUndefined();
    expect(ff.browser_specific_settings.gecko).toMatchObject({ id: 'veiltrace@veiltrace.invalid', strict_min_version: '128.0' });
    expect(ff.browser_specific_settings.gecko_android.strict_min_version).toBe('128.0');
  });
});
