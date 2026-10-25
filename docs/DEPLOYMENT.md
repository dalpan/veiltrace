# Organizational Deployment: Feasibility Assessment (M4.2)

Status: assessment, 2026-10-21. Context: VEILTRACE may be evaluated for high-assurance organizational use (D-048). This document does **not** claim certification, approval or endorsement by any organization.

Legend:
- **Implemented**: exists in this repository and is tested.
- **Feasibility finding**: verified against vendor documentation or tried locally; not deployed.
- **Future work**: not done.

## 1. Summary

| Topic | Status | Finding |
|---|---|---|
| Offline operation | **Implemented** | Zero network code, CSP `connect-src 'none'`, 0 requests during scans (E2E). Works fully air-gapped once installed |
| Offline installation | **Implemented** (manual) / Future (fleet) | Verified ZIP → "Load unpacked" works offline. Fleet installation needs a signed CRX and policy (§4) |
| Restricted-network build | **Implemented** | `npm ci --offline` from a pre-populated npm cache reproduces the build byte-for-byte (tested with two clean copies) |
| Artifact integrity | **Implemented** | Deterministic ZIP, release manifest, SHA256SUMS, `npm run release:verify` (docs/RELEASE.md) |
| Authenticity / signing | **Future work** | Checksums prove integrity, not origin. A signed CRX3 and a protected signing key are required (§5) |
| Managed Chrome | **Feasibility finding** (partly unverified) | Enterprise policy `ExtensionInstallForcelist` / `ExtensionSettings` with a self-hosted `update_url` (§4). Exact platform conditions must be checked against current Chrome Enterprise docs before relying on them |
| Managed Microsoft Edge | **Feasibility finding** | Microsoft documents force-install of self-hosted extensions with `extension_id;update_url` pointing to an update-manifest XML ([Microsoft Learn](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-policies)). The unpacked test build loaded and detected a lure in Edge 155 via automation |
| Updates | **Future work** | Self-hosted update manifest + signed CRX + version pinning/rollback (§5) |
| Configuration management | **Implemented (none needed)** / Future | The extension has no settings and stores nothing. Future settings would use read-only managed storage (`chrome.storage.managed`), which would need a decision because it adds the `storage` permission |
| Endpoint security compatibility | **Feasibility finding** | Runs only in the browser sandbox: no native host, no file system access, no listening ports, no network, no `<all_urls>`. Nothing for EDR to intercept besides the browser itself |
| Monitoring / reporting | **Not planned** | No centralized monitoring, telemetry or remote reporting (D-048). Any future reporting must be strictly opt-in, local-first and separately reviewed |

## 2. Offline and restricted-network environments
- **Runtime:** no requirement. The extension never initiates network requests; detection is local (PRIVACY_SECURITY.md §7).
- **Build:** requires Node ≥ 20, npm and the npm packages in `package-lock.json` (199 entries, all with integrity hashes, all from `registry.npmjs.org`). In an air-gapped build environment, mirror the npm tarballs (or a populated npm cache) into the enclave, then run `npm ci --offline --ignore-scripts`. Verified locally: two copies built this way produced identical SHA-256 (docs/RELEASE.md §3).
- **Tests:** Playwright needs a Chromium build (`npx playwright install chromium`), which must also be mirrored. Tests and evaluation are offline once installed.
- **Audit:** `npm audit` needs registry access, so run it on a connected staging machine and carry the report in (`npm run supply-chain -- --offline` skips it).

## 3. Installation paths

| Path | Who | Notes |
|---|---|---|
| Load unpacked (developer mode) | Evaluators, pilots | Works offline from the verified ZIP. Chrome shows developer-mode warnings, and users can remove it. **Not suitable for fleets** |
| Enterprise force-install of a self-hosted CRX | Managed fleets | Policy `ExtensionInstallForcelist` entry `<extension-id>;<https update-manifest URL>`, or `ExtensionSettings` with `installation_mode: force_installed`. Users cannot remove or disable a force-installed extension (Microsoft Learn, Edge). Requires a signed CRX (§5) and an internal HTTPS host |
| Chrome Web Store / Edge Add-ons (unlisted or private) | Organizations allowing store installs | Store signing and review. Requires publishing the extension, which is outside the current scope |

Chrome developer documentation states that on Windows and macOS, consumer-style external installs must come from the Web Store and enterprise policy is the alternative ([Chrome Developers](https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions)). The precise conditions for self-hosted force-install on each OS (domain join, cloud management, MDM) were **not confirmed** in this assessment and must be verified against current Chrome Enterprise documentation.

Automation note: branded Google Chrome 155 ignores `--load-extension`, so the automated tests use Chromium. Stable Chrome was validated manually in M3 (PROGRESS.md).

## 4. Policy hardening suggestions (for an organization, not enforced by VEILTRACE)
- Pin the extension ID and the internal update URL; block other stores if desired (`ExtensionSettings` keyed by `update_url`).
- `ExtensionSettings.blocked_permissions` cannot reduce VEILTRACE below what it needs (`activeTab`, `scripting`). Block everything else for other extensions.
- `runtime_blocked_hosts` can exclude specific internal sites from all extensions, including VEILTRACE. That is a legitimate choice for highly sensitive web apps, but it means those sites cannot be scanned.

