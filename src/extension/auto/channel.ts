// The extension's only messaging channel (D-081, narrowing D-035): one way, from the auto-scan content script in a tab's
// top frame to the service worker, carrying an AutoSummary and nothing else. No externally_connectable: web pages have
// no way to reach it, and the receiver accepts only messages from this extension's own content scripts.
import { parseAutoSummary, type AutoSummary } from './auto.js';

export function sendAutoSummary(s: AutoSummary): void {
  chrome.runtime.sendMessage(s).catch(() => undefined);
}

export function onAutoSummary(handler: (tabId: number, s: AutoSummary) => void): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender: chrome.runtime.MessageSender) => {
    const tabId = sender.tab?.id;
    if (sender.id !== chrome.runtime.id || tabId === undefined || sender.frameId !== 0) return;
    const s = parseAutoSummary(message);
    if (s) handler(tabId, s);
  });
}
