// Pure decisions of the on-page guard (D-108): what counts as a command placed on the clipboard, an Android app download,
// a field for a secret, and which warnings a scan calls for. No DOM access; the guard passes attributes and text in.
import type { ScanReport } from '../content/report.js';
import { aggregate, type Category } from '../popup/aggregate.js';

/** Programs and constructs a lure tells the reader to run (ClickFix). Matched on text the page puts on the clipboard. */
const COMMAND = /\b(?:powershell(?:\.exe)?|pwsh|cmd(?:\.exe)?\s+\/[ck]|mshta|rundll32|regsvr32|certutil|bitsadmin|wscript|cscript|msiexec|osascript|invoke-expression|invoke-webrequest|iex|iwr|start-process|frombase64string)\b|\s-e(?:nc|ncodedcommand)?\s+[a-z0-9+/=]{16,}|\b(?:curl|wget)\b[^|\n]*\|\s*(?:ba|z)?sh\b|\bbash\s+-c\b|https?:\/\/\S+\.(?:ps1|hta|bat|cmd|vbs|exe|msi)\b/iu;

export function looksLikeCommand(text: string): boolean {
  return text.length >= 6 && text.length <= 20000 && COMMAND.test(text);
}

/** A link that downloads an Android app: the path or the download name ends in .apk. */
export function isApkDownload(href: string, download: string | null, base: string): boolean {
  if (download && /\.apk$/iu.test(download.trim())) return true;
  try {
    return /\.apk$/iu.test(new URL(href, base).pathname);
  } catch {
    return false;
  }
}

export interface FieldAttributes { type: string; autocomplete: string; name: string; id: string; placeholder: string; label: string }

/** A field meant for a password, a one-time code, a PIN or card security code. Only attributes are read, never the value. */
export function isSecretField(a: FieldAttributes): boolean {
  if (a.type.toLowerCase() === 'password') return true;
  if (/\b(?:one-time-code|current-password|new-password|cc-csc|cc-number)\b/iu.test(a.autocomplete)) return true;
  return /(?:^|[^a-z])(?:otp|pin|passcode|password|sandi|cvv|cvc)(?:[^a-z]|$)|kode\s*(?:otp|verifikasi)|verification\s*code/iu.test(`${a.name} ${a.id} ${a.placeholder} ${a.label}`);
}

export interface GuardPlan {
  /** The page as a whole: manipulative findings that justify a banner as soon as the page is scanned. */
  page: boolean;
  /** Categories with actionable findings (suspicious or manipulative). */
  alerting: Category[];
}

export function guardPlan(r: ScanReport): GuardPlan {
  const d = aggregate(r);
  return { page: d.highest === 'manipulative_instruction', alerting: d.affected };
}
