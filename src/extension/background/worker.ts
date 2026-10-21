// background.js: the service worker that exists only to show automatic-scan results on the toolbar icon (D-081).
// It receives AutoSummary messages through the validated channel, sets a per-tab badge and title, and unregisters the
// auto-scan content script when the host permission is removed. It reads no page content and keeps no state.
import { AUTO_SCRIPT_ID, badgeFor } from '../auto/auto.js';
import { onAutoSummary } from '../auto/channel.js';
import { detectLang, MESSAGES } from '../popup/i18n.js';

onAutoSummary((tabId, s) => {
  const m = MESSAGES[detectLang(chrome.i18n.getUILanguage())];
  const badge = badgeFor(s);
  void chrome.action.setBadgeText({ tabId, text: badge.text }).catch(() => undefined);
  void chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color }).catch(() => undefined);
  void chrome.action.setTitle({ tabId, title: badge.text ? m.auto.badgeTitle : m.auto.actionTitle }).catch(() => undefined);
});

chrome.permissions.onRemoved.addListener(() => {
  void chrome.scripting.unregisterContentScripts({ ids: [AUTO_SCRIPT_ID] }).catch(() => undefined);
});
