// Opt-in automatic scanning (D-081). Off by default: the extension keeps only activeTab + scripting until the user
// grants the optional host permission from the popup. Then a content script (content.js + auto.js) is registered for
// the granted origins, scans pages in the isolated world as they load and change, and reports only a verdict and a
// count for the toolbar badge. Revoking the permission (popup button or browser settings) unregisters it.
import type { ScanReport } from '../content/report.js';
import type { Verdict } from '../../core/types.js';
import { aggregate } from '../popup/aggregate.js';

declare const __VT_TEST__: boolean;
declare const __VT_MANAGED__: boolean;

/** Managed build (D-089): host access is granted by policy at install and automatic scanning cannot be turned off here. */
export const MANAGED: boolean = typeof __VT_MANAGED__ !== 'undefined' && __VT_MANAGED__;

export const AUTO_SCRIPT_ID = 'veiltrace-auto';
/** Production: every http(s) page, as optional_host_permissions. TEST build: the fictional hosts it already holds (D-013). */
export const AUTO_ORIGINS: string[] = __VT_TEST__ ? ['https://*.test/*', 'https://*.example/*'] : ['http://*/*', 'https://*/*'];

/** The only data an automatic scan sends out of the tab: the page-level verdict and the number of actionable findings. */
export interface AutoSummary {
  type: 'veiltrace:auto';
  v: 1;
  verdict: Verdict;
  actionable: number;
}

const VERDICTS: readonly Verdict[] = ['none', 'observed_instruction', 'suspicious_correlation', 'manipulative_instruction'];

export function summarize(r: ScanReport): AutoSummary {
  const d = aggregate(r);
  return { type: 'veiltrace:auto', v: 1, verdict: d.highest, actionable: d.actionable };
}

/** Exact-shape validation of a message received by the service worker. */
export function parseAutoSummary(x: unknown): AutoSummary | null {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  if (Object.keys(o).sort().join() !== 'actionable,type,v,verdict') return null;
  if (o.type !== 'veiltrace:auto' || o.v !== 1 || !VERDICTS.includes(o.verdict as Verdict)) return null;
  if (typeof o.actionable !== 'number' || !Number.isInteger(o.actionable) || o.actionable < 0 || o.actionable > 1000) return null;
  return { type: 'veiltrace:auto', v: 1, verdict: o.verdict as Verdict, actionable: o.actionable };
}

/**
 * Only manipulative pages get a badge: an automatic alert that is often wrong trains people to ignore it, and suspicious
 * findings are shown when the popup is opened.
 */
export function badgeFor(s: AutoSummary): { text: string; color: string } {
  return s.verdict === 'manipulative_instruction' ? { text: '!', color: '#c8463f' } : { text: '', color: '#3d4739' };
}

export async function autoEnabled(): Promise<boolean> {
  try {
    const [granted, scripts] = await Promise.all([
      chrome.permissions.contains({ origins: AUTO_ORIGINS }),
      chrome.scripting.getRegisteredContentScripts({ ids: [AUTO_SCRIPT_ID] }),
    ]);
    return granted && scripts.length > 0;
  } catch {
    return false;
  }
}

const SCRIPT = { id: AUTO_SCRIPT_ID, matches: AUTO_ORIGINS, js: ['content.js', 'auto.js'], runAt: 'document_idle' as const, allFrames: false };

async function register(): Promise<void> {
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [AUTO_SCRIPT_ID] });
  if (existing.length > 0) return;
  // Firefox versions without persistAcrossSessions reject the option; registration then lasts for the browser session.
  await chrome.scripting.registerContentScripts([{ ...SCRIPT, persistAcrossSessions: true }]).catch(() => chrome.scripting.registerContentScripts([SCRIPT]));
}

/** Managed build: make sure the automatic-scan script is registered (on install and on browser start). */
export async function ensureManagedAuto(): Promise<void> {
  if (MANAGED && (await chrome.permissions.contains({ origins: AUTO_ORIGINS }))) await register();
}

/** Must be called directly from a click: Chrome shows its own permission dialog. Returns whether auto mode is now on. */
export async function enableAuto(): Promise<boolean> {
  const granted = await chrome.permissions.request({ origins: AUTO_ORIGINS });
  if (!granted) return false;
  await register();
  return true;
}

export async function disableAuto(): Promise<void> {
  if (MANAGED) return;
  await chrome.scripting.unregisterContentScripts({ ids: [AUTO_SCRIPT_ID] }).catch(() => undefined);
  // The TEST build's fictional hosts are required permissions and cannot be removed; production removes the grant.
  if (!__VT_TEST__) await chrome.permissions.remove({ origins: AUTO_ORIGINS }).catch(() => false);
}
