// Managed organizational build (D-089): installed with host access, automatic scanning is on without any user action,
// the popup cannot turn it off, and nothing leaves the device.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { addCorpusScenario, extensionDir, launchExtension, openTarget, tabIdOf, type Loaded } from './helpers.js';

let l: Loaded;
beforeAll(async () => { l = await launchExtension('managed', 'id'); });
afterAll(async () => { await l.context.close(); });

describe('managed build', () => {
  it('manifest: same permissions plus host access granted at install; no optional permissions', async () => {
    const m = JSON.parse(readFileSync(join(await extensionDir('managed'), 'manifest.json'), 'utf8'));
    expect(m.name).toBe('VeilTrace (Managed)');
    // D-109: storage only to read the organization's rule-pack policy.
    expect(m.permissions).toEqual(['activeTab', 'scripting', 'storage']);
    expect(m.storage).toEqual({ managed_schema: 'managed-schema.json' });
    expect(m.host_permissions).toEqual(['http://*/*', 'https://*/*']);
    expect(m.optional_host_permissions).toBeUndefined();
  });

  it('scans automatically from installation: a manipulative page gets the "!" badge with no click', async () => {
    const probe = await l.context.newPage();
    await probe.goto(`chrome-extension://${l.extId}/popup.html`);
    await probe.waitForFunction(() => chrome.scripting.getRegisteredContentScripts().then((s) => s.length === 1), undefined, { timeout: 10000 });
    const lure = await openTarget(l, addCorpusScenario(l, 'dev', 'D01-en-blog-security-check-overlay'));
    const tab = await tabIdOf(l, lure);
    let badge = '';
    for (let i = 0; i < 40 && badge !== '!'; i++) {
      await probe.waitForTimeout(250);
      badge = await probe.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tab);
    }
    expect(badge).toBe('!');
    expect(l.blocked).toEqual([]);
  });

  it('the popup says the organization turned it on, reports nothing, and offers no switch', async () => {
    const popup = await l.context.newPage();
    await popup.goto(`chrome-extension://${l.extId}/popup.html`);
    await popup.click('details#mode summary');
    expect(await popup.getAttribute('#mode', 'data-mode')).toBe('automatic');
    expect(await popup.textContent('#mode-text')).toContain('tidak ada yang dilaporkan ke organisasi');
    expect(await popup.isHidden('#mode-toggle')).toBe(true);
  });
});