## 5. Signing, distribution and updates (future work)
1. Generate a CRX3 signing key in an offline, access-controlled environment (HSM or encrypted offline storage). Its public key defines the extension ID.
2. Package the verified build as CRX3. Publish the CRX, an update-manifest XML, the release manifest and SHA256SUMS on an internal HTTPS host.
3. Release flow: reproducible build on two independent machines → compare SHA256SUMS → sign → publish → staged rollout → keep the previous version for rollback.
4. Never commit the signing key (`.gitignore` already blocks `*.pem`/`*.crx`).

## 6. Organizational configuration management
- Current: none needed; behavior is fixed by the build.
- Possible future managed settings (each needs a decision): UI language override; selecting a non-default ruleset for evaluation groups only; disabling "Show on page" for kiosk use. Reporting endpoints are explicitly excluded.

## 7. Compatibility with organizational security policies

| Policy | Effect on VEILTRACE |
|---|---|
| Developer mode disabled | "Load unpacked" impossible: use force-install |
| Extension allowlist (`ExtensionInstallAllowlist`) | VEILTRACE must be allowlisted by ID |
| `runtime_blocked_hosts` | VEILTRACE cannot scan those hosts; the popup shows "could not access this page" |
| Strict page CSP | No effect (isolated world; tested with `default-src 'none'`) |
| Proxy-only / no internet | No effect at runtime |
| File URL access off (default) | `file://` pages cannot be scanned; the popup explains it |
| Browser updates | Relies on the MV3 `scripting`, `activeTab` and `chrome.dom` APIs. Breaking changes are caught by the E2E suite (THREAT_MODEL.md §7) |

## 8. Untested
Chrome on Windows/Linux, ChromeOS, Brave/Opera/Vivaldi, managed-policy installation end-to-end, CRX signing, update flows, and Firefox (M5).

## 7. Managed build (D-089)
`npm run build:managed` → `dist/extension-managed` ("VeilTrace (Managed)"): the same code and permissions, with `http://*/*` and `https://*/*` as install-time host access instead of an optional permission. Force-installed by policy, it registers automatic scanning on install and on every browser start; users see "turned on by your organization" and no switch. **Nothing is reported to the organization**: results stay on the device and the extension still has no network code (D-048, D-081).

Deployment outline (not yet performed end to end):
1. Pack and sign the managed build as a CRX with an organization-held key (`chrome --pack-extension=dist/extension-managed --pack-extension-key=<key.pem>`); keep the key offline and never commit it.
2. Host the CRX and `deploy/update-manifest.xml` (filled in) on an internal HTTPS server.
3. Push `deploy/chrome-extension-settings.json` (filled in) as the `ExtensionSettings` policy for Chrome or Edge (Group Policy, Intune or Google Admin).
4. Verify on a pilot machine: `chrome://policy`, `chrome://extensions` (installed, not removable), a demo lure shows the "!" badge.

Exact platform conditions for self-hosted force-install (domain join, cloud management, MDM) must be checked against current Chrome Enterprise and Microsoft Edge documentation (§3).

## 9. Organization rule packs (D-109)

A security team can push new scam patterns to every managed install, with no server, from a closed network as well. A pack is data: extra lexicon entries for the credential, payment and support detectors. It cannot change rules, thresholds or the ClickFix engine. Each pack is signed with the organization's Ed25519 key, and the managed build only accepts packs signed by keys built into it.

1. **Create a key (once, on an offline machine):** `node scripts/rulepack.mjs keygen <kid> <dir>`. This writes `<kid>.private.pem` (keep it secret, never commit it) and `<kid>.public.json`.
2. **Trust the key in the build:** put the public JSON in `deploy/rulepack-keys.json` (an array, one entry per key), then run `npm run build:managed`. The build gets `storage`, used only to read the policy, and a `managed-schema.json`.
3. **Write a pack:** see `deploy/rulepack/example-pack.json`. An entry is valid only if:
   - its detector is `cred`, `pay` or `sup`;
   - its signal is one that detector already has (for example `PR.PRIZE`, `SI.OFFICIAL`, `S.OTP`);
   - its pattern is a regular expression of at most 300 characters, with no nested quantifiers, matched against lower-cased normalized text;
   - it has at least one example the pattern matches.

   A pack holds at most 500 entries.
4. **Sign it:** `node scripts/rulepack.mjs sign pack.json <kid> <kid>.private.pem > envelope.json`. Check it with `node scripts/rulepack.mjs verify envelope.json <kid>.public.json`.
5. **Distribute it:** set the `rulePacks` policy for the extension to an array of envelopes. On Windows that is under `Software\Policies\Google\Chrome\3rdparty\extensions\<extension id>\policy`; on macOS it is a configuration profile; Edge uses its own equivalent paths. Installs read the policy when a page is scanned, verify every signature offline, and ignore any pack that is unsigned, changed or signed by an unknown key.

The popup footer names the packs in use. Evidence from a pack keeps the pack id in its entry id (`pack:<pack id>:<entry id>`), so a finding can be traced to the pack that caused it. Nothing is reported back to the organization (D-048).
