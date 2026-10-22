# VeilTrace demo site (fictional)

`nusaverta/` is a static, fictional help center used in the demo. "Nusaverta" and all hosts are invented. The pages contain no JavaScript and load no external resources. The community post in `index.html` is a synthetic, defanged social-engineering lure: its hidden command points to a `.invalid` host, and nothing on the page copies, downloads or runs anything.

| Page | Purpose | Engine 0.2.0 result (tested) |
|---|---|---|
| `index.html` | Help article + third-party community widget with a ClickFix lure | Manipulative instruction (R1) |
| `benign.html` | Same page, ordinary community answer | No suspicious instructions |
| `cli.html` | Developer docs with install commands | Observed instructions only (R5) |

Serve it with `npm run manual:fixtures` and `python3 -m http.server 8080 -d dist/manual`, then open `http://localhost:8080/demo/`. Presenter instructions: `docs/PRESENTER_GUIDE.md`. This folder is not part of the extension and is not included in release ZIPs.

## Realistic demo gallery (`scenes/`)

Eight fictional pages styled like the real sites they imitate (a recipe blog with a fake CAPTCHA, a marketplace with a seller chat, a web chat client, a bank OTP page, a checkout, a full-screen security alert, a help center, developer docs): four lures and four legitimate counterparts, one pair per category (CMD, CRED, PAY, SUP), plus a gallery page. All brands, people, numbers and addresses are invented; there are no real logos. The fake CAPTCHA's script only reveals its steps; its "clipboard payload" is defanged text in a hidden textarea (`192.0.2.0/24`), and nothing is copied or run.

Open `http://localhost:8080/demo/scenes/` after `npm run manual:fixtures`. `tests/browser/scenes.test.ts` checks that each lure is flagged by its own detector and that no detector alerts on the legitimate pages. The scenes show **how** VeilTrace works: their wording overlaps the development fixtures the rules were tuned on, so they are not evidence of accuracy.
